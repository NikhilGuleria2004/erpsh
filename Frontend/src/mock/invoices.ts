import type { Invoice } from "@/types";

export const invoices: Invoice[] = [
  { id: "INV-2026-00451", customerName: "Rahul Sharma", amount: 155760, issueDate: "2026-09-01", dueDate: "2026-09-15", status: "paid" },
  { id: "INV-2026-00450", customerName: "Dell Solutions Pvt Ltd", amount: 480000, issueDate: "2026-08-31", dueDate: "2026-09-14", status: "partially_paid" },
  { id: "INV-2026-00449", customerName: "Priya Nair", amount: 15760, issueDate: "2026-08-30", dueDate: "2026-09-13", status: "unpaid" },
  { id: "INV-2026-00448", customerName: "Vikram Mehta", amount: 74000, issueDate: "2026-08-29", dueDate: "2026-09-05", status: "overdue" },
  { id: "INV-2026-00447", customerName: "Sunrise Retail Co.", amount: 349995, issueDate: "2026-08-28", dueDate: "2026-09-11", status: "paid" },
  { id: "INV-2026-00446", customerName: "Meera Pillai", amount: 129998, issueDate: "2026-08-26", dueDate: "2026-09-09", status: "paid" },
  { id: "INV-2026-00445", customerName: "Vikram Mehta", amount: 57500, issueDate: "2026-08-22", dueDate: "2026-09-05", status: "paid" },
];
