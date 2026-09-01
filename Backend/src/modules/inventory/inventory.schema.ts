import { z } from "zod";

export const adjustmentSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int(),
  type: z.enum(["adjustment", "damage"]),
  note: z.string().max(280).optional(),
});

export const listInventoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const listTransactionsQuerySchema = z.object({
  productId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type AdjustmentInput = z.infer<typeof adjustmentSchema>;
export type ListInventoryQuery = z.infer<typeof listInventoryQuerySchema>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;