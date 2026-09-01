import { collections } from "../../db/collections.js";
import { NotFound, Unauthorized } from "../../lib/errors.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { signToken } from "../../lib/jwt.js";
import type { UserDoc } from "../../types/index.js";

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserDoc["role"];
  phone?: string;
  status: UserDoc["status"];
}

export interface LoginResult {
  token: string;
  user: PublicUser;
}

export function toPublicUser(doc: UserDoc): PublicUser {
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    role: doc.role,
    phone: doc.phone,
    status: doc.status,
  };
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const { users } = await collections();
  const user = await users.findOne({ email: email.toLowerCase() });
  // Same error for unknown email and wrong password — avoid user enumeration.
  if (!user) throw Unauthorized("Invalid email or password");
  if (user.status !== "active") throw Unauthorized("Account is inactive");
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw Unauthorized("Invalid email or password");
  const token = await signToken({
    sub: user._id.toString(),
    role: user.role,
    email: user.email,
  });
  return { token, user: toPublicUser(user) };
}

export async function me(userId: string): Promise<PublicUser> {
  const { users } = await collections();
  let oid;
  try {
    oid = new (await import("mongodb")).ObjectId(userId);
  } catch {
    throw NotFound("User");
  }
  const user = await users.findOne({ _id: oid });
  if (!user) throw NotFound("User");
  return toPublicUser(user);
}

export { hashPassword };