import "dotenv/config";
import { ObjectId } from "mongodb";
import { collections } from "../src/db/collections.js";

async function main() {
  const { customers, invoices } = await collections();
  const customer = await customers.findOne(
    { email: "sales.test@example.com" },
    { projection: { _id: 1, name: 1 } },
  );
  if (!customer) {
    console.error("Test customer not found; run phase 4 first.");
    process.exit(1);
  }
  const now = new Date();
  const pastDue = new Date(now.getTime() - 5 * 86400000); // 5 days ago
  const issued = new Date(now.getTime() - 20 * 86400000); // 20 days ago
  await invoices.insertOne({
    _id: new ObjectId(),
    invoiceNumber: "INV-2026-99001",
    salesOrderId: new ObjectId(),
    customerId: customer._id,
    customerName: customer.name,
    amount: 7777,
    issueDate: issued,
    dueDate: pastDue,
    createdAt: issued,
    updatedAt: issued,
  });
  console.log("Inserted overdue invoice INV-2026-99001 (due 5 days ago, amount 7777, no payments)");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});