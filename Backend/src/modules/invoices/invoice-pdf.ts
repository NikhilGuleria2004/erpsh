import PDFDocument from "pdfkit";
import type { BusinessSettingsDoc, InvoiceDoc, PaymentDoc } from "../../types/index.js";

interface InvoiceWithPaid extends InvoiceDoc {
  paidAmount: number;
}

/** Render a single invoice to a PDF buffer. Pure function — no I/O, no DB. */
export function renderInvoicePdf(
  invoice: InvoiceWithPaid,
  business: BusinessSettingsDoc | null,
  payments: PaymentDoc[],
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const fmt = (n: number) =>
      `${(business?.currency ?? "INR")} ${n.toFixed(2)}`;

    // Header
    doc
      .fontSize(20)
      .text(business?.name ?? "Your Business", { align: "left" });
    doc.fontSize(9).fillColor("#666");
    if (business?.address) doc.text(business.address);
    if (business?.email || business?.phone) {
      const contact = [business.email, business.phone].filter(Boolean).join(" · ");
      doc.text(contact);
    }
    if (business?.taxNumber) doc.text(`Tax #: ${business.taxNumber}`);
    doc.moveUp(0);
    doc
      .fontSize(22)
      .fillColor("#111")
      .text("INVOICE", { align: "right" });

    doc.moveDown(2);

    // Meta block
    doc.fontSize(10).fillColor("#111");
    const metaY = doc.y;
    doc
      .text(`Invoice #: ${invoice.invoiceNumber}`, 50, metaY)
      .text(`Issue date: ${invoice.issueDate.toISOString().slice(0, 10)}`, 50)
      .text(`Due date: ${invoice.dueDate.toISOString().slice(0, 10)}`, 50);
    doc
      .text(`Billed to: ${invoice.customerName}`, 320, metaY);

    doc.moveDown(2);

    // Table header
    const tableTop = doc.y;
    const colX = { item: 50, qty: 300, price: 360, total: 470 };
    doc
      .fontSize(10)
      .fillColor("#666")
      .text("Description", colX.item, tableTop)
      .text("Qty", colX.qty, tableTop, { width: 50, align: "right" })
      .text("Unit price", colX.price, tableTop, { width: 100, align: "right" })
      .text("Line total", colX.total, tableTop, { width: 80, align: "right" });
    doc
      .moveTo(50, tableTop + 15)
      .lineTo(545, tableTop + 15)
      .strokeColor("#ddd")
      .stroke();

    doc.moveDown(0.5);
    // We don't store line items on the invoice doc, but a real implementation
    // would $lookup salesOrders.items. For the MVP we show a single summary
    // line — the spec doesn't require itemised PDFs (yet).
    const itemY = doc.y;
    doc
      .fontSize(10)
      .fillColor("#111")
      .text(`Sales order ${invoice.salesOrderId.toString()}`, colX.item, itemY)
      .text("1", colX.qty, itemY, { width: 50, align: "right" })
      .text(fmt(invoice.amount), colX.price, itemY, { width: 100, align: "right" })
      .text(fmt(invoice.amount), colX.total, itemY, { width: 80, align: "right" });

    // Totals
    doc.moveDown(3);
    const totalsX = 380;
    let y = doc.y;
    doc
      .fontSize(10)
      .fillColor("#111")
      .text("Total", totalsX, y, { width: 90, align: "right" })
      .text(fmt(invoice.amount), totalsX + 95, y, { width: 70, align: "right" });
    y += 18;
    doc
      .text("Paid", totalsX, y, { width: 90, align: "right" })
      .text(fmt(invoice.paidAmount), totalsX + 95, y, { width: 70, align: "right" });
    y += 18;
    const balance = invoice.amount - invoice.paidAmount;
    doc
      .font("Helvetica-Bold")
      .text("Balance due", totalsX, y, { width: 90, align: "right" })
      .text(fmt(balance), totalsX + 95, y, { width: 70, align: "right" });
    doc.font("Helvetica");

    // Payments history
    if (payments.length > 0) {
      doc.moveDown(3);
      doc.fontSize(11).fillColor("#111").text("Payments", 50);
      doc.moveDown(0.5);
      doc.fontSize(9).fillColor("#666");
      for (const p of payments) {
        doc.text(
          `${p.paymentNumber}  ${p.date.toISOString().slice(0, 10)}  ${p.method}  ${fmt(p.amount)}  [${p.status}]`,
        );
      }
    }

    doc.end();
  });
}
