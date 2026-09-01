import { collections } from "../db/collections.js";

export const PREFIX = {
  salesOrder: "SO",
  purchaseOrder: "PO",
  invoice: "INV",
  payment: "PMT",
  expense: "EXP",
  inventoryTxn: "INV-TXN",
  supplierPayment: "SPMT",
} as const;

const START_SEQ = {
  salesOrder: 10001,
  purchaseOrder: 1,
  invoice: 1,
  payment: 8001,
  expense: 501,
  inventoryTxn: 3001,
  supplierPayment: 9001,
} as const;

export type SequenceKey = keyof typeof PREFIX;

// `PREFIX` is the canonical source for valid sequence keys (via SequenceKey);
// reference it here so future renames stay in sync and eslint sees a use.
void PREFIX;

export async function nextSequence(key: SequenceKey): Promise<number> {
  const { counters } = await collections();
  const result = await counters.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 }, $setOnInsert: { startedAt: new Date() } },
    { upsert: true, returnDocument: "after" },
  );
  const seq = result?.seq ?? START_SEQ[key];
  // After first increment, on a fresh DB seq becomes 1; we want to start
  // from START_SEQ, so if seq is below the start, bump it up.
  if (seq < START_SEQ[key]) {
    const bumped = await counters.findOneAndUpdate(
      { _id: key },
      { $set: { seq: START_SEQ[key] } },
      { returnDocument: "after" },
    );
    return bumped?.seq ?? START_SEQ[key];
  }
  return seq;
}

export async function nextOrderNumber(): Promise<string> {
  const seq = await nextSequence("salesOrder");
  return `SO-${seq}`;
}

export async function nextPoNumber(): Promise<string> {
  const seq = await nextSequence("purchaseOrder");
  const year = new Date().getFullYear();
  return `PO-${year}-${String(seq).padStart(5, "0")}`;
}

export async function nextInvoiceNumber(): Promise<string> {
  const seq = await nextSequence("invoice");
  const year = new Date().getFullYear();
  return `INV-${year}-${String(seq).padStart(5, "0")}`;
}

export async function nextPaymentId(): Promise<string> {
  const seq = await nextSequence("payment");
  return `PMT-${seq}`;
}

export async function nextExpenseId(): Promise<string> {
  const seq = await nextSequence("expense");
  return `EXP-${seq}`;
}

export async function nextInventoryTxnId(): Promise<string> {
  const seq = await nextSequence("inventoryTxn");
  return `INV-TXN-${seq}`;
}

export async function nextSupplierPaymentId(): Promise<string> {
  const seq = await nextSequence("supplierPayment");
  return `SPMT-${seq}`;
}