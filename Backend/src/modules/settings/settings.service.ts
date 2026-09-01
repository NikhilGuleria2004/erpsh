import { ObjectId } from "mongodb";
import { collections } from "../../db/collections.js";
import { NotFound } from "../../lib/errors.js";
import type {
  BusinessSettingsDoc,
  NotificationPrefs,
  UserDoc,
} from "../../types/index.js";
import type {
  UpdateBusinessSettingsInput,
  UpdateNotificationPrefsInput,
} from "./settings.schema.js";

export interface BusinessSettingsApi {
  name: string;
  taxNumber?: string;
  address?: string;
  email?: string;
  phone?: string;
  currency: string;
  updatedAt: string;
}

function toApi(doc: BusinessSettingsDoc): BusinessSettingsApi {
  return {
    name: doc.name,
    taxNumber: doc.taxNumber,
    address: doc.address,
    email: doc.email,
    phone: doc.phone,
    currency: doc.currency,
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  lowStock: true,
  overdueInvoices: true,
  receivedPOs: false,
  supplierPayments: false,
};

export async function getBusinessSettings(): Promise<BusinessSettingsApi> {
  const { settings } = await collections();
  const doc = await settings.findOne({ _id: "business" });
  if (!doc) {
    // First read before any PATCH — synthesise a default response rather
    // than 404, so the settings page can render an empty form.
    return {
      name: "",
      currency: "INR",
      updatedAt: new Date(0).toISOString(),
    };
  }
  return toApi(doc);
}

export async function updateBusinessSettings(
  input: UpdateBusinessSettingsInput,
): Promise<BusinessSettingsApi> {
  const { settings } = await collections();
  const now = new Date();
  const set: Record<string, unknown> = { updatedAt: now };
  const unset: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue;
    if (k === "_id" || k === "updatedAt") continue;
    if (v === "" && (k === "taxNumber" || k === "address" || k === "email" || k === "phone")) {
      unset[k] = "";
    } else {
      set[k] = v;
    }
  }
  const update: Record<string, unknown> = { $set: set };
  if (Object.keys(unset).length > 0) update.$unset = unset;
  const doc = await settings.findOneAndUpdate(
    { _id: "business" },
    update,
    { upsert: true, returnDocument: "after" },
  );
  if (!doc) throw NotFound("Business settings");
  return toApi(doc);
}

export async function getNotificationPrefs(
  userId: string,
): Promise<NotificationPrefs> {
  const { users } = await collections();
  let _id: ObjectId;
  try {
    _id = new ObjectId(userId);
  } catch {
    throw NotFound("User");
  }
  const doc: UserDoc | null = await users.findOne(
    { _id },
    { projection: { notificationPrefs: 1 } },
  );
  if (!doc) throw NotFound("User");
  return { ...DEFAULT_NOTIFICATION_PREFS, ...(doc.notificationPrefs ?? {}) };
}

export async function updateNotificationPrefs(
  userId: string,
  input: UpdateNotificationPrefsInput,
): Promise<NotificationPrefs> {
  const { users } = await collections();
  let _id: ObjectId;
  try {
    _id = new ObjectId(userId);
  } catch {
    throw NotFound("User");
  }
  const set: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue;
    set[`notificationPrefs.${k}`] = v;
  }
  if (Object.keys(set).length === 0) {
    return getNotificationPrefs(userId);
  }
  const doc = await users.findOneAndUpdate(
    { _id },
    { $set: set },
    { returnDocument: "after", projection: { notificationPrefs: 1 } },
  );
  if (!doc) throw NotFound("User");
  return { ...DEFAULT_NOTIFICATION_PREFS, ...(doc.notificationPrefs ?? {}) };
}
