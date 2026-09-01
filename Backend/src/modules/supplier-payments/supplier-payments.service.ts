import { ObjectId } from "mongodb";
import { collections } from "../../db/collections.js";
import { NotFound } from "../../lib/errors.js";
import { nextSupplierPaymentId } from "../../lib/ids.js";
import { parsePagination, type PaginatedResult } from "../../lib/pagination.js";
import type {
  CreateSupplierPaymentInput,
  ListSupplierPaymentsQuery,
  UpdateSupplierPaymentInput,
} from "./supplier-payments.schema.js";
import type { SupplierPaymentDoc } from "../../types/index.js";

export interface SupplierPaymentApi {
  id: string;
  supplierId: string;
  supplierName: string;
  purchaseOrderId?: string;
  amount: number;
  method: SupplierPaymentDoc["method"];
  status: SupplierPaymentDoc["status"];
  date: string;
  note?: string;
}

function toApi(doc: SupplierPaymentDoc): SupplierPaymentApi {
  return {
    id: doc.paymentNumber,
    supplierId: doc.supplierId.toString(),
    supplierName: doc.supplierName,
    purchaseOrderId: doc.purchaseOrderId?.toString(),
    amount: doc.amount,
    method: doc.method,
    status: doc.status,
    date: doc.date.toISOString(),
    note: doc.note,
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function resolveSupplierId(idOrString: string): Promise<ObjectId> {
  try {
    return new ObjectId(idOrString);
  } catch {
    throw NotFound("Supplier");
  }
}

async function resolvePurchaseOrderId(
  idOrNumber: string,
): Promise<ObjectId> {
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

export async function listSupplierPayments(
  query: ListSupplierPaymentsQuery,
): Promise<PaginatedResult<SupplierPaymentApi>> {
  const { supplierPayments } = await collections();
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.supplierId) {
    try {
      filter.supplierId = new ObjectId(query.supplierId);
    } catch {
      throw NotFound("Supplier");
    }
  }
  if (query.search) {
    const re = new RegExp(escapeRegex(query.search), "i");
    filter.$or = [{ supplierName: re }, { paymentNumber: re }];
  }
  const { page, limit, skip } = parsePagination(query);
  const [docs, total] = await Promise.all([
    supplierPayments
      .find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    supplierPayments.countDocuments(filter),
  ]);
  return { items: docs.map(toApi), total, page, limit };
}

export async function getSupplierPayment(
  id: string,
): Promise<SupplierPaymentApi> {
  const { supplierPayments } = await collections();
  let doc: SupplierPaymentDoc | null = null;
  if (/^SPMT-\d+$/.test(id)) {
    doc = await supplierPayments.findOne({ paymentNumber: id });
  } else {
    try {
      doc = await supplierPayments.findOne({ _id: new ObjectId(id) });
    } catch {
      doc = null;
    }
  }
  if (!doc) throw NotFound("Supplier payment");
  return toApi(doc);
}

export async function createSupplierPayment(
  input: CreateSupplierPaymentInput,
  userId: string,
): Promise<SupplierPaymentApi> {
  const { supplierPayments, suppliers } = await collections();
  let supplierId: ObjectId;
  let creatorId: ObjectId;
  try {
    supplierId = await resolveSupplierId(input.supplierId);
  } catch {
    throw NotFound("Supplier");
  }
  try {
    creatorId = new ObjectId(userId);
  } catch {
    throw NotFound("User");
  }
  const supplier = await suppliers.findOne({ _id: supplierId });
  if (!supplier) throw NotFound("Supplier");

  let purchaseOrderId: ObjectId | undefined;
  if (input.purchaseOrderId) {
    purchaseOrderId = await resolvePurchaseOrderId(input.purchaseOrderId);
  }

  const now = new Date();
  const doc: SupplierPaymentDoc = {
    _id: new ObjectId(),
    paymentNumber: await nextSupplierPaymentId(),
    supplierId,
    supplierName: supplier.companyName,
    purchaseOrderId,
    amount: input.amount,
    method: input.method,
    status: input.status,
    date: input.date ?? now,
    note: input.note,
    createdBy: creatorId,
    createdAt: now,
    updatedAt: now,
  };
  await supplierPayments.insertOne(doc);
  return toApi(doc);
}

export async function updateSupplierPayment(
  id: string,
  input: UpdateSupplierPaymentInput,
): Promise<SupplierPaymentApi> {
  const { supplierPayments } = await collections();
  let _id: ObjectId;
  if (/^SPMT-\d+$/.test(id)) {
    const found = await supplierPayments.findOne(
      { paymentNumber: id },
      { projection: { _id: 1 } },
    );
    if (!found) throw NotFound("Supplier payment");
    _id = found._id;
  } else {
    try {
      _id = new ObjectId(id);
    } catch {
      throw NotFound("Supplier payment");
    }
  }
  const update: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined) update[k] = v;
  }
  const doc = await supplierPayments.findOneAndUpdate(
    { _id },
    { $set: update },
    { returnDocument: "after" },
  );
  if (!doc) throw NotFound("Supplier payment");
  return toApi(doc);
}

export async function deleteSupplierPayment(id: string): Promise<void> {
  const { supplierPayments } = await collections();
  let _id: ObjectId;
  if (/^SPMT-\d+$/.test(id)) {
    const found = await supplierPayments.findOne(
      { paymentNumber: id },
      { projection: { _id: 1 } },
    );
    if (!found) throw NotFound("Supplier payment");
    _id = found._id;
  } else {
    try {
      _id = new ObjectId(id);
    } catch {
      throw NotFound("Supplier payment");
    }
  }
  const result = await supplierPayments.deleteOne({ _id });
  if (result.deletedCount === 0) throw NotFound("Supplier payment");
}
