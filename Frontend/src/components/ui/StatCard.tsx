import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "./Card";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: { value: string; direction: "up" | "down" };
}

export function StatCard({ label, value, icon: Icon, trend }: StatCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <span className="text-[13px] text-text-secondary">{label}</span>
        <Icon className="h-4 w-4 text-text-tertiary" strokeWidth={1.75} />
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <span className="text-[22px] font-semibold tabular-nums tracking-tight text-text-primary">
          {value}
        </span>
        {trend && (
          <span
            className={cn(
              "mb-0.5 text-[12px] font-medium tabular-nums",
              trend.direction === "up" ? "text-positive" : "text-danger"
            )}
          >
            {trend.direction === "up" ? "+" : "-"}
            {trend.value}
          </span>
        )}
      </div>
    </Card>
  );
}
