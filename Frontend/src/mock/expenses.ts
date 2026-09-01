import type { Expense } from "@/types";

export const expenses: Expense[] = [
  { id: "EXP-401", category: "Electricity", description: "August electricity bill", amount: 12500, date: "2026-09-01", status: "recorded" },
  { id: "EXP-400", category: "Rent", description: "Store rent - September", amount: 45000, date: "2026-08-31", status: "recorded" },
  { id: "EXP-399", category: "Salaries", description: "Staff salaries - August", amount: 186000, date: "2026-08-30", status: "recorded" },
  { id: "EXP-398", category: "Internet", description: "Broadband + backup line", amount: 3200, date: "2026-08-28", status: "recorded" },
  { id: "EXP-397", category: "Transportation", description: "Local delivery fuel", amount: 5400, date: "2026-08-26", status: "pending_approval" },
  { id: "EXP-396", category: "Office Supplies", description: "Stationery and printer ink", amount: 2100, date: "2026-08-24", status: "recorded" },
  { id: "EXP-395", category: "Maintenance", description: "AC servicing", amount: 3600, date: "2026-08-20", status: "pending_approval" },
];
