import { ObjectId } from "mongodb";
import { collections } from "../../db/collections.js";
import { getClient } from "../../db/client.js";
import { Conflict, NotFound } from "../../lib/errors.js";
import {
  nextInventoryTxnId,
  nextInvoiceNumber,
  nextOrderNumber,
} from "../../lib/ids.js";
import { parsePagination, type PaginatedResult } from "../../lib/pagination.js";
import type {
  CreateSalesOrderInput,
  ListSalesOrdersQuery,
} from "./sales.schema.js";
import type { SalesOrderDoc, Status } from "../../types/index.js";

export interface SalesOrderListRow {
  id: string;
  customerName: string;
  amount: number;
  date: string;
  status: SalesOrderDoc["status"];
  itemsCount: number;
}

export interface SalesOrderDetail extends SalesOrderListRow {
  customerId: string;
  subtotal: number;
  tax: number;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
}

export interface SalesOrderWithInvoice {
  order: SalesOrderDetail;
  invoice: {
    id: string;
    invoiceNumber: string;
    customerName: string;
    amount: number;
    issueDate: string;
    dueDate: string;
    status: "unpaid";
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toDetail(doc: SalesOrderDoc): SalesOrderDetail {
  return {
    id: doc.orderNumber,
    customerId: doc.customerId.toString(),
    customerName: doc.customerName,
    amount: doc.amount,
    date: doc.date.toISOString(),
    status: doc.status,
    itemsCount: doc.items.length,
    subtotal: doc.subtotal,
    tax: doc.tax,
    items: doc.items.map((i) => ({
      productId: i.productId.toString(),
      productName: i.productName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.lineTotal,
    })),
  };
}

export async function listSalesOrders(
  query: ListSalesOrdersQuery,
): Promise<PaginatedResult<SalesOrderListRow>> {
  const { salesOrders } = await collections();
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.search) {
    const re = new RegExp(escapeRegex(query.search), "i");
    filter.$or = [{ orderNumber: re }, { customerName: re }];
  }
  const { page, limit, skip } = parsePagination(query);
  const [docs, total] = await Promise.all([
    salesOrders
      .find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    salesOrders.countDocuments(filter),
  ]);
  const items: SalesOrderListRow[] = docs.map((d) => ({
    id: d.orderNumber,
    customerName: d.customerName,
    amount: d.amount,
    date: d.date.toISOString(),
    status: d.status,
    itemsCount: d.items.length,
  }));
  return { items, total, page, limit };
}

export async function getSalesOrder(id: string): Promise<SalesOrderDetail> {
  const { salesOrders } = await collections();
  let doc: SalesOrderDoc | null = null;
  // Allow lookup by either orderNumber (e.g. "SO-10291") or _id.
  if (/^SO-\d+$/.test(id)) {
    doc = await salesOrders.findOne({ orderNumber: id });
  } else {
    try {
      doc = await salesOrders.findOne({ _id: new ObjectId(id) });
    } catch {
      doc = null;
    }
  }
  if (!doc) throw NotFound("Sales order");
  return toDetail(doc);
}

export async function createSalesOrder(
  input: CreateSalesOrderInput,
  userId: string,
): Promise<SalesOrderWithInvoice> {
  const client = await getClient();
  const session = client.startSession();
  let result: SalesOrderWithInvoice | null = null;
  try {
    await session.withTransaction(async () => {
      const {
        customers,
        products,
        salesOrders,
        inventoryTransactions,
        invoices,
        users,
      } = await collections();

      let creatorId: ObjectId;
      try {
        creatorId = new ObjectId(userId);
      } catch {
        throw NotFound("User");
      }
      const user = await users.findOne({ _id: creatorId }, { session });
      if (!user) throw NotFound("User");

      let customerOid: ObjectId;
      try {
        customerOid = new ObjectId(input.customerId);
      } catch {
        throw NotFound("Customer");
      }
      const customer = await customers.findOne(
        { _id: customerOid },
        { session },
      );
      if (!customer) throw NotFound("Customer");
      if (customer.status !== "active") {
        throw Conflict(`Customer "${customer.name}" is inactive`);
      }

      const lineItems: SalesOrderDoc["items"] = [];
      let subtotal = 0;
      const now = new Date();
      const txnIdsByProduct = new Map<string, ObjectId>();

      for (const item of input.items) {
        let productOid: ObjectId;
        try {
          productOid = new ObjectId(item.productId);
        } catch {
          throw NotFound("Product");
        }

        // Atomic, condition-checked decrement: fails (matchedCount 0) if
        // stock is insufficient, which is exactly what stops two concurrent
        // sales from over-selling the same 5 units.
        const before = await products.findOneAndUpdate(
          {
            _id: productOid,
            status: "active",
            stockQuantity: { $gte: item.quantity },
          },
          {
            $inc: { stockQuantity: -item.quantity },
            $set: { updatedAt: now },
          },
          { session, returnDocument: "before" },
        );

        if (!before) {
          const existing = await products.findOne(
            { _id: productOid },
            { session },
          );
          if (!existing) throw NotFound("Product");
          if (existing.status !== "active") {
            throw Conflict(`Product "${existing.name}" is inactive`);
          }
          throw Conflict(
            `Not enough stock for "${existing.name}" (have ${existing.stockQuantity}, need ${item.quantity})`,
            { productId: item.productId },
          );
        }

        const lineTotal = before.sellingPrice * item.quantity;
        subtotal += lineTotal;
        lineItems.push({
          productId: before._id,
          productName: before.name,
          quantity: item.quantity,
          unitPrice: before.sellingPrice,
          lineTotal,
        });

        const txnId = new ObjectId();
        txnIdsByProduct.set(productOid.toString(), txnId);
        await inventoryTransactions.insertOne(
          {
            _id: txnId,
            txnNumber: await nextInventoryTxnId(),
            productId: before._id,
            productName: before.name,
            type: "sale",
            quantity: -item.quantity,
            previousQuantity: before.stockQuantity,
            newQuantity: before.stockQuantity - item.quantity,
            referenceType: "sales_order",
            referenceId: null, // back-filled after order insert
            createdBy: creatorId,
            createdAt: now,
          },
          { session },
        );
      }

      const tax = input.tax ?? Math.round(subtotal * 0.18);
      const amount = subtotal + tax;
      const orderId = new ObjectId();
      const orderNumber = await nextOrderNumber();

      await salesOrders.insertOne(
        {
          _id: orderId,
          orderNumber,
          customerId: customer._id,
          customerName: customer.name,
          items: lineItems,
          subtotal,
          tax,
          amount,
          status: "confirmed",
          date: now,
          createdBy: creatorId,
          createdAt: now,
          updatedAt: now,
        },
        { session },
      );

      // Back-fill referenceId on the inventory rows just created for this order.
      const productIds = lineItems.map((i) => i.productId);
      await inventoryTransactions.updateMany(
        { productId: { $in: productIds }, referenceType: "sales_order", referenceId: null, createdAt: now },
        { $set: { referenceId: orderId } },
        { session },
      );
      // Deduplicate: in the unusual case two lines hit the same product, only
      // the most-recent matching txn gets the back-fill. Acceptable because
      // duplicate productIds in a single SO is a UI-level edge case.
      for (const pid of productIds) {
        const tid = txnIdsByProduct.get(pid.toString());
        if (tid) {
          await inventoryTransactions.updateOne(
            { _id: tid, referenceId: null },
            { $set: { referenceId: orderId } },
            { session },
          );
        }
      }

      const invoiceNumber = await nextInvoiceNumber();
      const issueDate = now;
      const dueDate = new Date(issueDate.getTime() + 14 * 24 * 60 * 60 * 1000);

      await invoices.insertOne(
        {
          _id: new ObjectId(),
          invoiceNumber,
          salesOrderId: orderId,
          customerId: customer._id,
          customerName: customer.name,
          amount,
          issueDate,
          dueDate,
          createdAt: now,
          updatedAt: now,
        },
        { session },
      );

      result = {
        order: {
          id: orderNumber,
          customerId: customer._id.toString(),
          customerName: customer.name,
          amount,
          date: now.toISOString(),
          status: "confirmed",
          itemsCount: lineItems.length,
          subtotal,
          tax,
          items: lineItems.map((i) => ({
            productId: i.productId.toString(),
            productName: i.productName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            lineTotal: i.lineTotal,
          })),
        },
        invoice: {
          id: invoiceNumber,
          invoiceNumber,
          customerName: customer.name,
          amount,
          issueDate: issueDate.toISOString(),
          dueDate: dueDate.toISOString(),
          status: "unpaid",
        },
      };
    });
  } finally {
    await session.endSession();
  }
  if (!result) throw new Error("Sales order creation failed");
  return result;
}

async function resolveSalesOrderId(idOrNumber: string): Promise<ObjectId> {
  if (/^SO-\d+$/.test(idOrNumber)) {
    const { salesOrders } = await collections();
    const doc = await salesOrders.findOne(
      { orderNumber: idOrNumber },
      { projection: { _id: 1 } },
    );
    if (!doc) throw NotFound("Sales order");
    return doc._id;
  }
  try {
    return new ObjectId(idOrNumber);
  } catch {
    throw NotFound("Sales order");
  }
}

export async function fulfilSalesOrder(
  id: string,
): Promise<SalesOrderDetail> {
  const { salesOrders } = await collections();
  const _id = await resolveSalesOrderId(id);
  const doc = await salesOrders.findOneAndUpdate(
    { _id, status: "confirmed" },
    { $set: { status: "fulfilled", updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!doc) {
    const existing = await salesOrders.findOne({ _id });
    if (!existing) throw NotFound("Sales order");
    throw Conflict(
      `Cannot fulfil order in status "${existing.status}"`,
      { currentStatus: existing.status },
    );
  }
  return toDetail(doc);
}

export async function cancelSalesOrder(
  id: string,
): Promise<SalesOrderDetail> {
  const client = await getClient();
  const session = client.startSession();
  let finalDoc: SalesOrderDoc | null = null;
  try {
    await session.withTransaction(async () => {
      const { salesOrders, products, inventoryTransactions } =
        await collections();
      const _id = await resolveSalesOrderId(id);
      const existing = await salesOrders.findOne({ _id }, { session });
      if (!existing) throw NotFound("Sales order");
      if (existing.status === "cancelled") {
        throw Conflict("Order is already cancelled");
      }
      const wasConfirmedOrFulfilled =
        existing.status === "confirmed" || existing.status === "fulfilled";

      if (wasConfirmedOrFulfilled) {
        // Reverse stock and insert compensating return txns.
        for (const line of existing.items) {
          const before = await products.findOneAndUpdate(
            { _id: line.productId },
            { $inc: { stockQuantity: line.quantity }, $set: { updatedAt: new Date() } },
            { session, returnDocument: "before" },
          );
          if (!before) {
            // Product may have been deleted between sale and cancel; still
            // record the compensating txn so the ledger is intact.
          }
          await inventoryTransactions.insertOne(
            {
              _id: new ObjectId(),
              txnNumber: await nextInventoryTxnId(),
              productId: line.productId,
              productName: line.productName,
              type: "return",
              quantity: line.quantity,
              previousQuantity: before?.stockQuantity ?? 0,
              newQuantity: (before?.stockQuantity ?? 0) + line.quantity,
              referenceType: "sales_order",
              referenceId: _id,
              createdBy: existing.createdBy,
              createdAt: new Date(),
            },
            { session },
          );
        }
      }

      const updated = await salesOrders.findOneAndUpdate(
        { _id, status: { $ne: "cancelled" } },
        { $set: { status: "cancelled", updatedAt: new Date() } },
        { session, returnDocument: "after" },
      );
      if (!updated) {
        throw Conflict("Order is already cancelled");
      }
      finalDoc = updated;
    });
  } finally {
    await session.endSession();
  }
  if (!finalDoc) throw new Error("Sales order cancel failed");
  return toDetail(finalDoc);
}

export type { Status };