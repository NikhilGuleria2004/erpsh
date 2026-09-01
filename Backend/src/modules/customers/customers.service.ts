import { ObjectId, type Document } from "mongodb";
import { collections } from "../../db/collections.js";
import { Conflict, NotFound } from "../../lib/errors.js";
import { parsePagination, type PaginatedResult } from "../../lib/pagination.js";
import type {
  CreateCustomerInput,
  ListCustomersQuery,
  UpdateCustomerInput,
} from "./customers.schema.js";
import type { CustomerDoc, Status } from "../../types/index.js";

export interface CustomerListRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  ordersCount: number;
  outstandingBalance: number;
  status: Status;
}

export interface CustomerDetail extends CustomerListRow {
  address?: string;
  taxNumber?: string;
  creditLimit?: number;
}

interface CustomerWithAggregates extends Document {
  _id: ObjectId;
  name: string;
  email: string;
  phone: string;
  address?: string;
  taxNumber?: string;
  creditLimit?: number;
  status: Status;
  createdAt: Date;
  updatedAt: Date;
  ordersCount: number;
  outstandingBalance: number;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toObjectId(id: string): ObjectId {
  try {
    return new ObjectId(id);
  } catch {
    throw NotFound("Customer");
  }
}

const CUSTOMER_LIST_PROJECTION = {
  _id: 1,
  name: 1,
  email: 1,
  phone: 1,
  status: 1,
};

export async function listCustomers(
  query: ListCustomersQuery,
): Promise<PaginatedResult<CustomerListRow>> {
  const { customers } = await collections();
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.search) {
    const re = new RegExp(escapeRegex(query.search), "i");
    filter.$or = [{ name: re }, { email: re }];
  }
  const { page, limit, skip } = parsePagination(query);
  const [docs, total] = await Promise.all([
    customers
      .find(filter, { projection: CUSTOMER_LIST_PROJECTION })
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    customers.countDocuments(filter),
  ]);
  const ids = docs.map((d) => d._id);
  const aggregates = await aggregateForCustomers(ids);
  const aggMap = new Map(
    aggregates.map((a) => [a._id.toString(), a]),
  );
  const items: CustomerListRow[] = docs.map((d) => {
    const a = aggMap.get(d._id.toString());
    return {
      id: d._id.toString(),
      name: d.name,
      email: d.email,
      phone: d.phone,
      status: d.status,
      ordersCount: a?.ordersCount ?? 0,
      outstandingBalance: a?.outstandingBalance ?? 0,
    };
  });
  return { items, total, page, limit };
}

async function aggregateForCustomers(
  customerIds: ObjectId[],
): Promise<CustomerWithAggregates[]> {
  if (customerIds.length === 0) return [];
  const { salesOrders, invoices } = await collections();
  const [orderAgg, balanceAgg] = await Promise.all([
    salesOrders
      .aggregate<{ _id: ObjectId; ordersCount: number }>([
        { $match: { customerId: { $in: customerIds }, status: { $ne: "cancelled" } } },
        { $group: { _id: "$customerId", ordersCount: { $sum: 1 } } },
      ])
      .toArray(),
    invoices
      .aggregate<{
        _id: ObjectId;
        invoiced: number;
        paid: number;
      }>([
        { $match: { customerId: { $in: customerIds } } },
        {
          $lookup: {
            from: "payments",
            localField: "_id",
            foreignField: "invoiceId",
            as: "ps",
          },
        },
        {
          $project: {
            customerId: 1,
            amount: 1,
            paid: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: "$ps",
                      as: "p",
                      cond: { $eq: ["$$p.status", "completed"] },
                    },
                  },
                  as: "p",
                  in: "$$p.amount",
                },
              },
            },
          },
        },
        {
          $group: {
            _id: "$customerId",
            invoiced: { $sum: "$amount" },
            paid: { $sum: "$paid" },
          },
        },
      ])
      .toArray(),
  ]);
  const orderMap = new Map(orderAgg.map((o) => [o._id.toString(), o.ordersCount]));
  const balanceMap = new Map(
    balanceAgg.map((b) => [b._id.toString(), b.invoiced - b.paid]),
  );
  return customerIds.map((id) => {
    const key = id.toString();
    return {
      _id: id,
      name: "",
      email: "",
      phone: "",
      status: "active" as Status,
      createdAt: new Date(),
      updatedAt: new Date(),
      ordersCount: orderMap.get(key) ?? 0,
      outstandingBalance: balanceMap.get(key) ?? 0,
    } as CustomerWithAggregates;
  });
}

