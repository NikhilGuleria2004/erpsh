"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, CircleCheck, Clock, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { apiFetch } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Invoice } from "@/types";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const rows = await apiFetch.get<Invoice[]>("/invoices");
        setInvoices(rows);
      } catch (err) {
        console.error("Failed to load invoices", err);
      } finally {
        setLoading(false);
      }
    };
     
    void load();
  }, []);

  const filtered = useMemo(
    () =>
      invoices.filter(
        (i) =>
          i.id.toLowerCase().includes(query.toLowerCase()) ||
          i.customerName.toLowerCase().includes(query.toLowerCase()),
      ),
    [invoices, query],
  );

  const paidCount = invoices.filter((i) => i.status === "paid").length;
  const overdueCount = invoices.filter((i) => i.status === "overdue").length;
  const outstanding = invoices
    .filter((i) => i.status !== "paid")
    .reduce((sum, i) => sum + i.amount, 0);

  const columns: Column<Invoice>[] = [
    { header: "Invoice", render: (r) => <span className="font-medium">{r.id}</span> },
    { header: "Customer", render: (r) => r.customerName },
    { header: "Amount", align: "right", render: (r) => <span className="tabular-nums">{formatCurrency(r.amount)}</span> },
    { header: "Issue date", render: (r) => formatDate(r.issueDate) },
    { header: "Due date", render: (r) => formatDate(r.dueDate) },
    { header: "Payment status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Bills issued to customers and where each one stands."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total invoices" value={String(invoices.length)} icon={FileText} />
        <StatCard label="Paid" value={String(paidCount)} icon={CircleCheck} />
        <StatCard label="Overdue" value={String(overdueCount)} icon={TriangleAlert} />
        <StatCard label="Outstanding" value={formatCurrency(outstanding)} icon={Clock} />
      </div>

      <div className="flex items-center gap-2">
        <SearchInput
          className="max-w-xs"
          placeholder="Search by invoice or customer..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="ml-auto text-[12.5px] text-text-tertiary">
          {filtered.length} of {invoices.length} invoices
        </span>
      </div>

      <Card>
        <DataTable
          columns={columns}
          rows={filtered}
          getRowKey={(r) => r.id}
          emptyLabel={loading ? "Loading invoices..." : "No invoices match your search."}
        />
      </Card>
    </>
  );
}