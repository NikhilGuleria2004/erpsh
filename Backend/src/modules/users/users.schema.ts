import { z } from "zod";

export const roleEnum = z.enum(["admin", "manager", "employee"]);
export const statusEnum = z.enum(["active", "inactive"]);

export const createUserSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(200),
  role: roleEnum,
  phone: z.string().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  phone: z.string().optional(),
  role: roleEnum.optional(),
  status: statusEnum.optional(),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8).max(200),
});

export const listUsersQuerySchema = z.object({
  search: z.string().optional(),
  role: roleEnum.optional(),
  status: statusEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;