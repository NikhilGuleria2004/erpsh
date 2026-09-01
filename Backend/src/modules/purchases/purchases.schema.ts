import { z } from "zod";

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().min(1),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive(),
        unitPrice: z.number().nonnegative(),
      }),
    )
    .min(1, "At least one item is required"),
});

export const receivePoSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        receivedQuantity: z.number().int().nonnegative(),
      }),
    )
    .min(1),
});

export const listPurchaseOrdersQuerySchema = z.object({
  search: z.string().optional(),
  status: z
    .enum([
      "draft",
      "pending",
      "confirmed",
      "partially_received",
      "received",
      "cancelled",
    ])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type ReceivePoInput = z.infer<typeof receivePoSchema>;
export type ListPurchaseOrdersQuery = z.infer<typeof listPurchaseOrdersQuerySchema>;