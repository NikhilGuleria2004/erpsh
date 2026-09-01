import { ObjectId } from "mongodb";
import { collections } from "../../db/collections.js";
import { NotFound } from "../../lib/errors.js";
import { parsePagination, type PaginatedResult } from "../../lib/pagination.js";
import type { ListInvoicesQuery } from "./invoices.schema.js";
import type { InvoiceDoc, InvoiceStatus } from "../../types/index.js";

export interface InvoiceListRow {
  id: string;
  customerName: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
}

export interface InvoiceDetail extends InvoiceListRow {
  customerId: string;
  salesOrderId: string;
  paidAmount: number;
  payments: Array<{
    id: string;
    amount: number;
    method: string;
    status: string;
    date: string;
  }>;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function computeStatus(
  amount: number,
  paidAmount: number,
  dueDate: Date,
  now: Date = new Date(),
): InvoiceStatus {
  if (paidAmount >= amount) return "paid";
  if (paidAmount > 0) return "partially_paid";
  if (dueDate.getTime() < now.getTime()) return "overdue";
  return "unpaid";
}

export { computeStatus };

interface InvoiceWithPaid {
  doc: InvoiceDoc;
  paidAmount: number;
}

async function paidAmountsByInvoice(
  invoiceIds: ObjectId[],
): Promise<Map<string, number>> {
  if (invoiceIds.length === 0) return new Map();
  const { payments } = await collections();
  const result = await payments
    .aggregate<{ _id: ObjectId; paid: number }>([
      {
        $match: {
          invoiceId: { $in: invoiceIds },
          status: "completed",
        },
      },
      { $group: { _id: "$invoiceId", paid: { $sum: "$amount" } } },
    ])
    .toArray();
  return new Map(result.map((r) => [r._id.toString(), r.paid]));
}

async function loadInvoicesWithPaid(
  filter: Record<string, unknown>,
): Promise<InvoiceWithPaid[]> {
  const { invoices } = await collections();
  const docs = await invoices
    .find(filter)
    .sort({ issueDate: -1, createdAt: -1 })
    .toArray();
  const paidMap = await paidAmountsByInvoice(docs.map((d) => d._id));
  return docs.map((d) => ({
    doc: d,
    paidAmount: paidMap.get(d._id.toString()) ?? 0,
  }));
}

function toListRow(
  doc: InvoiceDoc,
  paidAmount: number,
  now: Date = new Date(),
): InvoiceListRow {
  return {
    id: doc.invoiceNumber,
    customerName: doc.customerName,
    amount: doc.amount,
    issueDate: doc.issueDate.toISOString(),
    dueDate: doc.dueDate.toISOString(),
    status: computeStatus(doc.amount, paidAmount, doc.dueDate, now),
  };
}

export async function listInvoices(
  query: ListInvoicesQuery,
): Promise<PaginatedResult<InvoiceListRow>> {
  const { invoices } = await collections();
  const filter: Record<string, unknown> = {};
  if (query.customerId) {
    try {
      filter.customerId = new ObjectId(query.customerId);
    } catch {
      throw NotFound("Customer");
    }
  }
  if (query.search) {
    const re = new RegExp(escapeRegex(query.search), "i");
    filter.$or = [{ invoiceNumber: re }, { customerName: re }];
  }
  // Note: status filter is applied AFTER computing status (below), since
  // status is derived, not stored.
  const { page, limit, skip } = parsePagination(query);
  const total = await invoices.countDocuments(filter);
  const loaded = await loadInvoicesWithPaid(filter);
  const rows = loaded
    .map(({ doc, paidAmount }) => toListRow(doc, paidAmount))
    .filter((r) => (query.status ? r.status === query.status : true));
  const sliced = rows.slice(skip, skip + limit);
  // When a status filter is applied the slice happens after filtering, but
  // the `meta.total` should reflect either all rows (no status) or rows that
  // match the status. Keep both consistent.
  const filteredTotal = query.status ? rows.length : total;
  return { items: sliced, total: filteredTotal, page, limit };
}

export async function getInvoice(id: string): Promise<InvoiceDetail> {
  const { invoices, payments } = await collections();
  let doc: InvoiceDoc | null = null;
  if (/^INV-\d{4}-\d+$/.test(id)) {
    doc = await invoices.findOne({ invoiceNumber: id });
  } else {
    try {
      doc = await invoices.findOne({ _id: new ObjectId(id) });
    } catch {
      doc = null;
    }
  }
  if (!doc) throw NotFound("Invoice");

  const paidDocs = await payments
    .find({ invoiceId: doc._id })
    .sort({ date: -1, createdAt: -1 })
    .toArray();
  const paidAmount = paidDocs
    .filter((p) => p.status === "completed")
    .reduce((s, p) => s + p.amount, 0);

  return {
    id: doc.invoiceNumber,
    customerId: doc.customerId.toString(),
    salesOrderId: doc.salesOrderId.toString(),
    customerName: doc.customerName,
    amount: doc.amount,
    issueDate: doc.issueDate.toISOString(),
    dueDate: doc.dueDate.toISOString(),
    status: computeStatus(doc.amount, paidAmount, doc.dueDate),
    paidAmount,
    payments: paidDocs.map((p) => ({
      id: p.paymentNumber,
      amount: p.amount,
      method: p.method,
      status: p.status,
      date: p.date.toISOString(),
    })),
  };
}

export async function recomputeInvoiceStatus(
  invoiceId: ObjectId,
): Promise<InvoiceStatus> {
  const { invoices, payments } = await collections();
  const inv = await invoices.findOne({ _id: invoiceId });
  if (!inv) throw NotFound("Invoice");
  const paidDocs = await payments
    .find({ invoiceId, status: "completed" })
    .toArray();
  const paidAmount = paidDocs.reduce((s, p) => s + p.amount, 0);
  return computeStatus(inv.amount, paidAmount, inv.dueDate);
}