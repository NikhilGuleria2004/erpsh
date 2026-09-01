import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { loginSchema } from "./auth.schema.js";
import { login, me } from "./auth.service.js";
import { requireAuth } from "../../middleware/auth.js";
import { zodHook } from "../../middleware/error-handler.js";

const app = new Hono();

app.post("/login", zValidator("json", loginSchema, zodHook), async (c) => {
  const body = c.req.valid("json");
  const result = await login(body.email, body.password);
  return c.json({ data: result });
});

app.get("/me", requireAuth, async (c) => {
  const user = c.get("user");
  const profile = await me(user.sub);
  return c.json({ data: profile });
});

export default app;