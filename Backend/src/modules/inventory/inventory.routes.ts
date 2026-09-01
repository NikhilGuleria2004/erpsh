import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { zodHook } from "../../middleware/error-handler.js";
import {
  adjustmentSchema,
  listInventoryQuerySchema,
  listTransactionsQuerySchema,
} from "./inventory.schema.js";
import * as service from "./inventory.service.js";

const app = new Hono();
app.use("*", requireAuth);

app.get(
  "/",
  zValidator("query", listInventoryQuerySchema, zodHook),
  async (c) => {
    const query = c.req.valid("query");
    const { items, total, page, limit } = await service.listInventory(query);
    return c.json({ data: items, meta: { page, limit, total } });
  },
);

app.get(
  "/transactions",
  zValidator("query", listTransactionsQuerySchema, zodHook),
  async (c) => {
    const query = c.req.valid("query");
    const { items, total, page, limit } = await service.listTransactions(query);
    return c.json({ data: items, meta: { page, limit, total } });
  },
);

app.get("/transactions/:productId", async (c) => {
  const items = await service.getProductLedger(c.req.param("productId") ?? "");
  return c.json({ data: items });
});

app.post(
  "/adjustments",
  requireRole("admin", "manager"),
  zValidator("json", adjustmentSchema, zodHook),
  async (c) => {
    const user = c.get("user");
    const movement = await service.createAdjustment(
      c.req.valid("json"),
      user.sub,
    );
    return c.json({ data: movement }, 201);
  },
);

export default app;