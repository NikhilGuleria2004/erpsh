import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth } from "../../middleware/auth.js";
import { zodHook } from "../../middleware/error-handler.js";
import {
  createPaymentSchema,
  listPaymentsQuerySchema,
} from "./payments.schema.js";
import * as service from "./payments.service.js";

const app = new Hono();
app.use("*", requireAuth);

app.get(
  "/",
  zValidator("query", listPaymentsQuerySchema, zodHook),
  async (c) => {
    const query = c.req.valid("query");
    const { items, total, page, limit } = await service.listPayments(query);
    return c.json({ data: items, meta: { page, limit, total } });
  },
);

app.get("/:id", async (c) => {
  const payment = await service.getPayment(c.req.param("id") ?? "");
  return c.json({ data: payment });
});

app.post(
  "/",
  zValidator("json", createPaymentSchema, zodHook),
  async (c) => {
    const result = await service.createPayment(c.req.valid("json"));
    return c.json({ data: result }, 201);
  },
);

export default app;