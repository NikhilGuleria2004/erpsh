"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { QuickFormModal } from "@/components/forms/QuickFormModal";
import { apiFetch } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { Customer } from "@/types";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const rows = await apiFetch.get<Customer[]>("/customers");
      setCustomers(rows);
    } catch (err) {
      console.error("Failed to load customers", err);
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
      customers.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.email.toLowerCase().includes(query.toLowerCase()),
      ),
    [customers, query],
  );

  const columns: Column<Customer>[] = [
    { header: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
    { header: "Email", render: (r) => <span className="text-text-secondary">{r.email}</span> },
    { header: "Phone", render: (r) => r.phone },
    { header: "Orders", align: "right", render: (r) => r.ordersCount },
    {
      header: "Outstanding balance",
      align: "right",
      render: (r) => (
        <span className={`tabular-nums ${r.outstandingBalance > 0 ? "text-warning" : "text-text-secondary"}`}>
          {formatCurrency(r.outstandingBalance)}
        </span>
      ),
    },
    { header: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  const handleCreate = async (values: Record<string, string>) => {
    await apiFetch.post("/customers", {
      name: values.name,
      email: values.email,
      phone: values.phone,
    });
    await refresh();
  };

  return (
    <>
      <PageHeader
        title="Customers"
        description="Everyone who has bought from the business, and what they still owe."
        actions={
          <QuickFormModal
            triggerLabel="Add customer"
            title="Add customer"
            fields={[
              { name: "name", label: "Full name", placeholder: "e.g. Rahul Sharma", required: true },
              { name: "email", label: "Email", type: "email", placeholder: "name@example.com", required: true },
              { name: "phone", label: "Phone", placeholder: "+91 90000 00000", required: true },
            ]}
            onSubmit={handleCreate}
          />
        }
      />

      <div className="flex items-center gap-2">
        <SearchInput
          className="max-w-xs"
          placeholder="Search by name or email..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="ml-auto text-[12.5px] text-text-tertiary">
          {filtered.length} of {customers.length} customers
        </span>
      </div>

      <Card>
        <DataTable
          columns={columns}
          rows={filtered}
          getRowKey={(r) => r.id}
          emptyLabel={loading ? "Loading customers..." : "No customers match your search."}
        />
      </Card>
    </>
  );
}