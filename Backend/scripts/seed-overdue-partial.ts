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
    console.error("Test customer not found");
    process.exit(1);
  }
  const pastDue = new Date(Date.now() - 5 * 86400000);
  const issued = new Date(Date.now() - 20 * 86400000);
  await invoices.insertOne({
    _id: new ObjectId(),
    invoiceNumber: "INV-2026-99002",
    salesOrderId: new ObjectId(),
    customerId: customer._id,
    customerName: customer.name,
    amount: 5000,
    issueDate: issued,
    dueDate: pastDue,
    createdAt: issued,
    updatedAt: issued,
  });
  console.log("Inserted overdue invoice INV-2026-99002 (due 5 days ago, amount 5000, no payments)");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});