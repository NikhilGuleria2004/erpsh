import { ObjectId } from "mongodb";
import { collections } from "../../db/collections.js";
import { getClient } from "../../db/client.js";
import { Conflict, NotFound } from "../../lib/errors.js";
import { nextInventoryTxnId, nextPoNumber } from "../../lib/ids.js";
import { parsePagination, type PaginatedResult } from "../../lib/pagination.js";
import type {
  CreatePurchaseOrderInput,
  ListPurchaseOrdersQuery,
  ReceivePoInput,
} from "./purchases.schema.js";
import type { PurchaseOrderDoc } from "../../types/index.js";

export interface PurchaseOrderListRow {
  id: string;
  supplierName: string;
  itemsCount: number;
  amount: number;
  date: string;
  status: PurchaseOrderDoc["status"];
}

export interface PurchaseOrderDetail extends PurchaseOrderListRow {
  supplierId: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    receivedQuantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
}

const RECEIVABLE_STATUSES = ["confirmed", "partially_received"] as const;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toDetail(doc: PurchaseOrderDoc): PurchaseOrderDetail {
  return {
    id: doc.poNumber,
    supplierId: doc.supplierId.toString(),
    supplierName: doc.supplierName,
    itemsCount: doc.items.length,
    amount: doc.amount,
    date: doc.date.toISOString(),
    status: doc.status,
    items: doc.items.map((i) => ({
      productId: i.productId.toString(),
      productName: i.productName,
      quantity: i.quantity,
      receivedQuantity: i.receivedQuantity,
      unitPrice: i.unitPrice,
      lineTotal: i.lineTotal,
    })),
  };
}

export async function listPurchaseOrders(
  query: ListPurchaseOrdersQuery,
): Promise<PaginatedResult<PurchaseOrderListRow>> {
  const { purchaseOrders } = await collections();
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.search) {
    const re = new RegExp(escapeRegex(query.search), "i");
    filter.$or = [{ poNumber: re }, { supplierName: re }];
  }
  const { page, limit, skip } = parsePagination(query);
  const [docs, total] = await Promise.all([
    purchaseOrders
      .find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    purchaseOrders.countDocuments(filter),
  ]);
  const items: PurchaseOrderListRow[] = docs.map((d) => ({
    id: d.poNumber,
    supplierName: d.supplierName,
    itemsCount: d.items.length,
    amount: d.amount,
    date: d.date.toISOString(),
    status: d.status,
  }));
  return { items, total, page, limit };
}

export async function getPurchaseOrder(
  id: string,
): Promise<PurchaseOrderDetail> {
  const { purchaseOrders } = await collections();
  let doc: PurchaseOrderDoc | null = null;
  if (/^PO-\d{4}-\d+$/.test(id)) {
    doc = await purchaseOrders.findOne({ poNumber: id });
  } else {
    try {
      doc = await purchaseOrders.findOne({ _id: new ObjectId(id) });
    } catch {
      doc = null;
    }
  }
  if (!doc) throw NotFound("Purchase order");
  return toDetail(doc);
}

export async function createPurchaseOrder(
  input: CreatePurchaseOrderInput,
  userId: string,
): Promise<PurchaseOrderDetail> {
  const client = await getClient();
  const session = client.startSession();
  let doc: PurchaseOrderDoc | null = null;
  try {
    await session.withTransaction(async () => {
      const { suppliers, products, purchaseOrders, users } =
        await collections();
      let creatorId: ObjectId;
      try {
        creatorId = new ObjectId(userId);
      } catch {
        throw NotFound("User");
      }
      const user = await users.findOne({ _id: creatorId }, { session });
      if (!user) throw NotFound("User");

      let supplierOid: ObjectId;
      try {
        supplierOid = new ObjectId(input.supplierId);
      } catch {
        throw NotFound("Supplier");
      }
      const supplier = await suppliers.findOne(
        { _id: supplierOid },
        { session },
      );
      if (!supplier) throw NotFound("Supplier");
      if (supplier.status !== "active") {
        throw Conflict(`Supplier "${supplier.companyName}" is inactive`);
      }

      const items: PurchaseOrderDoc["items"] = [];
      let amount = 0;
      const now = new Date();
      for (const item of input.items) {
        let productOid: ObjectId;
        try {
          productOid = new ObjectId(item.productId);
        } catch {
          throw NotFound("Product");
        }
        const product = await products.findOne(
          { _id: productOid },
          { session },
        );
        if (!product) throw NotFound("Product");
        const lineTotal = item.unitPrice * item.quantity;
        amount += lineTotal;
        items.push({
          productId: product._id,
          productName: product.name,
          quantity: item.quantity,
          receivedQuantity: 0,
          unitPrice: item.unitPrice,
          lineTotal,
        });
      }

      const poNumber = await nextPoNumber();
      doc = {
        _id: new ObjectId(),
        poNumber,
        supplierId: supplier._id,
        supplierName: supplier.companyName,
        items,
        amount,
        status: "draft",
        date: now,
        createdBy: creatorId,
        createdAt: now,
        updatedAt: now,
      };
      await purchaseOrders.insertOne(doc, { session });
    });
  } finally {
    await session.endSession();
  }
  if (!doc) throw new Error("Purchase order creation failed");
  return toDetail(doc);
}

