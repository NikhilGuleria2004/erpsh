import { z } from "zod";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ObjectId } from "mongodb";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { zodHook } from "../../middleware/error-handler.js";
import { collections } from "../../db/collections.js";
import { parsePagination, type PaginatedResult } from "../../lib/pagination.js";
import type { AuditLogDoc } from "../../types/index.js";

const listQuerySchema = z.object({
  search: z.string().optional(),
  action: z
    .enum([
      "create",
      "update",
      "delete",
      "login",
      "approve",
      "fulfill",
      "cancel",
      "receive",
      "record_payment",
      "supplier_payment",
    ])
    .optional(),
  resource: z.string().optional(),
  userId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export interface AuditLogApi {
  id: string;
  userId: string | null;
  userEmail: string | null;
  method: string;
  path: string;
  action: string;
  resource: string;
  resourceId?: string;
  status: number;
  requestId: string;
  createdAt: string;
}

function toApi(doc: AuditLogDoc): AuditLogApi {
  return {
    id: doc._id.toString(),
    userId: doc.userId?.toString() ?? null,
    userEmail: doc.userEmail,
    method: doc.method,
    path: doc.path,
    action: doc.action,
    resource: doc.resource,
    resourceId: doc.resourceId,
    status: doc.status,
    requestId: doc.requestId,
    createdAt: doc.createdAt.toISOString(),
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const app = new Hono();
app.use("*", requireAuth);
app.use("*", requireRole("admin"));

app.get(
  "/",
  zValidator("query", listQuerySchema, zodHook),
  async (c) => {
    const query = c.req.valid("query");
    const { auditLog } = await collections();
    const filter: Record<string, unknown> = {};
    if (query.action) filter.action = query.action;
    if (query.resource) filter.resource = query.resource;
    if (query.userId) {
      try {
        filter.userId = new ObjectId(query.userId);
      } catch {
        filter.userId = null;
      }
    }
    if (query.search) {
      const re = new RegExp(escapeRegex(query.search), "i");
      filter.$or = [
        { path: re },
        { userEmail: re },
        { resourceId: re },
        { paymentNumber: re },
      ];
    }
    const { page, limit, skip } = parsePagination(query);
    const [docs, total] = await Promise.all([
      auditLog
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      auditLog.countDocuments(filter),
    ]);
    const result: PaginatedResult<AuditLogApi> = {
      items: docs.map(toApi),
      total,
      page,
      limit,
    };
    return c.json({ data: result.items, meta: { page, limit, total } });
  },
);

app.get("/:id", async (c) => {
  const { auditLog } = await collections();
  let _id: ObjectId;
  try {
    _id = new ObjectId(c.req.param("id") ?? "");
  } catch {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Audit log entry not found" } },
      404,
    );
  }
  const doc = await auditLog.findOne({ _id });
  if (!doc) {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Audit log entry not found" } },
      404,
    );
  }
  return c.json({ data: toApi(doc) });
});

export default app;