export async function getCustomer(id: string): Promise<CustomerDetail> {
  const { customers } = await collections();
  const doc = await customers.findOne({ _id: toObjectId(id) });
  if (!doc) throw NotFound("Customer");
  const [agg] = await aggregateForCustomers([doc._id]);
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    phone: doc.phone,
    address: doc.address,
    taxNumber: doc.taxNumber,
    creditLimit: doc.creditLimit,
    status: doc.status,
    ordersCount: agg?.ordersCount ?? 0,
    outstandingBalance: agg?.outstandingBalance ?? 0,
  };
}

export async function getCustomerOrders(id: string) {
  const { salesOrders } = await collections();
  const oid = toObjectId(id);
  const docs = await salesOrders
    .find({ customerId: oid })
    .sort({ date: -1 })
    .toArray();
  return docs.map((d) => ({
    id: d.orderNumber,
    customerName: d.customerName,
    amount: d.amount,
    date: d.date.toISOString(),
    status: d.status,
    itemsCount: d.items.length,
  }));
}

export async function getCustomerInvoices(id: string) {
  const { invoices } = await collections();
  const oid = toObjectId(id);
  const docs = await invoices
    .find({ customerId: oid })
    .sort({ issueDate: -1 })
    .toArray();
  return docs.map((d) => ({
    id: d.invoiceNumber,
    customerName: d.customerName,
    amount: d.amount,
    issueDate: d.issueDate.toISOString(),
    dueDate: d.dueDate.toISOString(),
  }));
}

export async function createCustomer(
  input: CreateCustomerInput,
): Promise<CustomerListRow> {
  const { customers } = await collections();
  const email = input.email.toLowerCase();
  const existing = await customers.findOne({ email });
  if (existing) throw Conflict("Email already in use");
  const now = new Date();
  const doc: CustomerDoc = {
    _id: new ObjectId(),
    name: input.name,
    email,
    phone: input.phone,
    address: input.address,
    taxNumber: input.taxNumber,
    creditLimit: input.creditLimit,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
  await customers.insertOne(doc);
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    phone: doc.phone,
    status: doc.status,
    ordersCount: 0,
    outstandingBalance: 0,
  };
}

export async function updateCustomer(
  id: string,
  input: UpdateCustomerInput,
): Promise<CustomerListRow> {
  const { customers } = await collections();
  const _id = toObjectId(id);
  const update: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined) {
      update[k === "email" ? "email" : k] =
        k === "email" && typeof v === "string" ? v.toLowerCase() : v;
    }
  }
  const doc = await customers.findOneAndUpdate(
    { _id },
    { $set: update },
    { returnDocument: "after" },
  );
  if (!doc) throw NotFound("Customer");
  const [agg] = await aggregateForCustomers([doc._id]);
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    phone: doc.phone,
    status: doc.status,
    ordersCount: agg?.ordersCount ?? 0,
    outstandingBalance: agg?.outstandingBalance ?? 0,
  };
}

export async function deactivateCustomer(id: string): Promise<void> {
  const { customers } = await collections();
  const result = await customers.updateOne(
    { _id: toObjectId(id) },
    { $set: { status: "inactive", updatedAt: new Date() } },
  );
  if (result.matchedCount === 0) throw NotFound("Customer");
}