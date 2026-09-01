"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Boxes, Receipt, CircleDollarSign, Users, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { apiFetch, ApiError } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

interface SummaryData {
  totalSales: number;
  totalExpenses: number;
  netProfit: number;
  inventoryValue: number;
  outstandingPayments: number;
  activeCustomers: number;
}

interface ReportCard {
  title: string;
  description: string;
  icon: typeof TrendingUp;
  statLabel: string;
  statValue: string;
}

export default function ReportsPage() {
  const [cards, setCards] = useState<ReportCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const d = await apiFetch.get<SummaryData>("/reports/summary");
        setCards([
          {
            title: "Sales report",
            description: "Revenue broken down by day, product, category, and customer.",
            icon: TrendingUp,
            statLabel: "All-time total",
            statValue: formatCurrency(d.totalSales),
          },
          {
            title: "Inventory report",
            description: "Current stock levels, valuation, and slow-moving products.",
            icon: Boxes,
            statLabel: "Inventory value",
            statValue: formatCurrency(d.inventoryValue),
          },
          {
            title: "Expense report",
            description: "Operating costs grouped by category over any date range.",
            icon: Receipt,
            statLabel: "All-time total",
            statValue: formatCurrency(d.totalExpenses),
          },
          {
            title: "Profit report",
            description: "Revenue minus cost of goods and operating expenses.",
            icon: CircleDollarSign,
            statLabel: "Net profit",
            statValue: formatCurrency(d.netProfit),
          },
          {
            title: "Customer report",
            description: "Purchase frequency, lifetime value, and outstanding balances.",
            icon: Users,
            statLabel: "Active customers",
            statValue: formatCurrency(d.activeCustomers).replace("₹", ""),
          },
        ]);
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          setError("You don't have permission to view reports.");
        } else {
          setError("Could not load reports.");
        }
        console.error(err);
      }
    };
     
    void load();
  }, []);

  return (
    <>
      <PageHeader
        title="Reports"
        description="Pick a report to see business performance from a different angle."
      />

      {error ? (
        <p className="text-[13px] text-text-tertiary">{error}</p>
      ) : !cards ? (
        <p className="text-[13px] text-text-tertiary">Loading reports...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((report) => {
            const Icon = report.icon;
            return (
              <Card
                key={report.title}
                className="group cursor-pointer transition-colors hover:border-border-strong"
              >
                <CardBody className="flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-soft">
                      <Icon className="h-4.5 w-4.5 text-accent" strokeWidth={1.75} />
                    </div>
                    <ArrowRight className="h-4 w-4 text-text-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-text-secondary" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-semibold text-text-primary">{report.title}</h3>
                    <p className="mt-1 text-[13px] text-text-secondary">{report.description}</p>
                  </div>
                  <div className="mt-1 border-t border-border pt-3">
                    <p className="text-[11.5px] text-text-tertiary">{report.statLabel}</p>
                    <p className="text-[16px] font-semibold tabular-nums text-text-primary">
                      {report.statValue}
                    </p>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}