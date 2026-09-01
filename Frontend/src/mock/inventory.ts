import type { InventoryMovement } from "@/types";

export const inventoryMovements: InventoryMovement[] = [
  { id: "INV-TXN-2201", productName: "Dell Inspiron 15", type: "purchase", quantity: 20, balanceAfter: 30, date: "2026-08-29" },
  { id: "INV-TXN-2202", productName: "Dell Inspiron 15", type: "sale", quantity: -4, balanceAfter: 26, date: "2026-08-30" },
  { id: "INV-TXN-2203", productName: "Dell Inspiron 15", type: "damage", quantity: -2, balanceAfter: 24, date: "2026-08-31" },
  { id: "INV-TXN-2204", productName: "iPhone 15", type: "sale", quantity: -3, balanceAfter: 24, date: "2026-08-31" },
  { id: "INV-TXN-2205", productName: "HP Pavilion 14", type: "sale", quantity: -1, balanceAfter: 2, date: "2026-09-01" },
  { id: "INV-TXN-2206", productName: "Logitech Keyboard MK270", type: "sale", quantity: -6, balanceAfter: 4, date: "2026-09-01" },
  { id: "INV-TXN-2207", productName: "SanDisk 1TB SSD", type: "adjustment", quantity: -2, balanceAfter: 3, date: "2026-08-27" },
  { id: "INV-TXN-2208", productName: "Apple Magic Mouse", type: "sale", quantity: -5, balanceAfter: 0, date: "2026-08-26" },
];
