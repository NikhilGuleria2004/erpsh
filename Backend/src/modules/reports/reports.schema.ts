import { z } from "zod";

export const salesReportQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  groupBy: z.enum(["day", "week", "month"]).default("month"),
});

export const expensesReportQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  groupBy: z.literal("category").default("category"),
});

export const profitReportQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type SalesReportQuery = z.infer<typeof salesReportQuerySchema>;
export type ExpensesReportQuery = z.infer<typeof expensesReportQuerySchema>;
export type ProfitReportQuery = z.infer<typeof profitReportQuerySchema>;