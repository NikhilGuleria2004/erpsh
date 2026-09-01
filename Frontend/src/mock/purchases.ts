import type { PurchaseOrder } from "@/types";

export const purchaseOrders: PurchaseOrder[] = [
  { id: "PO-2026-00125", supplierName: "ABC Electronics", itemsCount: 10, amount: 550000, date: "2026-08-30", status: "received" },
  { id: "PO-2026-00124", supplierName: "TechWorld Wholesale", itemsCount: 25, amount: 128400, date: "2026-08-28", status: "partially_received" },
  { id: "PO-2026-00123", supplierName: "Prime Distributors", itemsCount: 40, amount: 96000, date: "2026-08-25", status: "confirmed" },
  { id: "PO-2026-00122", supplierName: "Nova Peripherals", itemsCount: 60, amount: 32900, date: "2026-08-22", status: "pending" },
  { id: "PO-2026-00121", supplierName: "Global Components Ltd", itemsCount: 15, amount: 214500, date: "2026-08-18", status: "received" },
  { id: "PO-2026-00120", supplierName: "ABC Electronics", itemsCount: 8, amount: 176000, date: "2026-08-12", status: "cancelled" },
];
