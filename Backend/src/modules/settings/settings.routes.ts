import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { zodHook } from "../../middleware/error-handler.js";
import {
  updateBusinessSettingsSchema,
  updateNotificationPrefsSchema,
} from "./settings.schema.js";
import * as service from "./settings.service.js";

const app = new Hono();
app.use("*", requireAuth);

app.get("/business", async (c) => {
  const settings = await service.getBusinessSettings();
  return c.json({ data: settings });
});

app.patch(
  "/business",
  requireRole("admin"),
  zValidator("json", updateBusinessSettingsSchema, zodHook),
  async (c) => {
    const settings = await service.updateBusinessSettings(c.req.valid("json"));
    return c.json({ data: settings });
  },
);

app.get("/notifications", async (c) => {
  const user = c.get("user");
  const prefs = await service.getNotificationPrefs(user.sub);
  return c.json({ data: prefs });
});

app.patch(
  "/notifications",
  zValidator("json", updateNotificationPrefsSchema, zodHook),
  async (c) => {
    const user = c.get("user");
    const prefs = await service.updateNotificationPrefs(
      user.sub,
      c.req.valid("json"),
    );
    return c.json({ data: prefs });
  },
);

export default app;
