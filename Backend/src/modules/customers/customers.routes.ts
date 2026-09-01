import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { zodHook } from "../../middleware/error-handler.js";
import {
  createCustomerSchema,
  listCustomersQuerySchema,
  updateCustomerSchema,
} from "./customers.schema.js";
import * as service from "./customers.service.js";

const app = new Hono();
app.use("*", requireAuth);

app.get(
  "/",
  zValidator("query", listCustomersQuerySchema, zodHook),
  async (c) => {
    const query = c.req.valid("query");
    const { items, total, page, limit } = await service.listCustomers(query);
    return c.json({ data: items, meta: { page, limit, total } });
  },
);

app.get("/:id", async (c) => {
  const customer = await service.getCustomer(c.req.param("id") ?? "");
  return c.json({ data: customer });
});

app.get("/:id/orders", async (c) => {
  const items = await service.getCustomerOrders(c.req.param("id") ?? "");
  return c.json({ data: items });
});

app.get("/:id/invoices", async (c) => {
  const items = await service.getCustomerInvoices(c.req.param("id") ?? "");
  return c.json({ data: items });
});

app.post(
  "/",
  zValidator("json", createCustomerSchema, zodHook),
  async (c) => {
    const customer = await service.createCustomer(c.req.valid("json"));
    return c.json({ data: customer }, 201);
  },
);

app.patch(
  "/:id",
  requireRole("admin", "manager"),
  zValidator("json", updateCustomerSchema, zodHook),
  async (c) => {
    const customer = await service.updateCustomer(
      c.req.param("id") ?? "",
      c.req.valid("json"),
    );
    return c.json({ data: customer });
  },
);

app.delete("/:id", requireRole("admin"), async (c) => {
  await service.deactivateCustomer(c.req.param("id") ?? "");
  return c.body(null, 204);
});

export default app;