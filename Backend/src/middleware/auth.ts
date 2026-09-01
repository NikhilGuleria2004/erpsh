import type { MiddlewareHandler } from "hono";
import { ObjectId } from "mongodb";
import { verifyToken, type JwtPayload, type Role } from "../lib/jwt.js";
import { ApiError, Forbidden, Unauthorized } from "../lib/errors.js";
import { collections } from "../db/collections.js";

declare module "hono" {
  interface ContextVariableMap {
    user: JwtPayload;
  }
}

export const requireAuth: MiddlewareHandler = async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) throw Unauthorized();
  let payload: JwtPayload;
  try {
    payload = await verifyToken(header.slice(7));
  } catch {
    throw Unauthorized("Invalid or expired token");
  }
  // Per Phase 10 hardening: re-check user.status on every request so a
  // freshly-deactivated user can't keep using a still-valid JWT.
  try {
    const { users } = await collections();
    const user = await users.findOne(
      { _id: new ObjectId(payload.sub) },
      { projection: { status: 1 } },
    );
    if (!user) throw new ApiError(401, "UNAUTHORIZED", "User no longer exists");
    if (user.status !== "active") {
      throw new ApiError(403, "FORBIDDEN", "Account is inactive");
    }
  } catch (err) {
    // Re-throw our own ApiError directly; anything else is a DB hiccup and
    // we surface a generic 401 so the request never silently passes.
    if (err instanceof ApiError) throw err;
    console.error("[auth] user status check failed", err);
    throw Unauthorized("Authentication failed");
  }
  c.set("user", payload);
  await next();
};

export const requireRole =
  (...roles: Role[]): MiddlewareHandler =>
  async (c, next) => {
    const user = c.get("user");
    if (!roles.includes(user.role)) throw Forbidden();
    await next();
  };