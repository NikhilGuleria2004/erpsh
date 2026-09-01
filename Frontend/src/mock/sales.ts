import type { SalesOrder } from "@/types";

export const salesOrders: SalesOrder[] = [
  { id: "SO-10291", customerName: "Rahul Sharma", amount: 155760, date: "2026-09-01", status: "fulfilled", itemsCount: 2 },
  { id: "SO-10290", customerName: "Dell Solutions Pvt Ltd", amount: 480000, date: "2026-08-31", status: "confirmed", itemsCount: 6 },
  { id: "SO-10289", customerName: "Priya Nair", amount: 15760, date: "2026-08-30", status: "fulfilled", itemsCount: 1 },
  { id: "SO-10288", customerName: "Vikram Mehta", amount: 74000, date: "2026-08-29", status: "fulfilled", itemsCount: 1 },
  { id: "SO-10287", customerName: "Sunrise Retail Co.", amount: 349995, date: "2026-08-28", status: "fulfilled", itemsCount: 5 },
  { id: "SO-10286", customerName: "Ananya Iyer", amount: 8999, date: "2026-08-27", status: "draft", itemsCount: 1 },
  { id: "SO-10285", customerName: "Meera Pillai", amount: 129998, date: "2026-08-26", status: "fulfilled", itemsCount: 2 },
  { id: "SO-10284", customerName: "Karan Malhotra", amount: 7999, date: "2026-08-24", status: "cancelled", itemsCount: 1 },
  { id: "SO-10283", customerName: "Vikram Mehta", amount: 57500, date: "2026-08-22", status: "fulfilled", itemsCount: 1 },
  { id: "SO-10282", customerName: "Dell Solutions Pvt Ltd", amount: 224999, date: "2026-08-20", status: "fulfilled", itemsCount: 3 },
];
