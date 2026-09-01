"use client";

import { useEffect, useMemo, useState } from "react";
import { Truck, IndianRupee, Clock, CircleCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { QuickFormModal } from "@/components/forms/QuickFormModal";
import { apiFetch } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PurchaseOrder, Supplier, Product } from "@/types";

export default function PurchasesPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const [o, s, p] = await Promise.all([
        apiFetch.get<PurchaseOrder[]>("/purchases"),
        apiFetch.get<Supplier[]>("/suppliers"),
        apiFetch.get<Product[]>("/products"),
      ]);
      setOrders(o);
      setSuppliers(s);
      setProducts(p);
    } catch (err) {
      console.error("Failed to load purchases", err);
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
      orders.filter(
        (o) =>
          o.id.toLowerCase().includes(query.toLowerCase()) ||
          o.supplierName.toLowerCase().includes(query.toLowerCase()),
      ),
    [orders, query],
  );

  const total = orders.reduce((sum, o) => sum + o.amount, 0);
  const pending = orders.filter(
    (o) => o.status === "pending" || o.status === "confirmed",
  ).length;
  const received = orders.filter((o) => o.status === "received").length;

  const columns: Column<PurchaseOrder>[] = [
    { header: "PO Number", render: (r) => <span className="font-medium">{r.id}</span> },
    { header: "Supplier", render: (r) => r.supplierName },
    { header: "Items", align: "right", render: (r) => r.itemsCount },
    { header: "Amount", align: "right", render: (r) => <span className="tabular-nums">{formatCurrency(r.amount)}</span> },
    { header: "Date", render: (r) => formatDate(r.date) },
    { header: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  const handleCreate = async (values: Record<string, string>) => {
    await apiFetch.post("/purchases", {
      supplierId: values.supplierId,
      items: [
        {
          productId: values.productId,
          quantity: Number(values.quantity),
          unitPrice: Number(values.unitPrice),
        },
      ],
    });
    await refresh();
  };

  return (
    <>
      <PageHeader
        title="Purchases"
        description="Purchase orders placed with suppliers and their receiving status."
        actions={
          <QuickFormModal
            triggerLabel="Create purchase order"
            title="Create purchase order"
            description="Order stock from a supplier."
            fields={[
              {
                name: "supplierId",
                label: "Supplier",
                required: true,
                options: suppliers.map((s) => ({ label: s.companyName, value: s.id })),
              },
              {
                name: "productId",
                label: "Product",
                required: true,
                options: products.map((p) => ({ label: `${p.name} (${p.sku})`, value: p.id })),
              },
              { name: "quantity", label: "Quantity", type: "number", placeholder: "1", required: true },
              { name: "unitPrice", label: "Unit price", type: "number", placeholder: "0", required: true },
            ]}
            onSubmit={handleCreate}
          />
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total purchases" value={formatCurrency(total)} icon={IndianRupee} />
        <StatCard label="Purchase orders" value={String(orders.length)} icon={Truck} />
        <StatCard label="Awaiting receipt" value={String(pending)} icon={Clock} />
        <StatCard label="Fully received" value={String(received)} icon={CircleCheck} />
      </div>

      <div className="flex items-center gap-2">
        <SearchInput
          className="max-w-xs"
          placeholder="Search by PO number or supplier..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="ml-auto text-[12.5px] text-text-tertiary">
          {filtered.length} of {orders.length} orders
        </span>
      </div>

      <Card>
        <DataTable
          columns={columns}
          rows={filtered}
          getRowKey={(r) => r.id}
          emptyLabel={loading ? "Loading purchase orders..." : "No purchase orders match your search."}
        />
      </Card>
    </>
  );
}