import { ObjectId } from "mongodb";
import type { MiddlewareHandler } from "hono";
import { collections } from "../db/collections.js";
import type { AuditAction, AuditLogDoc } from "../types/index.js";

/** Resource segment of the path (e.g. "/api/products/abc" → "products").
 *  Falls back to the first path segment after the basePath. */
function resourceFromPath(path: string): string {
  const cleaned = path.split("?")[0] ?? path;
  const parts = cleaned.split("/").filter(Boolean);
  // Skip the basePath if it's the literal first segment.
  if (parts[0] === "api") parts.shift();
  return parts[0] ?? "unknown";
}

/** Best-effort action inference from method + path. Routes that need
 *  business-specific actions (e.g. approve, fulfil) can override via
 *  `c.set("audit", { action, resourceId, body })` before this middleware
 *  sees the response. */
function inferAction(method: string, path: string): AuditAction {
  if (path.includes("/approve")) return "approve";
  if (path.includes("/fulfill")) return "fulfill";
  if (path.includes("/cancel")) return "cancel";
  if (path.includes("/receive")) return "receive";
  if (path.includes("/payments") || path.includes("/record-payment")) {
    return "record_payment";
  }
  if (method === "POST") return "create";
  if (method === "PATCH" || method === "PUT") return "update";
  if (method === "DELETE") return "delete";
  return "update";
}

export interface AuditOverrides {
  action?: AuditAction;
  resource?: string;
  resourceId?: string;
  body?: unknown;
}

declare module "hono" {
  interface ContextVariableMap {
    audit?: AuditOverrides;
  }
}

/** Writes one row per mutating request. Reads (GET/HEAD) are skipped to
 *  keep the collection small. Auth failures still log so we can see attack
 *  patterns, but without a `userId`. */
export const auditLog: MiddlewareHandler = async (c, next) => {
  const method = c.req.method;
  const isMutation = method === "POST" || method === "PATCH" || method === "PUT" || method === "DELETE";
  if (!isMutation) {
    await next();
    return;
  }
  let threw: unknown = null;
  try {
    await next();
  } catch (err) {
    threw = err;
    throw err;
  } finally {
    // Pull user/requestId/overrides defensively — if next() threw before
    // setting them, we'll just log with null fields.
    const overrides = (() => {
      try { return c.get("audit"); } catch { return undefined; }
    })();
    const user = (() => {
      try { return c.get("user"); } catch { return undefined; }
    })();
    const requestId = (() => {
      try { return c.get("requestId"); } catch { return ""; }
    })();
    const path = c.req.path;
    const status = threw && typeof threw === "object" && "status" in threw
      ? ((threw as { status: number }).status | 0) || 500
      : c.res.status;
    const userSub = (user as { sub?: string } | undefined)?.sub;
    let userObjectId: ObjectId | null = null;
    if (userSub) {
      try { userObjectId = new ObjectId(userSub); } catch { userObjectId = null; }
    }
    const doc: AuditLogDoc = {
      _id: new ObjectId(),
      userId: userObjectId,
      userEmail: (user as { email?: string } | undefined)?.email ?? null,
      method,
      path,
      action: overrides?.action ?? inferAction(method, path),
      resource: overrides?.resource ?? resourceFromPath(path),
      resourceId: overrides?.resourceId,
      status,
      body: overrides?.body,
      requestId,
      createdAt: new Date(),
    };
    try {
      const { auditLog: coll } = await collections();
      await coll.insertOne(doc);
    } catch (err) {
      // Audit failures must never break the request — log and move on.
      console.error("[audit] failed to write log", err);
    }
  }
};
