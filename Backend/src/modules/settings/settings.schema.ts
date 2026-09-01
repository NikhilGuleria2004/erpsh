import { z } from "zod";

export const businessSettingsSchema = z.object({
  name: z.string().min(1).max(160),
  taxNumber: z.string().max(80).optional(),
  address: z.string().max(500).optional(),
  email: z.string().email().max(160).optional().or(z.literal("")),
  phone: z.string().max(40).optional(),
  currency: z.string().min(1).max(8),
});

export const updateBusinessSettingsSchema = businessSettingsSchema.partial();

export const notificationPrefsSchema = z.object({
  lowStock: z.boolean(),
  overdueInvoices: z.boolean(),
  receivedPOs: z.boolean(),
  supplierPayments: z.boolean(),
});

export const updateNotificationPrefsSchema = notificationPrefsSchema.partial();

export type BusinessSettingsInput = z.infer<typeof businessSettingsSchema>;
export type UpdateBusinessSettingsInput = z.infer<
  typeof updateBusinessSettingsSchema
>;
export type NotificationPrefsInput = z.infer<typeof notificationPrefsSchema>;
export type UpdateNotificationPrefsInput = z.infer<
  typeof updateNotificationPrefsSchema
>;
