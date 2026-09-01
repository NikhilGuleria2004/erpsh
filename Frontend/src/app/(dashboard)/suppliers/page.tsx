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
import type { Supplier } from "@/types";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const rows = await apiFetch.get<Supplier[]>("/suppliers");
      setSuppliers(rows);
    } catch (err) {
      console.error("Failed to load suppliers", err);
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
      suppliers.filter(
        (s) =>
          s.companyName.toLowerCase().includes(query.toLowerCase()) ||
          s.contactPerson.toLowerCase().includes(query.toLowerCase()),
      ),
    [suppliers, query],
  );

  const columns: Column<Supplier>[] = [
    { header: "Company", render: (r) => <span className="font-medium">{r.companyName}</span> },
    { header: "Contact person", render: (r) => r.contactPerson },
    { header: "Email", render: (r) => <span className="text-text-secondary">{r.email}</span> },
    { header: "Phone", render: (r) => r.phone },
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
    await apiFetch.post("/suppliers", {
      companyName: values.companyName,
      contactPerson: values.contactPerson,
      email: values.email,
      phone: values.phone,
    });
    await refresh();
  };

  return (
    <>
      <PageHeader
        title="Suppliers"
        description="Vendors the business buys stock from, and what's owed to them."
        actions={
          <QuickFormModal
            triggerLabel="Add supplier"
            title="Add supplier"
            fields={[
              { name: "companyName", label: "Company name", placeholder: "e.g. ABC Electronics", required: true },
              { name: "contactPerson", label: "Contact person", placeholder: "e.g. Suresh Rao", required: true },
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
          placeholder="Search by company or contact..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="ml-auto text-[12.5px] text-text-tertiary">
          {filtered.length} of {suppliers.length} suppliers
        </span>
      </div>

      <Card>
        <DataTable
          columns={columns}
          rows={filtered}
          getRowKey={(r) => r.id}
          emptyLabel={loading ? "Loading suppliers..." : "No suppliers match your search."}
        />
      </Card>
    </>
  );
}