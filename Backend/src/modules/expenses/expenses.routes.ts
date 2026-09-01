import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { zodHook } from "../../middleware/error-handler.js";
import {
  createExpenseSchema,
  listExpensesQuerySchema,
  updateExpenseSchema,
} from "./expenses.schema.js";
import * as service from "./expenses.service.js";

const app = new Hono();
app.use("*", requireAuth);

// All /expenses routes are admin/manager only — financial data, employee
// role doesn't see them per §9.9.
app.use("*", requireRole("admin", "manager"));

app.get(
  "/",
  zValidator("query", listExpensesQuerySchema, zodHook),
  async (c) => {
    const query = c.req.valid("query");
    const { items, total, page, limit } = await service.listExpenses(query);
    return c.json({ data: items, meta: { page, limit, total } });
  },
);

app.get("/:id", async (c) => {
  const expense = await service.getExpense(c.req.param("id") ?? "");
  return c.json({ data: expense });
});

app.post(
  "/",
  zValidator("json", createExpenseSchema, zodHook),
  async (c) => {
    const user = c.get("user");
    const expense = await service.createExpense(
      c.req.valid("json"),
      user.sub,
      user.role,
    );
    return c.json({ data: expense }, 201);
  },
);

app.post("/:id/approve", requireRole("admin"), async (c) => {
  const expense = await service.approveExpense(c.req.param("id") ?? "");
  return c.json({ data: expense });
});

app.patch(
  "/:id",
  requireRole("admin"),
  zValidator("json", updateExpenseSchema, zodHook),
  async (c) => {
    const expense = await service.updateExpense(
      c.req.param("id") ?? "",
      c.req.valid("json"),
    );
    return c.json({ data: expense });
  },
);

app.delete("/:id", requireRole("admin"), async (c) => {
  await service.deleteExpense(c.req.param("id") ?? "");
  return c.body(null, 204);
});

export default app;