async function resolvePurchaseOrderId(idOrNumber: string): Promise<ObjectId> {
  if (/^PO-\d{4}-\d+$/.test(idOrNumber)) {
    const { purchaseOrders } = await collections();
    const doc = await purchaseOrders.findOne(
      { poNumber: idOrNumber },
      { projection: { _id: 1 } },
    );
    if (!doc) throw NotFound("Purchase order");
    return doc._id;
  }
  try {
    return new ObjectId(idOrNumber);
  } catch {
    throw NotFound("Purchase order");
  }
}

export async function confirmPurchaseOrder(
  id: string,
): Promise<PurchaseOrderDetail> {
  const { purchaseOrders } = await collections();
  const _id = await resolvePurchaseOrderId(id);
  const doc = await purchaseOrders.findOneAndUpdate(
    { _id, status: { $in: ["draft", "pending"] } },
    { $set: { status: "confirmed", updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!doc) {
    const existing = await purchaseOrders.findOne({ _id });
    if (!existing) throw NotFound("Purchase order");
    throw Conflict(
      `Cannot confirm purchase order in status "${existing.status}"`,
      { currentStatus: existing.status },
    );
  }
  return toDetail(doc);
}

export async function receivePurchaseOrder(
  id: string,
  input: ReceivePoInput,
): Promise<PurchaseOrderDetail> {
  const client = await getClient();
  const session = client.startSession();
  let finalDoc: PurchaseOrderDoc | null = null;
  try {
    await session.withTransaction(async () => {
      const { purchaseOrders, products, inventoryTransactions } =
        await collections();
      const _id = await resolvePurchaseOrderId(id);
      const existing = await purchaseOrders.findOne(
        { _id, status: { $in: [...RECEIVABLE_STATUSES] } },
        { session },
      );
      if (!existing) {
        const check = await purchaseOrders.findOne({ _id }, { session });
        if (!check) throw NotFound("Purchase order");
        throw Conflict(
          `Cannot receive in status "${check.status}"`,
          { currentStatus: check.status },
        );
      }

      const now = new Date();
      const updatedItems = existing.items.map((line) => {
        const inc = input.items.find(
          (i) => i.productId === line.productId.toString(),
        );
        if (!inc) return line;
        const newReceived = line.receivedQuantity + inc.receivedQuantity;
        if (newReceived > line.quantity) {
          throw Conflict(
            `Received quantity for "${line.productName}" exceeds ordered (${newReceived} > ${line.quantity})`,
          );
        }
        return { ...line, receivedQuantity: newReceived };
      });

      // Apply stock increments and ledger rows inside the same session.
      for (const inc of input.items) {
        if (inc.receivedQuantity <= 0) continue;
        let productOid: ObjectId;
        try {
          productOid = new ObjectId(inc.productId);
        } catch {
          throw NotFound("Product");
        }
        const before = await products.findOneAndUpdate(
          { _id: productOid },
          {
            $inc: { stockQuantity: inc.receivedQuantity },
            $set: { updatedAt: now },
          },
          { session, returnDocument: "before" },
        );
        if (!before) throw NotFound("Product");
        await inventoryTransactions.insertOne(
          {
            _id: new ObjectId(),
            txnNumber: await nextInventoryTxnId(),
            productId: productOid,
            productName: before.name,
            type: "purchase",
            quantity: inc.receivedQuantity,
            previousQuantity: before.stockQuantity,
            newQuantity: before.stockQuantity + inc.receivedQuantity,
            referenceType: "purchase_order",
            referenceId: _id,
            createdBy: existing.createdBy,
            createdAt: now,
          },
          { session },
        );
      }

      const fullyReceived = updatedItems.every(
        (i) => i.receivedQuantity >= i.quantity,
      );
      const newStatus: PurchaseOrderDoc["status"] = fullyReceived
        ? "received"
        : "partially_received";

      const updated = await purchaseOrders.findOneAndUpdate(
        { _id, status: { $in: [...RECEIVABLE_STATUSES] } },
        { $set: { items: updatedItems, status: newStatus, updatedAt: now } },
        { session, returnDocument: "after" },
      );
      if (!updated) {
        throw Conflict("Purchase order status changed concurrently");
      }
      finalDoc = updated;
    });
  } finally {
    await session.endSession();
  }
  if (!finalDoc) throw new Error("Purchase order receive failed");
  return toDetail(finalDoc);
}

export async function cancelPurchaseOrder(
  id: string,
): Promise<PurchaseOrderDetail> {
  const { purchaseOrders } = await collections();
  const _id = await resolvePurchaseOrderId(id);
  const doc = await purchaseOrders.findOneAndUpdate(
    { _id, status: { $in: ["draft", "pending", "confirmed"] } },
    { $set: { status: "cancelled", updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!doc) {
    const existing = await purchaseOrders.findOne({ _id });
    if (!existing) throw NotFound("Purchase order");
    throw Conflict(
      `Cannot cancel purchase order in status "${existing.status}" (goods already in stock — use adjustment or return instead)`,
      { currentStatus: existing.status },
    );
  }
  return toDetail(doc);
}