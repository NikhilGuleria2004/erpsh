"use client";

import { useEffect, useMemo, useState } from "react";
import { Receipt, IndianRupee, Clock } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { QuickFormModal } from "@/components/forms/QuickFormModal";
import { apiFetch, ApiError } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Expense } from "@/types";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const rows = await apiFetch.get<Expense[]>("/expenses");
      setExpenses(rows);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        console.warn("Not authorized to view expenses");
      } else {
        console.error("Failed to load expenses", err);
      }
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
      expenses.filter(
        (e) =>
          e.category.toLowerCase().includes(query.toLowerCase()) ||
          e.description.toLowerCase().includes(query.toLowerCase()),
      ),
    [expenses, query],
  );

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const pendingApproval = expenses.filter(
    (e) => e.status === "pending_approval",
  ).length;

  const columns: Column<Expense>[] = [
    { header: "Category", render: (r) => <span className="font-medium">{r.category}</span> },
    { header: "Description", render: (r) => <span className="text-text-secondary">{r.description}</span> },
    { header: "Amount", align: "right", render: (r) => <span className="tabular-nums">{formatCurrency(r.amount)}</span> },
    { header: "Date", render: (r) => formatDate(r.date) },
    { header: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  const handleCreate = async (values: Record<string, string>) => {
    await apiFetch.post("/expenses", {
      category: values.category,
      description: values.description,
      amount: Number(values.amount),
      date: values.date,
    });
    await refresh();
  };

  return (
    <>
      <PageHeader
        title="Expenses"
        description="Operating costs that aren't tied to inventory purchases."
        actions={
          <QuickFormModal
            triggerLabel="Add expense"
            title="Add expense"
            fields={[
              { name: "category", label: "Category", placeholder: "e.g. Electricity", required: true },
              { name: "description", label: "Description", placeholder: "e.g. August electricity bill", required: true },
              { name: "amount", label: "Amount", type: "number", placeholder: "0", required: true },
              { name: "date", label: "Date", type: "date", required: true },
            ]}
            onSubmit={handleCreate}
          />
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Total expenses" value={formatCurrency(total)} icon={IndianRupee} />
        <StatCard label="Entries" value={String(expenses.length)} icon={Receipt} />
        <StatCard label="Pending approval" value={String(pendingApproval)} icon={Clock} />
      </div>

      <div className="flex items-center gap-2">
        <SearchInput
          className="max-w-xs"
          placeholder="Search by category or description..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="ml-auto text-[12.5px] text-text-tertiary">
          {filtered.length} of {expenses.length} expenses
        </span>
      </div>

      <Card>
        <DataTable
          columns={columns}
          rows={filtered}
          getRowKey={(r) => r.id}
          emptyLabel={loading ? "Loading expenses..." : "No expenses match your search."}
        />
      </Card>
    </>
  );
}