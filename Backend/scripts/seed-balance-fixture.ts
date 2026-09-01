import "dotenv/config";
import { ObjectId } from "mongodb";
import { collections } from "../src/db/collections.js";

async function main() {
  const { customers, salesOrders, invoices, payments } = await collections();

  const customerId = new ObjectId();
  await customers.insertOne({
    _id: customerId,
    name: "Balance Test Customer",
    email: "balance.test@example.com",
    phone: "+91 90000 11111",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const orderId = new ObjectId();
  const invoiceId = new ObjectId();
  await salesOrders.insertOne({
    _id: orderId,
    orderNumber: "SO-BAL-0001",
    customerId,
    customerName: "Balance Test Customer",
    items: [],
    subtotal: 0,
    tax: 0,
    amount: 10000,
    status: "confirmed",
    date: new Date(),
    createdBy: customerId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await invoices.insertOne({
    _id: invoiceId,
    invoiceNumber: "INV-BAL-0001",
    salesOrderId: orderId,
    customerId,
    customerName: "Balance Test Customer",
    amount: 10000,
    issueDate: new Date(),
    dueDate: new Date(Date.now() + 14 * 86400000),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await payments.insertOne({
    _id: new ObjectId(),
    paymentNumber: "PMT-BAL-0001",
    invoiceId,
    customerId,
    customerName: "Balance Test Customer",
    amount: 3000,
    method: "upi",
    status: "completed",
    date: new Date(),
    createdAt: new Date(),
  });
  await payments.insertOne({
    _id: new ObjectId(),
    paymentNumber: "PMT-BAL-0002",
    invoiceId,
    customerId,
    customerName: "Balance Test Customer",
    amount: 1500,
    method: "cash",
    status: "pending",
    date: new Date(),
    createdAt: new Date(),
  });

  console.log("Seeded test customer id:", customerId.toString());
  console.log("Invoiced: 10000, paid(completed only): 3000, expected outstandingBalance: 7000, ordersCount: 1");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});