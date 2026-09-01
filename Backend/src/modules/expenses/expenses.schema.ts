import { z } from "zod";

export const createExpenseSchema = z.object({
  category: z.string().min(1).max(80),
  description: z.string().min(1).max(280),
  amount: z.number().nonnegative(),
  date: z.coerce.date(),
});

export const updateExpenseSchema = z.object({
  category: z.string().min(1).max(80).optional(),
  description: z.string().min(1).max(280).optional(),
  amount: z.number().nonnegative().optional(),
  date: z.coerce.date().optional(),
});

export const listExpensesQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(["recorded", "pending_approval"]).optional(),
  category: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ListExpensesQuery = z.infer<typeof listExpensesQuerySchema>;