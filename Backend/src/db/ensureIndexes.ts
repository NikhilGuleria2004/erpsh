import { collections } from "./collections.js";

export async function ensureIndexes(): Promise<void> {
  const c = await collections();
  await Promise.all([
    c.users.createIndex({ email: 1 }, { unique: true }),
    c.products.createIndex({ sku: 1 }, { unique: true }),
    c.products.createIndex({ name: "text", sku: "text" }),
    c.customers.createIndex({ email: 1 }, { unique: true, sparse: true }),
    c.customers.createIndex({ name: "text", email: "text" }),
    c.suppliers.createIndex({ companyName: "text", contactPerson: "text" }),
    c.salesOrders.createIndex({ orderNumber: 1 }, { unique: true }),
    c.purchaseOrders.createIndex({ poNumber: 1 }, { unique: true }),
    c.invoices.createIndex({ invoiceNumber: 1 }, { unique: true }),
    c.invoices.createIndex({ customerId: 1 }),
    c.payments.createIndex({ invoiceId: 1 }),
    c.inventoryTransactions.createIndex({ productId: 1, createdAt: -1 }),
    c.supplierPayments.createIndex({ paymentNumber: 1 }, { unique: true }),
    c.supplierPayments.createIndex({ supplierId: 1, createdAt: -1 }),
    c.auditLog.createIndex({ createdAt: -1 }),
    c.auditLog.createIndex({ userId: 1, createdAt: -1 }),
  ]);
}