"use client";

import { useEffect, useMemo, useState } from "react";
import { CreditCard, CircleCheck, Clock, IndianRupee } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { QuickFormModal } from "@/components/forms/QuickFormModal";
import { apiFetch } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Payment, Invoice } from "@/types";

const METHOD_LABEL: Record<Payment["method"], string> = {
  cash: "Cash",
  card: "Card",
  bank_transfer: "Bank transfer",
  upi: "UPI",
  other: "Other",
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const [p, inv] = await Promise.all([
        apiFetch.get<Payment[]>("/payments"),
        apiFetch.get<Invoice[]>("/invoices"),
      ]);
      setPayments(p);
      setInvoices(inv.filter((i) => i.status !== "paid"));
    } catch (err) {
      console.error("Failed to load payments", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, []);

  const filtered = useMemo(
    () =>
      payments.filter(
        (p) =>
          p.id.toLowerCase().includes(query.toLowerCase()) ||
          p.customerName.toLowerCase().includes(query.toLowerCase()) ||
          p.invoiceId.toLowerCase().includes(query.toLowerCase()),
      ),
    [payments, query],
  );

  const total = payments.reduce((sum, p) => sum + p.amount, 0);
  const completed = payments.filter((p) => p.status === "completed").length;
  const pending = payments.filter((p) => p.status === "pending").length;

  const columns: Column<Payment>[] = [
    { header: "Payment ID", render: (r) => <span className="font-medium">{r.id}</span> },
    { header: "Invoice", render: (r) => <span className="text-text-secondary">{r.invoiceId}</span> },
    { header: "Customer", render: (r) => r.customerName },
    { header: "Amount", align: "right", render: (r) => <span className="tabular-nums">{formatCurrency(r.amount)}</span> },
    { header: "Method", render: (r) => METHOD_LABEL[r.method] },
    { header: "Date", render: (r) => formatDate(r.date) },
    { header: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  const handleCreate = async (values: Record<string, string>) => {
    await apiFetch.post("/payments", {
      invoiceId: values.invoiceId,
      amount: Number(values.amount),
      method: values.method,
    });
    await refresh();
  };

  return (
    <>
      <PageHeader
        title="Payments"
        description="Money received against invoices, across all payment methods."
        actions={
          <QuickFormModal
            triggerLabel="Record payment"
            title="Record payment"
            description="Apply a payment to an outstanding invoice."
            fields={[
              {
                name: "invoiceId",
                label: "Invoice",
                required: true,
                options: invoices.map((i) => ({
                  label: `${i.id} — ${i.customerName} (${formatCurrency(i.amount)})`,
                  value: i.id,
                })),
              },
              { name: "amount", label: "Amount", type: "number", placeholder: "0", required: true },
              {
                name: "method",
                label: "Method",
                required: true,
                options: [
                  { label: "Cash", value: "cash" },
                  { label: "Card", value: "card" },
                  { label: "Bank transfer", value: "bank_transfer" },
                  { label: "UPI", value: "upi" },
                  { label: "Other", value: "other" },
                ],
              },
            ]}
            onSubmit={handleCreate}
          />
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total collected" value={formatCurrency(total)} icon={IndianRupee} />
        <StatCard label="Payments" value={String(payments.length)} icon={CreditCard} />
        <StatCard label="Completed" value={String(completed)} icon={CircleCheck} />
        <StatCard label="Pending" value={String(pending)} icon={Clock} />
      </div>

      <div className="flex items-center gap-2">
        <SearchInput
          className="max-w-xs"
          placeholder="Search by payment, invoice, or customer..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="ml-auto text-[12.5px] text-text-tertiary">
          {filtered.length} of {payments.length} payments
        </span>
      </div>

      <Card>
        <DataTable
          columns={columns}
          rows={filtered}
          getRowKey={(r) => r.id}
          emptyLabel={loading ? "Loading payments..." : "No payments match your search."}
        />
      </Card>
    </>
  );
}