import { formatCompactCurrency } from "@/lib/utils";

export function CategoryBreakdown({
  data,
}: {
  data: { label: string; value: number }[];
}) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[120px] items-center justify-center text-[13px] text-text-tertiary">
        No category sales yet.
      </div>
    );
  }
  const max = Math.max(...data.map((c) => c.value), 1);

  return (
    <div className="flex flex-col gap-3.5">
      {data.map((cat) => (
        <div key={cat.label} className="flex items-center gap-3">
          <span className="w-[108px] shrink-0 truncate text-[12.5px] text-text-secondary">
            {cat.label}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-alt">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${(cat.value / max) * 100}%` }}
            />
          </div>
          <span className="w-16 shrink-0 text-right text-[12.5px] tabular-nums text-text-primary">
            {formatCompactCurrency(cat.value)}
          </span>
        </div>
      ))}
    </div>
  );
}