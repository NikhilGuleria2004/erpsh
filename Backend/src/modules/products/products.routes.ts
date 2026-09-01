import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { zodHook } from "../../middleware/error-handler.js";
import {
  createProductSchema,
  listProductsQuerySchema,
  updateProductSchema,
} from "./products.schema.js";
import * as service from "./products.service.js";

const app = new Hono();

app.use("*", requireAuth);

app.get(
  "/",
  zValidator("query", listProductsQuerySchema, zodHook),
  async (c) => {
    const query = c.req.valid("query");
    const { items, total, page, limit } = await service.listProducts(query);
    return c.json({ data: items, meta: { page, limit, total } });
  },
);

app.get("/:id", async (c) => {
  const product = await service.getProduct(c.req.param("id") ?? "");
  return c.json({ data: product });
});

app.post(
  "/",
  requireRole("admin", "manager"),
  zValidator("json", createProductSchema, zodHook),
  async (c) => {
    const user = c.get("user");
    const product = await service.createProduct(c.req.valid("json"), user.sub);
    return c.json({ data: product }, 201);
  },
);

app.patch(
  "/:id",
  requireRole("admin", "manager"),
  zValidator("json", updateProductSchema, zodHook),
  async (c) => {
    const product = await service.updateProduct(
      c.req.param("id") ?? "",
      c.req.valid("json"),
    );
    return c.json({ data: product });
  },
);

app.delete("/:id", requireRole("admin"), async (c) => {
  await service.deactivateProduct(c.req.param("id") ?? "");
  return c.body(null, 204);
});

export default app;