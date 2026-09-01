import { z } from "zod";

export const createPaymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().positive(),
  method: z.enum(["cash", "card", "bank_transfer", "upi", "other"]),
  status: z.enum(["completed", "pending", "failed"]).default("completed"),
  date: z.coerce.date().optional(),
});

export const listPaymentsQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(["completed", "pending", "failed"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;