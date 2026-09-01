import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { zodHook } from "../../middleware/error-handler.js";
import {
  createSupplierPaymentSchema,
  listSupplierPaymentsQuerySchema,
  updateSupplierPaymentSchema,
} from "./supplier-payments.schema.js";
import * as service from "./supplier-payments.service.js";

const app = new Hono();
app.use("*", requireAuth);
app.use("*", requireRole("admin", "manager"));

app.get(
  "/",
  zValidator("query", listSupplierPaymentsQuerySchema, zodHook),
  async (c) => {
    const query = c.req.valid("query");
    const { items, total, page, limit } = await service.listSupplierPayments(query);
    return c.json({ data: items, meta: { page, limit, total } });
  },
);

app.get("/:id", async (c) => {
  const payment = await service.getSupplierPayment(c.req.param("id") ?? "");
  return c.json({ data: payment });
});

app.post(
  "/",
  zValidator("json", createSupplierPaymentSchema, zodHook),
  async (c) => {
    const user = c.get("user");
    const payment = await service.createSupplierPayment(
      c.req.valid("json"),
      user.sub,
    );
    return c.json({ data: payment }, 201);
  },
);

app.patch(
  "/:id",
  zValidator("json", updateSupplierPaymentSchema, zodHook),
  async (c) => {
    const payment = await service.updateSupplierPayment(
      c.req.param("id") ?? "",
      c.req.valid("json"),
    );
    return c.json({ data: payment });
  },
);

app.delete("/:id", requireRole("admin"), async (c) => {
  await service.deleteSupplierPayment(c.req.param("id") ?? "");
  return c.body(null, 204);
});

export default app;
