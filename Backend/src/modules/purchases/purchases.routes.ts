import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { zodHook } from "../../middleware/error-handler.js";
import {
  createPurchaseOrderSchema,
  listPurchaseOrdersQuerySchema,
  receivePoSchema,
} from "./purchases.schema.js";
import * as service from "./purchases.service.js";

const app = new Hono();
app.use("*", requireAuth);

app.get(
  "/",
  zValidator("query", listPurchaseOrdersQuerySchema, zodHook),
  async (c) => {
    const query = c.req.valid("query");
    const { items, total, page, limit } = await service.listPurchaseOrders(
      query,
    );
    return c.json({ data: items, meta: { page, limit, total } });
  },
);

app.get("/:id", async (c) => {
  const order = await service.getPurchaseOrder(c.req.param("id") ?? "");
  return c.json({ data: order });
});

app.post(
  "/",
  requireRole("admin", "manager"),
  zValidator("json", createPurchaseOrderSchema, zodHook),
  async (c) => {
    const user = c.get("user");
    const order = await service.createPurchaseOrder(
      c.req.valid("json"),
      user.sub,
    );
    return c.json({ data: order }, 201);
  },
);

app.post(
  "/:id/confirm",
  requireRole("admin", "manager"),
  async (c) => {
    const order = await service.confirmPurchaseOrder(c.req.param("id") ?? "");
    return c.json({ data: order });
  },
);

app.post(
  "/:id/receive",
  requireRole("admin", "manager"),
  zValidator("json", receivePoSchema, zodHook),
  async (c) => {
    const order = await service.receivePurchaseOrder(
      c.req.param("id") ?? "",
      c.req.valid("json"),
    );
    return c.json({ data: order });
  },
);

app.post("/:id/cancel", requireRole("admin", "manager"), async (c) => {
  const order = await service.cancelPurchaseOrder(c.req.param("id") ?? "");
  return c.json({ data: order });
});

export default app;