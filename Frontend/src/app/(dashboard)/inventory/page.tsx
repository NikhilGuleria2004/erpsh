"use client";

import { useEffect, useState } from "react";
import { Boxes, TriangleAlert, PackageX, IndianRupee } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { apiFetch } from "@/lib/api";
import { formatCompactCurrency, formatDate, formatNumber } from "@/lib/utils";
import type { Product, InventoryMovement } from "@/types";

function stockStatus(stock: number, min: number) {
  if (stock <= 0) return "out_of_stock";
  if (stock <= min) return "low_stock";
  return "in_stock";
}

const movementTone: Record<string, "positive" | "danger" | "neutral"> = {
  purchase: "positive",
  return: "positive",
  sale: "danger",
  damage: "danger",
  adjustment: "neutral",
};

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [prods, txns] = await Promise.all([
          apiFetch.get<Product[]>("/inventory"),
          apiFetch.get<InventoryMovement[]>("/inventory/transactions"),
        ]);
        setProducts(prods);
        setMovements(txns);
      } catch (err) {
        console.error("Failed to load inventory", err);
      } finally {
        setLoading(false);
      }
    };
     
    void load();
  }, []);

  const lowStockCount = products.filter(
    (p) => p.stockQuantity > 0 && p.stockQuantity <= p.minimumStockLevel,
  ).length;
  const outOfStockCount = products.filter((p) => p.stockQuantity <= 0).length;
  const totalValue = products.reduce(
    (sum, p) => sum + p.purchasePrice * p.stockQuantity,
    0,
  );

  const stockColumns: Column<Product>[] = [
    { header: "Product", render: (r) => <span className="font-medium">{r.name}</span> },
    { header: "SKU", render: (r) => <span className="text-text-secondary">{r.sku}</span> },
    { header: "Category", render: (r) => r.category },
    { header: "In stock", align: "right", render: (r) => <span className="tabular-nums">{formatNumber(r.stockQuantity)}</span> },
    { header: "Minimum", align: "right", render: (r) => <span className="tabular-nums text-text-secondary">{r.minimumStockLevel}</span> },
    {
      header: "Status",
      render: (r) => <StatusBadge status={stockStatus(r.stockQuantity, r.minimumStockLevel)} />,
    },
  ];

  const movementColumns: Column<InventoryMovement>[] = [
    { header: "Product", render: (r) => <span className="font-medium">{r.productName}</span> },
    {
      header: "Type",
      render: (r) => (
        <Badge tone={movementTone[r.type]} className="capitalize">
          {r.type}
        </Badge>
      ),
    },
    {
      header: "Quantity",
      align: "right",
      render: (r) => (
        <span className={`tabular-nums ${r.quantity < 0 ? "text-danger" : "text-positive"}`}>
          {r.quantity > 0 ? `+${r.quantity}` : r.quantity}
        </span>
      ),
    },
    { header: "Balance after", align: "right", render: (r) => <span className="tabular-nums">{r.balanceAfter}</span> },
    { header: "Date", render: (r) => formatDate(r.date) },
  ];

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Stock levels and the transaction history behind them."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Tracked products" value={String(products.length)} icon={Boxes} />
        <StatCard label="Low stock" value={String(lowStockCount)} icon={TriangleAlert} />
        <StatCard label="Out of stock" value={String(outOfStockCount)} icon={PackageX} />
        <StatCard label="Inventory value" value={formatCompactCurrency(totalValue)} icon={IndianRupee} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock by product</CardTitle>
        </CardHeader>
        <DataTable
          columns={stockColumns}
          rows={products}
          getRowKey={(r) => r.id}
          emptyLabel={loading ? "Loading products..." : "No products yet."}
        />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent stock movements</CardTitle>
        </CardHeader>
        <DataTable
          columns={movementColumns}
          rows={movements}
          getRowKey={(r) => r.id}
          emptyLabel={loading ? "Loading transactions..." : "No movements yet."}
        />
      </Card>
    </>
  );
}