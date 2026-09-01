import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { errorHandler } from "./middleware/error-handler.js";
import { requestLogger } from "./middleware/request-logger.js";
import { auditLog } from "./middleware/audit-log.js";
import { rateLimit } from "./middleware/rate-limit.js";

import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/users/users.routes.js";
import productRoutes from "./modules/products/products.routes.js";
import inventoryRoutes from "./modules/inventory/inventory.routes.js";
import customerRoutes from "./modules/customers/customers.routes.js";
import supplierRoutes from "./modules/suppliers/suppliers.routes.js";
import salesRoutes from "./modules/sales/sales.routes.js";
import purchaseRoutes from "./modules/purchases/purchases.routes.js";
import invoiceRoutes from "./modules/invoices/invoices.routes.js";
import paymentRoutes from "./modules/payments/payments.routes.js";
import expenseRoutes from "./modules/expenses/expenses.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import reportRoutes from "./modules/reports/reports.routes.js";
import settingsRoutes from "./modules/settings/settings.routes.js";
import supplierPaymentRoutes from "./modules/supplier-payments/supplier-payments.routes.js";
import auditLogRoutes from "./modules/audit-log/audit-log.routes.js";

export const app = new Hono().basePath("/api");

const allowedOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return allowedOrigins[0] ?? "*";
      return allowedOrigins.includes(origin) ? origin : allowedOrigins[0] ?? "";
    },
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  }),
);

app.use("*", requestLogger);
app.use("*", honoLogger());
app.use("*", auditLog);
app.onError(errorHandler);

app.get("/health", (c) =>
  c.json({ data: { status: "ok", time: new Date().toISOString() } }),
);

// Per Phase 10: rate-limit the login endpoint specifically to slow down
// credential-stuffing. Other endpoints rely on JWT verification + RBAC.
// 5 requests / 15s / IP — a real user can fail-typo a few times but a script
// will hit the cap quickly. Bump the limit or move to Upstash Redis when
// going multi-instance.

app.use(
  "/auth/login",
  rateLimit({ capacity: 5, refillPerSecond: 5 / 15 }),
);

app.options("/auth/login", (c) => {
  return c.text("AUTH LOGIN OPTIONS REACHED");
});

app.post("/auth/login", (c) => {
  return c.json({
    debug: true,
    message: "DIRECT LOGIN ROUTE REACHED",
  });
});
app.route("/auth", authRoutes);
app.route("/users", userRoutes);
app.route("/products", productRoutes);
app.route("/inventory", inventoryRoutes);
app.route("/customers", customerRoutes);
app.route("/suppliers", supplierRoutes);
app.route("/sales", salesRoutes);
app.route("/purchases", purchaseRoutes);
app.route("/invoices", invoiceRoutes);
app.route("/payments", paymentRoutes);
app.route("/expenses", expenseRoutes);
app.route("/dashboard", dashboardRoutes);
app.route("/reports", reportRoutes);
app.route("/settings", settingsRoutes);
app.route("/supplier-payments", supplierPaymentRoutes);
app.route("/audit-log", auditLogRoutes);

export default app;