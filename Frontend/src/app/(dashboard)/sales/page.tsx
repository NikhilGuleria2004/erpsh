"use client";

import { useEffect, useMemo, useState } from "react";
import { ShoppingCart, TrendingUp, Package, CircleCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { QuickFormModal } from "@/components/forms/QuickFormModal";
import { apiFetch } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { SalesOrder, Customer, Product } from "@/types";

export default function SalesPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const [s, c, p] = await Promise.all([
        apiFetch.get<SalesOrder[]>("/sales"),
        apiFetch.get<Customer[]>("/customers"),
        apiFetch.get<Product[]>("/products"),
      ]);
      setOrders(s);
      setCustomers(c);
      setProducts(p);
    } catch (err) {
      console.error("Failed to load sales", err);
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
          o.customerName.toLowerCase().includes(query.toLowerCase()),
      ),
    [orders, query],
  );

  const total = orders.reduce((sum, o) => sum + o.amount, 0);
  const fulfilled = orders.filter((o) => o.status === "fulfilled").length;
  const avgOrder = orders.length ? Math.round(total / orders.length) : 0;

  const columns: Column<SalesOrder>[] = [
    { header: "Order ID", render: (r) => <span className="font-medium">{r.id}</span> },
    { header: "Customer", render: (r) => r.customerName },
    { header: "Items", align: "right", render: (r) => r.itemsCount },
    { header: "Amount", align: "right", render: (r) => <span className="tabular-nums">{formatCurrency(r.amount)}</span> },
    { header: "Date", render: (r) => formatDate(r.date) },
    { header: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  const handleCreate = async (values: Record<string, string>) => {
    await apiFetch.post("/sales", {
      customerId: values.customerId,
      items: [{ productId: values.productId, quantity: Number(values.quantity) }],
    });
    await refresh();
  };

  return (
    <>
      <PageHeader
        title="Sales"
        description="Orders placed by customers and their fulfillment status."
        actions={
          <QuickFormModal
            triggerLabel="Create sale"
            title="Create sale"
            description="Start a new sales order for a customer."
            fields={[
              {
                name: "customerId",
                label: "Customer",
                required: true,
                options: customers.map((c) => ({ label: c.name, value: c.id })),
              },
              {
                name: "productId",
                label: "Product",
                required: true,
                options: products.map((p) => ({ label: `${p.name} (${p.sku})`, value: p.id })),
              },
              { name: "quantity", label: "Quantity", type: "number", placeholder: "1", required: true },
            ]}
            onSubmit={handleCreate}
          />
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total sales" value={formatCurrency(total)} icon={TrendingUp} />
        <StatCard label="Orders" value={String(orders.length)} icon={ShoppingCart} />
        <StatCard label="Fulfilled" value={String(fulfilled)} icon={CircleCheck} />
        <StatCard label="Average order value" value={formatCurrency(avgOrder)} icon={Package} />
      </div>

      <div className="flex items-center gap-2">
        <SearchInput
          className="max-w-xs"
          placeholder="Search by order ID or customer..."
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
          emptyLabel={loading ? "Loading orders..." : "No orders match your search."}
        />
      </Card>
    </>
  );
}