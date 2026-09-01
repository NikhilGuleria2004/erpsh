import { ObjectId } from "mongodb";
import { collections } from "../../db/collections.js";
import { Conflict, NotFound } from "../../lib/errors.js";
import { parsePagination, type PaginatedResult } from "../../lib/pagination.js";
import { hashPassword } from "../../lib/password.js";
import { toPublicUser, type PublicUser } from "../auth/auth.service.js";
import type { UserDoc } from "../../types/index.js";
import type { CreateUserInput, ListUsersQuery, UpdateUserInput } from "./users.schema.js";

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toObjectId(id: string): ObjectId {
  try {
    return new ObjectId(id);
  } catch {
    throw NotFound("User");
  }
}

export async function listUsers(
  query: ListUsersQuery,
): Promise<PaginatedResult<PublicUser>> {
  const { users } = await collections();
  const filter: Record<string, unknown> = {};
  if (query.role) filter.role = query.role;
  if (query.status) filter.status = query.status;
  if (query.search) {
    const re = new RegExp(escapeRegex(query.search), "i");
    filter.$or = [{ name: re }, { email: re }];
  }
  const { page, limit, skip } = parsePagination(query);
  const [docs, total] = await Promise.all([
    users.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    users.countDocuments(filter),
  ]);
  return { items: docs.map(toPublicUser), total, page, limit };
}

export async function getUser(id: string): Promise<PublicUser> {
  const { users } = await collections();
  const doc = await users.findOne({ _id: toObjectId(id) });
  if (!doc) throw NotFound("User");
  return toPublicUser(doc);
}

export async function createUser(input: CreateUserInput): Promise<PublicUser> {
  const { users } = await collections();
  const email = input.email.toLowerCase();
  const existing = await users.findOne({ email });
  if (existing) throw Conflict("Email already in use");
  const now = new Date();
  const doc: UserDoc = {
    _id: new ObjectId(),
    name: input.name,
    email,
    passwordHash: await hashPassword(input.password),
    role: input.role,
    phone: input.phone,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
  await users.insertOne(doc);
  return toPublicUser(doc);
}

export async function updateUser(
  id: string,
  input: UpdateUserInput,
): Promise<PublicUser> {
  const { users } = await collections();
  const _id = toObjectId(id);
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name !== undefined) update.name = input.name;
  if (input.phone !== undefined) update.phone = input.phone;
  if (input.role !== undefined) update.role = input.role;
  if (input.status !== undefined) update.status = input.status;
  const result = await users.findOneAndUpdate({ _id }, { $set: update }, { returnDocument: "after" });
  if (!result) throw NotFound("User");
  return toPublicUser(result);
}

export async function resetPassword(id: string, newPassword: string): Promise<void> {
  const { users } = await collections();
  const result = await users.updateOne(
    { _id: toObjectId(id) },
    {
      $set: {
        passwordHash: await hashPassword(newPassword),
        updatedAt: new Date(),
      },
    },
  );
  if (result.matchedCount === 0) throw NotFound("User");
}

export async function deactivateUser(id: string): Promise<void> {
  const { users } = await collections();
  const result = await users.updateOne(
    { _id: toObjectId(id) },
    { $set: { status: "inactive", updatedAt: new Date() } },
  );
  if (result.matchedCount === 0) throw NotFound("User");
}