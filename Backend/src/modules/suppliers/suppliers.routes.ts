import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { zodHook } from "../../middleware/error-handler.js";
import {
  createSupplierSchema,
  listSuppliersQuerySchema,
  updateSupplierSchema,
} from "./suppliers.schema.js";
import * as service from "./suppliers.service.js";

const app = new Hono();
app.use("*", requireAuth);

app.get(
  "/",
  zValidator("query", listSuppliersQuerySchema, zodHook),
  async (c) => {
    const query = c.req.valid("query");
    const { items, total, page, limit } = await service.listSuppliers(query);
    return c.json({ data: items, meta: { page, limit, total } });
  },
);

app.get("/:id", async (c) => {
  const supplier = await service.getSupplier(c.req.param("id") ?? "");
  return c.json({ data: supplier });
});

app.get("/:id/purchase-orders", async (c) => {
  const items = await service.getSupplierPurchaseOrders(
    c.req.param("id") ?? "",
  );
  return c.json({ data: items });
});

app.post(
  "/",
  requireRole("admin", "manager"),
  zValidator("json", createSupplierSchema, zodHook),
  async (c) => {
    const supplier = await service.createSupplier(c.req.valid("json"));
    return c.json({ data: supplier }, 201);
  },
);

app.patch(
  "/:id",
  requireRole("admin", "manager"),
  zValidator("json", updateSupplierSchema, zodHook),
  async (c) => {
    const supplier = await service.updateSupplier(
      c.req.param("id") ?? "",
      c.req.valid("json"),
    );
    return c.json({ data: supplier });
  },
);

app.delete("/:id", requireRole("admin"), async (c) => {
  await service.deactivateSupplier(c.req.param("id") ?? "");
  return c.body(null, 204);
});

export default app;