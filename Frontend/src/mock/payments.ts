import type { Payment } from "@/types";

export const payments: Payment[] = [
  { id: "PMT-8821", invoiceId: "INV-2026-00451", customerName: "Rahul Sharma", amount: 155760, method: "upi", date: "2026-09-01", status: "completed" },
  { id: "PMT-8820", invoiceId: "INV-2026-00450", customerName: "Dell Solutions Pvt Ltd", amount: 240000, method: "bank_transfer", date: "2026-08-31", status: "completed" },
  { id: "PMT-8819", invoiceId: "INV-2026-00447", customerName: "Sunrise Retail Co.", amount: 349995, method: "bank_transfer", date: "2026-08-29", status: "completed" },
  { id: "PMT-8818", invoiceId: "INV-2026-00446", customerName: "Meera Pillai", amount: 129998, method: "card", date: "2026-08-27", status: "completed" },
  { id: "PMT-8817", invoiceId: "INV-2026-00445", customerName: "Vikram Mehta", amount: 57500, method: "cash", date: "2026-08-23", status: "completed" },
  { id: "PMT-8816", invoiceId: "INV-2026-00448", customerName: "Vikram Mehta", amount: 20000, method: "upi", date: "2026-08-30", status: "pending" },
];
