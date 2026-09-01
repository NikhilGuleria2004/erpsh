import { z } from "zod";

export const createProductSchema = z.object({
  sku: z.string().min(1).max(40),
  name: z.string().min(1).max(120),
  category: z.string().min(1),
  brand: z.string().min(1),
  purchasePrice: z.number().nonnegative(),
  sellingPrice: z.number().nonnegative(),
  minimumStockLevel: z.number().int().nonnegative(),
  unit: z.string().min(1).default("unit"),
  openingStock: z.number().int().nonnegative().default(0),
});

export const updateProductSchema = createProductSchema
  .partial()
  .omit({ openingStock: true });

export const listProductsQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;