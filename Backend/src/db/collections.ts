import { getDb } from "./client.js";
import type { Collections } from "./collections.d";

export async function collections(): Promise<Collections> {
  const db = await getDb();
  return {
    users: db.collection("users"),
    products: db.collection("products"),
    customers: db.collection("customers"),
    suppliers: db.collection("suppliers"),
    salesOrders: db.collection("salesOrders"),
    purchaseOrders: db.collection("purchaseOrders"),
    invoices: db.collection("invoices"),
    payments: db.collection("payments"),
    expenses: db.collection("expenses"),
    inventoryTransactions: db.collection("inventoryTransactions"),
    counters: db.collection("counters"),
    settings: db.collection("settings"),
    supplierPayments: db.collection("supplierPayments"),
    auditLog: db.collection("auditLog"),
  };
}