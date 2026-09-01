import "dotenv/config";
import { ObjectId } from "mongodb";
import { collections } from "../src/db/collections.js";

async function main() {
  const { suppliers, purchaseOrders } = await collections();

  const supplierId = new ObjectId();
  await suppliers.insertOne({
    _id: supplierId,
    companyName: "Balance Test Supplier",
    contactPerson: "Divya Menon",
    email: "balance.supplier@example.com",
    phone: "+91 70000 11111",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await purchaseOrders.insertMany([
    {
      _id: new ObjectId(),
      poNumber: "PO-2026-99001",
      supplierId,
      supplierName: "Balance Test Supplier",
      items: [],
      amount: 50000,
      status: "confirmed",
      date: new Date(),
      createdBy: supplierId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: new ObjectId(),
      poNumber: "PO-2026-99002",
      supplierId,
      supplierName: "Balance Test Supplier",
      items: [],
      amount: 30000,
      status: "partially_received",
      date: new Date(),
      createdBy: supplierId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: new ObjectId(),
      poNumber: "PO-2026-99003",
      supplierId,
      supplierName: "Balance Test Supplier",
      items: [],
      amount: 20000,
      status: "received",
      date: new Date(),
      createdBy: supplierId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: new ObjectId(),
      poNumber: "PO-2026-99004",
      supplierId,
      supplierName: "Balance Test Supplier",
      items: [],
      amount: 99999,
      status: "draft",
      date: new Date(),
      createdBy: supplierId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: new ObjectId(),
      poNumber: "PO-2026-99005",
      supplierId,
      supplierName: "Balance Test Supplier",
      items: [],
      amount: 88888,
      status: "cancelled",
      date: new Date(),
      createdBy: supplierId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  console.log("Seeded test supplier id:", supplierId.toString());
  console.log(
    "Active POs: confirmed(50000) + partially_received(30000) + received(20000) = 100000",
  );
  console.log("Draft(99999) and cancelled(88888) should NOT count. Expected balance: 100000");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});