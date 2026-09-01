import { ObjectId } from "mongodb";
import { collections } from "../../db/collections.js";
import { Conflict, NotFound } from "../../lib/errors.js";
import { nextPaymentId } from "../../lib/ids.js";
import { parsePagination, type PaginatedResult } from "../../lib/pagination.js";
import type {
  CreatePaymentInput,
  ListPaymentsQuery,
} from "./payments.schema.js";
import type { InvoiceStatus, PaymentDoc } from "../../types/index.js";
import { recomputeInvoiceStatus } from "../invoices/invoices.service.js";

export interface PaymentApi {
  id: string;
  invoiceId: string;
  customerName: string;
  amount: number;
  method: PaymentDoc["method"];
  date: string;
  status: PaymentDoc["status"];
}

export interface CreatePaymentResult {
  payment: PaymentApi;
  invoiceStatus: InvoiceStatus;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toApi(
  doc: PaymentDoc,
  invoiceNumber: string = doc.invoiceId.toString(),
): PaymentApi {
  return {
    id: doc.paymentNumber,
    invoiceId: invoiceNumber,
    customerName: doc.customerName,
    amount: doc.amount,
    method: doc.method,
    date: doc.date.toISOString(),
    status: doc.status,
  };
}

async function resolveInvoiceId(
  idOrNumber: string,
): Promise<{ id: ObjectId; invoiceNumber: string; customerId: ObjectId; customerName: string }> {
  const { invoices } = await collections();
  let doc: { _id: ObjectId; invoiceNumber: string; customerId: ObjectId; customerName: string } | null = null;
  if (/^INV-\d{4}-\d+$/.test(idOrNumber)) {
    doc = await invoices.findOne(
      { invoiceNumber: idOrNumber },
      { projection: { _id: 1, invoiceNumber: 1, customerId: 1, customerName: 1 } },
    );
  } else {
    try {
      doc = await invoices.findOne(
        { _id: new ObjectId(idOrNumber) },
        { projection: { _id: 1, invoiceNumber: 1, customerId: 1, customerName: 1 } },
      );
    } catch {
      doc = null;
    }
  }
  if (!doc) throw NotFound("Invoice");
  return {
    id: doc._id,
    invoiceNumber: doc.invoiceNumber,
    customerId: doc.customerId,
    customerName: doc.customerName,
  };
}

export async function listPayments(
  query: ListPaymentsQuery,
): Promise<PaginatedResult<PaymentApi>> {
  const { payments, invoices } = await collections();
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.search) {
    const re = new RegExp(escapeRegex(query.search), "i");
    // Match on paymentNumber, customerName, or via $lookup-style match on
    // invoiceNumber. The simplest correct approach: pull matching invoice ids
    // first, then OR in the filter.
    const invoiceIds = await invoices
      .find({ invoiceNumber: re }, { projection: { _id: 1 } })
      .toArray();
    const ors: Record<string, unknown>[] = [
      { paymentNumber: re },
      { customerName: re },
    ];
    if (invoiceIds.length > 0) {
      ors.push({ invoiceId: { $in: invoiceIds.map((i) => i._id) } });
    }
    filter.$or = ors;
  }
  const { page, limit, skip } = parsePagination(query);
  const [docs, total] = await Promise.all([
    payments
      .find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    payments.countDocuments(filter),
  ]);
  // Resolve invoice numbers for list rows.
  const invoiceIdSet = new Set(docs.map((d) => d.invoiceId.toString()));
  const invoiceDocs = invoiceIdSet.size
    ? await invoices
        .find({ _id: { $in: [...invoiceIdSet].map((s) => new ObjectId(s)) } }, { projection: { _id: 1, invoiceNumber: 1 } })
        .toArray()
    : [];
  const numberById = new Map(
    invoiceDocs.map((i) => [i._id.toString(), i.invoiceNumber]),
  );
  const items: PaymentApi[] = docs.map((d) => ({
    id: d.paymentNumber,
    invoiceId: numberById.get(d.invoiceId.toString()) ?? d.invoiceId.toString(),
    customerName: d.customerName,
    amount: d.amount,
    method: d.method,
    date: d.date.toISOString(),
    status: d.status,
  }));
  return { items, total, page, limit };
}

export async function getPayment(id: string): Promise<PaymentApi> {
  const { payments, invoices } = await collections();
  let doc: PaymentDoc | null = null;
  if (/^PMT-\d+$/.test(id)) {
    doc = await payments.findOne({ paymentNumber: id });
  } else {
    try {
      doc = await payments.findOne({ _id: new ObjectId(id) });
    } catch {
      doc = null;
    }
  }
  if (!doc) throw NotFound("Payment");
  const inv = await invoices.findOne(
    { _id: doc.invoiceId },
    { projection: { invoiceNumber: 1 } },
  );
  return {
    id: doc.paymentNumber,
    invoiceId: inv?.invoiceNumber ?? doc.invoiceId.toString(),
    customerName: doc.customerName,
    amount: doc.amount,
    method: doc.method,
    date: doc.date.toISOString(),
    status: doc.status,
  };
}

export async function createPayment(
  input: CreatePaymentInput,
): Promise<CreatePaymentResult> {
  const { payments } = await collections();
  const invoice = await resolveInvoiceId(input.invoiceId);

  // Sum already-completed payments for this invoice.
  const paidSoFar = await payments
    .aggregate<{ sum: number }>([
      { $match: { invoiceId: invoice.id, status: "completed" } },
      { $group: { _id: null, sum: { $sum: "$amount" } } },
    ])
    .toArray();
  const alreadyPaid = paidSoFar[0]?.sum ?? 0;

  // Only enforce over-payment cap when this payment will be counted as
  // completed. Pending/failed payments are recorded but don't reduce the
  // outstanding balance.
  if (input.status === "completed") {
    const { invoices } = await collections();
    const inv = await invoices.findOne({ _id: invoice.id });
    if (!inv) throw NotFound("Invoice");
    if (alreadyPaid + input.amount > inv.amount) {
      throw Conflict(
        `Payment of ${input.amount} exceeds the remaining balance of ${inv.amount - alreadyPaid}`,
      );
    }
  }

  const now = input.date ?? new Date();
  const doc: PaymentDoc = {
    _id: new ObjectId(),
    paymentNumber: await nextPaymentId(),
    invoiceId: invoice.id,
    customerId: invoice.customerId,
    customerName: invoice.customerName,
    amount: input.amount,
    method: input.method,
    status: input.status,
    date: now,
    createdAt: new Date(),
  };
  await payments.insertOne(doc);

  const invoiceStatus = await recomputeInvoiceStatus(invoice.id);
  return {
    payment: {
      ...toApi(doc),
      invoiceId: invoice.invoiceNumber,
    },
    invoiceStatus,
  };
}