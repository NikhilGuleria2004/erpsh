import "dotenv/config";
import { collections } from "../src/db/collections.js";

async function main() {
  const { invoices } = await collections();
  const r = await invoices.deleteMany({ invoiceNumber: "INV-2026-OVERDUE" });
  console.log("deleted count:", r.deletedCount);
  const remaining = await invoices.countDocuments({
    invoiceNumber: "INV-2026-OVERDUE",
  });
  console.log("remaining:", remaining);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});