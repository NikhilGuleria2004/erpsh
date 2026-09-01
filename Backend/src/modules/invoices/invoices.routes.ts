import { Hono } from "hono";
import { ObjectId } from "mongodb";
import { zValidator } from "@hono/zod-validator";
import { requireAuth } from "../../middleware/auth.js";
import { zodHook } from "../../middleware/error-handler.js";
import { NotFound } from "../../lib/errors.js";
import { collections } from "../../db/collections.js";
import { listInvoicesQuerySchema } from "./invoices.schema.js";
import * as service from "./invoices.service.js";
import { renderInvoicePdf } from "./invoice-pdf.js";

const app = new Hono();
app.use("*", requireAuth);

app.get(
  "/",
  zValidator("query", listInvoicesQuerySchema, zodHook),
  async (c) => {
    const query = c.req.valid("query");
    const { items, total, page, limit } = await service.listInvoices(query);
    return c.json({ data: items, meta: { page, limit, total } });
  },
);

app.get("/:id", async (c) => {
  const invoice = await service.getInvoice(c.req.param("id") ?? "");
  return c.json({ data: invoice });
});

app.get("/:id/pdf", async (c) => {
  const id = c.req.param("id") ?? "";
  const detail = await service.getInvoice(id);
  const { invoices, payments, settings } = await collections();
  const rawDoc = /^INV-\d{4}-\d+$/.test(id)
    ? await invoices.findOne({ invoiceNumber: id })
    : await invoices.findOne({ _id: new ObjectId(id) }).catch(() => null);
  if (!rawDoc) throw NotFound("Invoice");
  const biz = await settings.findOne({ _id: "business" });
  const paidDocs = await payments
    .find({ invoiceId: rawDoc._id })
    .sort({ date: 1, createdAt: 1 })
    .toArray();
  const pdf = await renderInvoicePdf(
    { ...rawDoc, paidAmount: detail.paidAmount },
    biz,
    paidDocs,
  );
  c.header("Content-Type", "application/pdf");
  c.header("Content-Disposition", `inline; filename="${detail.id}.pdf"`);
  return c.body(pdf as unknown as ArrayBuffer);
});

export default app;
