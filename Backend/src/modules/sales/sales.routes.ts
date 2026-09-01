import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { zodHook } from "../../middleware/error-handler.js";
import {
  createSalesOrderSchema,
  listSalesOrdersQuerySchema,
} from "./sales.schema.js";
import * as service from "./sales.service.js";

const app = new Hono();
app.use("*", requireAuth);

app.get(
  "/",
  zValidator("query", listSalesOrdersQuerySchema, zodHook),
  async (c) => {
    const query = c.req.valid("query");
    const { items, total, page, limit } = await service.listSalesOrders(query);
    return c.json({ data: items, meta: { page, limit, total } });
  },
);

app.get("/:id", async (c) => {
  const order = await service.getSalesOrder(c.req.param("id") ?? "");
  return c.json({ data: order });
});

app.post(
  "/",
  zValidator("json", createSalesOrderSchema, zodHook),
  async (c) => {
    const user = c.get("user");
    const result = await service.createSalesOrder(
      c.req.valid("json"),
      user.sub,
    );
    return c.json({ data: result }, 201);
  },
);

app.post("/:id/fulfil", requireRole("admin", "manager"), async (c) => {
  const order = await service.fulfilSalesOrder(c.req.param("id") ?? "");
  return c.json({ data: order });
});

app.post("/:id/cancel", requireRole("admin", "manager"), async (c) => {
  const order = await service.cancelSalesOrder(c.req.param("id") ?? "");
  return c.json({ data: order });
});

export default app;