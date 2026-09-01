import { z } from "zod";

export const createSupplierPaymentSchema = z.object({
  supplierId: z.string().min(1),
  purchaseOrderId: z.string().optional(),
  amount: z.number().positive(),
  method: z.enum(["cash", "card", "bank_transfer", "upi", "other"]),
  status: z.enum(["completed", "pending", "failed"]).default("completed"),
  date: z.coerce.date().optional(),
  note: z.string().max(280).optional(),
});

export const updateSupplierPaymentSchema = z.object({
  amount: z.number().positive().optional(),
  method: z.enum(["cash", "card", "bank_transfer", "upi", "other"]).optional(),
  status: z.enum(["completed", "pending", "failed"]).optional(),
  date: z.coerce.date().optional(),
  note: z.string().max(280).optional(),
});

export const listSupplierPaymentsQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(["completed", "pending", "failed"]).optional(),
  supplierId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateSupplierPaymentInput = z.infer<typeof createSupplierPaymentSchema>;
export type UpdateSupplierPaymentInput = z.infer<typeof updateSupplierPaymentSchema>;
export type ListSupplierPaymentsQuery = z.infer<typeof listSupplierPaymentsQuerySchema>;
