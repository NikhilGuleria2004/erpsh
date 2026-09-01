import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { zodHook } from "../../middleware/error-handler.js";
import {
  createUserSchema,
  listUsersQuerySchema,
  resetPasswordSchema,
  updateUserSchema,
} from "./users.schema.js";
import * as service from "./users.service.js";

const app = new Hono();

app.use("*", requireAuth, requireRole("admin"));

app.get("/", zValidator("query", listUsersQuerySchema, zodHook), async (c) => {
  const query = c.req.valid("query");
  const { items, total, page, limit } = await service.listUsers(query);
  return c.json({ data: items, meta: { page, limit, total } });
});

app.get("/:id", async (c) => {
  const user = await service.getUser(c.req.param("id") ?? "");
  return c.json({ data: user });
});

app.post("/", zValidator("json", createUserSchema, zodHook), async (c) => {
  const user = await service.createUser(c.req.valid("json"));
  return c.json({ data: user }, 201);
});

app.patch("/:id", zValidator("json", updateUserSchema, zodHook), async (c) => {
  const user = await service.updateUser(c.req.param("id") ?? "", c.req.valid("json"));
  return c.json({ data: user });
});

app.post(
  "/:id/reset-password",
  zValidator("json", resetPasswordSchema, zodHook),
  async (c) => {
    await service.resetPassword(c.req.param("id") ?? "", c.req.valid("json").newPassword);
    return c.body(null, 204);
  },
);

app.delete("/:id", async (c) => {
  await service.deactivateUser(c.req.param("id") ?? "");
  return c.body(null, 204);
});

export default app;