import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono().basePath("/api");

app.use(
  "*",
  cors({
    origin: "https://erpsh.vercel.app",
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  }),
);

app.get("/health", (c) => {
  return c.json({
    data: {
      status: "ok",
      time: new Date().toISOString(),
    },
  });
});

app.options("/auth/login", (c) => {
  return c.text("AUTH LOGIN OPTIONS REACHED");
});

app.post("/auth/login", (c) => {
  return c.json({
    debug: true,
    message: "DIRECT LOGIN ROUTE REACHED",
  });
});

export default app;