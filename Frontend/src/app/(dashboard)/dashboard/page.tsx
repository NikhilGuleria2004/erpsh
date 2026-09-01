"use client";

import { useEffect, useState } from "react";
import { Wallet, Receipt, TrendingUp, ShoppingCart, Boxes, CircleDollarSign } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { SalesTrendChart } from "@/components/dashboard/SalesTrendChart";
import { CategoryBreakdown } from "@/components/dashboard/CategoryBreakdown";
import { InventoryStatusChart } from "@/components/dashboard/InventoryStatusChart";
import { apiFetch, ApiError } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { SalesOrder, PurchaseOrder, Product } from "@/types";

interface DashboardData {
  kpis: {
    totalSales: number;
    totalExpenses: number;
    netProfit: number;
    totalOrders: number;
    inventoryValue: number;
    outstandingPayments: number;
  };
  salesTrend: { label: string; value: number }[];
  salesByCategory: { label: string; value: number }[];
  inventoryStatus: { inStock: number; lowStock: number; outOfStock: number };
  recentSales: SalesOrder[];
  recentPurchases: PurchaseOrder[];
  lowStockProducts: Product[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const d = await apiFetch.get<DashboardData>("/dashboard");
        setData(d);
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          setError("You don't have permission to view the dashboard.");
        } else {
          setError("Could not load dashboard.");
        }
        console.error(err);
      }
    };
     
    void load();
  }, []);

  if (error) {
    return (
      <>
        <PageHeader title="Overview" description={error} />
      </>
    );
  }

  if (!data) {
    return (
      <>
        <PageHeader
          title="Overview"
          description="A snapshot of sales, inventory, and cash flow across the business."
        />
        <p className="text-[13px] text-text-tertiary">Loading dashboard...</p>
      </>
    );
  }

  const { kpis, salesTrend, salesByCategory, inventoryStatus, recentSales, recentPurchases, lowStockProducts } = data;

  const salesColumns: Column<SalesOrder>[] = [
    { header: "Order", render: (r) => <span className="font-medium">{r.id}</span> },
    { header: "Customer", render: (r) => r.customerName },
    { header: "Amount", align: "right", render: (r) => <span className="tabular-nums">{formatCurrency(r.amount)}</span> },
    { header: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  const purchaseColumns: Column<PurchaseOrder>[] = [
    { header: "PO Number", render: (r) => <span className="font-medium">{r.id}</span> },
    { header: "Supplier", render: (r) => r.supplierName },
    { header: "Amount", align: "right", render: (r) => <span className="tabular-nums">{formatCurrency(r.amount)}</span> },
    { header: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  const lowStockColumns: Column<Product>[] = [
    { header: "Product", render: (r) => <span className="font-medium">{r.name}</span> },
    { header: "SKU", render: (r) => <span className="text-text-secondary">{r.sku}</span> },
    { header: "Stock left", align: "right", render: (r) => <span className="tabular-nums text-danger">{r.stockQuantity}</span> },
    { header: "Minimum", align: "right", render: (r) => <span className="tabular-nums text-text-secondary">{r.minimumStockLevel}</span> },
  ];

  return (
    <>
      <PageHeader
        title="Overview"
        description="A snapshot of sales, inventory, and cash flow across the business."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total sales" value={formatCurrency(kpis.totalSales)} icon={TrendingUp} />
        <StatCard label="Total expenses" value={formatCurrency(kpis.totalExpenses)} icon={Receipt} />
        <StatCard label="Net profit" value={formatCurrency(kpis.netProfit)} icon={CircleDollarSign} />
        <StatCard label="Orders" value={String(kpis.totalOrders)} icon={ShoppingCart} />
        <StatCard label="Inventory value" value={formatCurrency(kpis.inventoryValue)} icon={Boxes} />
        <StatCard label="Outstanding payments" value={formatCurrency(kpis.outstandingPayments)} icon={Wallet} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Sales over time</CardTitle>
            <span className="text-[12.5px] text-text-tertiary">Last 6 months</span>
          </CardHeader>
          <CardBody>
            <SalesTrendChart data={salesTrend} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales by category</CardTitle>
          </CardHeader>
          <CardBody>
            <CategoryBreakdown data={salesByCategory} />
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Recent sales</CardTitle>
          </CardHeader>
          <DataTable columns={salesColumns} rows={recentSales} getRowKey={(r) => r.id} />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory status</CardTitle>
          </CardHeader>
          <CardBody>
            <InventoryStatusChart data={inventoryStatus} />
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Low-stock products</CardTitle>
          </CardHeader>
          <DataTable columns={lowStockColumns} rows={lowStockProducts} getRowKey={(r) => r.id} />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent purchase orders</CardTitle>
          </CardHeader>
          <DataTable columns={purchaseColumns} rows={recentPurchases} getRowKey={(r) => r.id} />
        </Card>
      </div>
    </>
  );
}