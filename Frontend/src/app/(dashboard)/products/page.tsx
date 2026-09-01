"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { QuickFormModal } from "@/components/forms/QuickFormModal";
import { apiFetch } from "@/lib/api";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { Product } from "@/types";

function stockTone(stock: number, min: number) {
  if (stock <= 0) return "out_of_stock";
  if (stock <= min) return "low_stock";
  return "in_stock";
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");

  const refresh = async () => {
    try {
      const rows = await apiFetch.get<Product[]>("/products");
      setProducts(rows);
    } catch (err) {
      console.error("Failed to load products", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, []);

  const categories = useMemo(
    () => [
      "All categories",
      ...Array.from(new Set(products.map((p) => p.category))),
    ],
    [products],
  );

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesQuery =
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.sku.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category === "All categories" || p.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [products, query, category]);

  const columns: Column<Product>[] = [
    {
      header: "Product",
      render: (r) => (
        <div>
          <p className="font-medium text-text-primary">{r.name}</p>
          <p className="text-[12px] text-text-tertiary">{r.sku}</p>
        </div>
      ),
    },
    { header: "Category", render: (r) => r.category },
    { header: "Purchase price", align: "right", render: (r) => <span className="tabular-nums">{formatCurrency(r.purchasePrice)}</span> },
    { header: "Selling price", align: "right", render: (r) => <span className="tabular-nums">{formatCurrency(r.sellingPrice)}</span> },
    { header: "Stock", align: "right", render: (r) => <span className="tabular-nums">{formatNumber(r.stockQuantity)} {r.unit}s</span> },
    { header: "Stock status", render: (r) => <StatusBadge status={stockTone(r.stockQuantity, r.minimumStockLevel)} /> },
    { header: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  const handleCreate = async (values: Record<string, string>) => {
    const openingStock = Number(values.openingStock ?? "0") || 0;
    const body = {
      sku: values.sku,
      name: values.name,
      category: values.category,
      brand: values.brand,
      purchasePrice: Number(values.purchasePrice),
      sellingPrice: Number(values.sellingPrice),
      minimumStockLevel: Number(values.minimumStock ?? "0"),
      unit: values.unit || "unit",
      openingStock,
    };
    await apiFetch.post<Product>("/products", body);
    await refresh();
  };

  return (
    <>
      <PageHeader
        title="Products"
        description="Manage the catalog customers buy from and suppliers restock."
        actions={
          <QuickFormModal
            triggerLabel="Add product"
            title="Add product"
            description="Create a new catalog entry."
            fields={[
              { name: "name", label: "Product name", placeholder: "e.g. Dell Inspiron 15", required: true },
              { name: "sku", label: "SKU", placeholder: "e.g. LAP-DELL-001", required: true },
              { name: "category", label: "Category", placeholder: "e.g. Laptops", required: true },
              { name: "brand", label: "Brand", placeholder: "e.g. Dell", required: true },
              { name: "purchasePrice", label: "Purchase price", type: "number", placeholder: "0", required: true },
              { name: "sellingPrice", label: "Selling price", type: "number", placeholder: "0", required: true },
              { name: "minimumStock", label: "Minimum stock", type: "number", placeholder: "0" },
              { name: "unit", label: "Unit", placeholder: "unit" },
              { name: "openingStock", label: "Opening stock", type: "number", placeholder: "0" },
            ]}
            onSubmit={handleCreate}
          />
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          className="max-w-xs"
          placeholder="Search by name or SKU..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-text-primary focus:border-accent focus:outline-none"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span className="ml-auto text-[12.5px] text-text-tertiary">
          {filtered.length} of {products.length} products
        </span>
      </div>

      <Card>
        <DataTable
          columns={columns}
          rows={filtered}
          getRowKey={(r) => r.id}
          emptyLabel={loading ? "Loading products..." : "No products match your search."}
        />
      </Card>
    </>
  );
}