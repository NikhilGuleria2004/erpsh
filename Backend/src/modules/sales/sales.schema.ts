import { z } from "zod";

export const createSalesOrderSchema = z.object({
  customerId: z.string().min(1),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1, "At least one item is required"),
  tax: z.number().nonnegative().optional(),
});

export const listSalesOrdersQuerySchema = z.object({
  search: z.string().optional(),
  status: z
    .enum(["draft", "confirmed", "fulfilled", "cancelled"])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateSalesOrderInput = z.infer<typeof createSalesOrderSchema>;
export type ListSalesOrdersQuery = z.infer<typeof listSalesOrdersQuerySchema>;