import { ObjectId } from "mongodb";
import { collections } from "../../db/collections.js";
import { Conflict, NotFound } from "../../lib/errors.js";
import { nextExpenseId } from "../../lib/ids.js";
import { parsePagination, type PaginatedResult } from "../../lib/pagination.js";
import type {
  CreateExpenseInput,
  ListExpensesQuery,
  UpdateExpenseInput,
} from "./expenses.schema.js";
import type { ExpenseDoc } from "../../types/index.js";

export interface ExpenseApi {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  status: ExpenseDoc["status"];
}

function toApi(doc: ExpenseDoc): ExpenseApi {
  return {
    id: doc.expenseNumber,
    category: doc.category,
    description: doc.description,
    amount: doc.amount,
    date: doc.date.toISOString(),
    status: doc.status,
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toObjectId(id: string): ObjectId {
  try {
    return new ObjectId(id);
  } catch {
    throw NotFound("Expense");
  }
}

async function resolveExpenseId(idOrNumber: string): Promise<ObjectId> {
  if (/^EXP-\d+$/.test(idOrNumber)) {
    const { expenses } = await collections();
    const doc = await expenses.findOne(
      { expenseNumber: idOrNumber },
      { projection: { _id: 1 } },
    );
    if (!doc) throw NotFound("Expense");
    return doc._id;
  }
  return toObjectId(idOrNumber);
}

export async function listExpenses(
  query: ListExpensesQuery,
): Promise<PaginatedResult<ExpenseApi>> {
  const { expenses } = await collections();
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.category) filter.category = query.category;
  if (query.search) {
    const re = new RegExp(escapeRegex(query.search), "i");
    filter.$or = [{ category: re }, { description: re }];
  }
  const { page, limit, skip } = parsePagination(query);
  const [docs, total] = await Promise.all([
    expenses
      .find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    expenses.countDocuments(filter),
  ]);
  return {
    items: docs.map(toApi),
    total,
    page,
    limit,
  };
}

export async function getExpense(id: string): Promise<ExpenseApi> {
  const { expenses } = await collections();
  let doc: ExpenseDoc | null = null;
  if (/^EXP-\d+$/.test(id)) {
    doc = await expenses.findOne({ expenseNumber: id });
  } else {
    try {
      doc = await expenses.findOne({ _id: toObjectId(id) });
    } catch {
      doc = null;
    }
  }
  if (!doc) throw NotFound("Expense");
  return toApi(doc);
}

export async function createExpense(
  input: CreateExpenseInput,
  userId: string,
  creatorRole: "admin" | "manager" | "employee",
): Promise<ExpenseApi> {
  const { expenses } = await collections();
  let creatorId: ObjectId;
  try {
    creatorId = new ObjectId(userId);
  } catch {
    throw NotFound("User");
  }
  const now = new Date();
  // Per §9.9: admin-created entries land as "recorded"; everyone else's
  // require approval and start as "pending_approval".
  const status: ExpenseDoc["status"] =
    creatorRole === "admin" ? "recorded" : "pending_approval";
  const doc: ExpenseDoc = {
    _id: new ObjectId(),
    expenseNumber: await nextExpenseId(),
    category: input.category,
    description: input.description,
    amount: input.amount,
    date: input.date,
    status,
    createdBy: creatorId,
    createdAt: now,
    updatedAt: now,
  };
  await expenses.insertOne(doc);
  return toApi(doc);
}

export async function updateExpense(
  id: string,
  input: UpdateExpenseInput,
): Promise<ExpenseApi> {
  const { expenses } = await collections();
  const _id = await resolveExpenseId(id);
  const update: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined) update[k] = v;
  }
  const doc = await expenses.findOneAndUpdate(
    { _id },
    { $set: update },
    { returnDocument: "after" },
  );
  if (!doc) throw NotFound("Expense");
  return toApi(doc);
}

export async function approveExpense(id: string): Promise<ExpenseApi> {
  const { expenses } = await collections();
  const _id = await resolveExpenseId(id);
  const doc = await expenses.findOneAndUpdate(
    { _id, status: "pending_approval" },
    { $set: { status: "recorded", updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!doc) {
    const existing = await expenses.findOne({ _id });
    if (!existing) throw NotFound("Expense");
    throw Conflict(
      `Cannot approve expense in status "${existing.status}"`,
    );
  }
  return toApi(doc);
}

export async function deleteExpense(id: string): Promise<void> {
  const { expenses } = await collections();
  const _id = await resolveExpenseId(id);
  const result = await expenses.deleteOne({ _id });
  if (result.deletedCount === 0) throw NotFound("Expense");
}