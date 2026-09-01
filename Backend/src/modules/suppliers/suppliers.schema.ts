import { z } from "zod";

export const createSupplierSchema = z.object({
  companyName: z.string().min(1).max(160),
  contactPerson: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().min(1).max(40),
  address: z.string().max(280).optional(),
  taxNumber: z.string().max(40).optional(),
  paymentTerms: z.string().max(120).optional(),
});

export const updateSupplierSchema = createSupplierSchema.partial();

export const listSuppliersQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type ListSuppliersQuery = z.infer<typeof listSuppliersQuerySchema>;