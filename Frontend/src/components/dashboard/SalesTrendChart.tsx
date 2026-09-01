import { formatCompactCurrency } from "@/lib/utils";

interface DataPoint {
  label: string;
  value: number;
}

export function SalesTrendChart({ data }: { data: DataPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[190px] items-center justify-center text-[13px] text-text-tertiary">
        No sales data yet.
      </div>
    );
  }
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex h-[190px] items-end gap-3 px-1">
      {data.map((point) => {
        const heightPct = Math.max((point.value / max) * 100, 4);
        return (
          <div key={point.label} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-[140px] w-full items-end">
              <div
                className="w-full rounded-t-sm bg-accent-soft transition-[height] hover:bg-accent/25"
                style={{ height: `${heightPct}%` }}
                title={formatCompactCurrency(point.value)}
              >
                <div className="h-full w-full rounded-t-sm border-t-2 border-accent" />
              </div>
            </div>
            <span className="text-[11.5px] text-text-tertiary">{point.label}</span>
          </div>
        );
      })}
    </div>
  );
}