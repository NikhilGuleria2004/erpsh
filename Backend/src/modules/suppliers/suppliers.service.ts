import { ObjectId } from "mongodb";
import { collections } from "../../db/collections.js";
import { Conflict, NotFound } from "../../lib/errors.js";
import { parsePagination, type PaginatedResult } from "../../lib/pagination.js";
import type {
  CreateSupplierInput,
  ListSuppliersQuery,
  UpdateSupplierInput,
} from "./suppliers.schema.js";
import type { Status, SupplierDoc } from "../../types/index.js";

export interface SupplierListRow {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  outstandingBalance: number;
  status: Status;
}

export interface SupplierDetail extends SupplierListRow {
  address?: string;
  taxNumber?: string;
  paymentTerms?: string;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toObjectId(id: string): ObjectId {
  try {
    return new ObjectId(id);
  } catch {
    throw NotFound("Supplier");
  }
}

// Per Backend.md §5.9: outstanding balance is the sum of purchase-order
// amounts in non-cancelled status, minus completed supplier payments.
const ACTIVE_PO_STATUSES = [
  "confirmed",
  "partially_received",
  "received",
];

export async function listSuppliers(
  query: ListSuppliersQuery,
): Promise<PaginatedResult<SupplierListRow>> {
  const { suppliers, purchaseOrders, supplierPayments } = await collections();
  const filterObj: Record<string, unknown> = {};
  if (query.status) filterObj.status = query.status;
  if (query.search) {
    const re = new RegExp(escapeRegex(query.search), "i");
    filterObj.$or = [{ companyName: re }, { contactPerson: re }];
  }
  const { page, limit, skip } = parsePagination(query);
  const [docs, total] = await Promise.all([
    suppliers
      .find(filterObj)
      .sort({ companyName: 1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    suppliers.countDocuments(filterObj),
  ]);
  const ids = docs.map((d) => d._id);
  const [poAgg, paidAgg] = await Promise.all([
    ids.length === 0
      ? Promise.resolve([] as { _id: ObjectId; balance: number }[])
      : purchaseOrders
          .aggregate<{ _id: ObjectId; balance: number }>([
            {
              $match: {
                supplierId: { $in: ids },
                status: { $in: ACTIVE_PO_STATUSES },
              },
            },
            { $group: { _id: "$supplierId", balance: { $sum: "$amount" } } },
          ])
          .toArray(),
    ids.length === 0
      ? Promise.resolve([] as { _id: ObjectId; paid: number }[])
      : supplierPayments
          .aggregate<{ _id: ObjectId; paid: number }>([
            {
              $match: {
                supplierId: { $in: ids },
                status: "completed",
              },
            },
            { $group: { _id: "$supplierId", paid: { $sum: "$amount" } } },
          ])
          .toArray(),
  ]);
  const poMap = new Map(poAgg.map((b) => [b._id.toString(), b.balance]));
  const paidMap = new Map(paidAgg.map((b) => [b._id.toString(), b.paid]));
  const items: SupplierListRow[] = docs.map((d) => ({
    id: d._id.toString(),
    companyName: d.companyName,
    contactPerson: d.contactPerson,
    email: d.email,
    phone: d.phone,
    status: d.status,
    outstandingBalance: Math.max(
      0,
      (poMap.get(d._id.toString()) ?? 0) - (paidMap.get(d._id.toString()) ?? 0),
    ),
  }));
  return { items, total, page, limit };
}

async function supplierBalance(supplierId: ObjectId): Promise<number> {
  const { purchaseOrders, supplierPayments } = await collections();
  const [poResult, paidResult] = await Promise.all([
    purchaseOrders
      .aggregate<{ balance: number }>([
        {
          $match: {
            supplierId,
            status: { $in: ACTIVE_PO_STATUSES },
          },
        },
        { $group: { _id: null, balance: { $sum: "$amount" } } },
      ])
      .toArray(),
    supplierPayments
      .aggregate<{ paid: number }>([
        {
          $match: { supplierId, status: "completed" },
        },
        { $group: { _id: null, paid: { $sum: "$amount" } } },
      ])
      .toArray(),
  ]);
  const po = poResult[0]?.balance ?? 0;
  const paid = paidResult[0]?.paid ?? 0;
  return Math.max(0, po - paid);
}

export async function getSupplier(id: string): Promise<SupplierDetail> {
  const { suppliers } = await collections();
  const doc = await suppliers.findOne({ _id: toObjectId(id) });
  if (!doc) throw NotFound("Supplier");
  return {
    id: doc._id.toString(),
    companyName: doc.companyName,
    contactPerson: doc.contactPerson,
    email: doc.email,
    phone: doc.phone,
    address: doc.address,
    taxNumber: doc.taxNumber,
    paymentTerms: doc.paymentTerms,
    status: doc.status,
    outstandingBalance: await supplierBalance(doc._id),
  };
}

export async function getSupplierPurchaseOrders(id: string) {
  const { purchaseOrders } = await collections();
  const oid = toObjectId(id);
  const docs = await purchaseOrders
    .find({ supplierId: oid })
    .sort({ date: -1 })
    .toArray();
  return docs.map((d) => ({
    id: d.poNumber,
    supplierName: d.supplierName,
    itemsCount: d.items.length,
    amount: d.amount,
    date: d.date.toISOString(),
    status: d.status,
  }));
}

export async function createSupplier(
  input: CreateSupplierInput,
): Promise<SupplierListRow> {
  const { suppliers } = await collections();
  const email = input.email.toLowerCase();
  const existing = await suppliers.findOne({ email });
  if (existing) throw Conflict("Email already in use");
  const now = new Date();
  const doc: SupplierDoc = {
    _id: new ObjectId(),
    companyName: input.companyName,
    contactPerson: input.contactPerson,
    email,
    phone: input.phone,
    address: input.address,
    taxNumber: input.taxNumber,
    paymentTerms: input.paymentTerms,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
  await suppliers.insertOne(doc);
  return {
    id: doc._id.toString(),
    companyName: doc.companyName,
    contactPerson: doc.contactPerson,
    email: doc.email,
    phone: doc.phone,
    status: doc.status,
    outstandingBalance: 0,
  };
}

export async function updateSupplier(
  id: string,
  input: UpdateSupplierInput,
): Promise<SupplierListRow> {
  const { suppliers } = await collections();
  const _id = toObjectId(id);
  const update: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined) {
      update[k] = k === "email" && typeof v === "string" ? v.toLowerCase() : v;
    }
  }
  const doc = await suppliers.findOneAndUpdate(
    { _id },
    { $set: update },
    { returnDocument: "after" },
  );
  if (!doc) throw NotFound("Supplier");
  return {
    id: doc._id.toString(),
    companyName: doc.companyName,
    contactPerson: doc.contactPerson,
    email: doc.email,
    phone: doc.phone,
    status: doc.status,
    outstandingBalance: await supplierBalance(doc._id),
  };
}

export async function deactivateSupplier(id: string): Promise<void> {
  const { suppliers } = await collections();
  const result = await suppliers.updateOne(
    { _id: toObjectId(id) },
    { $set: { status: "inactive", updatedAt: new Date() } },
  );
  if (result.matchedCount === 0) throw NotFound("Supplier");
}