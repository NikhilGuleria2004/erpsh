import { z } from "zod";

export const listInvoicesQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(["unpaid", "partially_paid", "paid", "overdue"]).optional(),
  customerId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;