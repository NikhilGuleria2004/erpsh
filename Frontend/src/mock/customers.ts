import type { Customer } from "@/types";

export const customers: Customer[] = [
  { id: "C-001", name: "Rahul Sharma", email: "rahul.sharma@example.com", phone: "+91 98765 43210", ordersCount: 12, outstandingBalance: 0, status: "active" },
  { id: "C-002", name: "Priya Nair", email: "priya.nair@example.com", phone: "+91 91234 56780", ordersCount: 4, outstandingBalance: 15760, status: "active" },
  { id: "C-003", name: "Dell Solutions Pvt Ltd", email: "accounts@dellsolutions.example", phone: "+91 90000 11122", ordersCount: 27, outstandingBalance: 240000, status: "active" },
  { id: "C-004", name: "Ananya Iyer", email: "ananya.iyer@example.com", phone: "+91 99887 66554", ordersCount: 2, outstandingBalance: 0, status: "active" },
  { id: "C-005", name: "Vikram Mehta", email: "vikram.mehta@example.com", phone: "+91 93456 12378", ordersCount: 9, outstandingBalance: 48500, status: "active" },
  { id: "C-006", name: "Sunrise Retail Co.", email: "billing@sunriseretail.example", phone: "+91 88990 01122", ordersCount: 34, outstandingBalance: 0, status: "active" },
  { id: "C-007", name: "Karan Malhotra", email: "karan.malhotra@example.com", phone: "+91 97654 32109", ordersCount: 1, outstandingBalance: 7999, status: "inactive" },
  { id: "C-008", name: "Meera Pillai", email: "meera.pillai@example.com", phone: "+91 96543 21098", ordersCount: 6, outstandingBalance: 0, status: "active" },
];
