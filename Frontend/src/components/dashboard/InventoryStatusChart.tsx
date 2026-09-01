const SEGMENTS = [
  { key: "inStock" as const, label: "In stock", colorClass: "bg-positive" },
  { key: "lowStock" as const, label: "Low stock", colorClass: "bg-warning" },
  { key: "outOfStock" as const, label: "Out of stock", colorClass: "bg-danger" },
];

export function InventoryStatusChart({
  data,
}: {
  data: { inStock: number; lowStock: number; outOfStock: number };
}) {
  const total = data.inStock + data.lowStock + data.outOfStock;
  if (total === 0) {
    return (
      <div className="flex h-[80px] items-center justify-center text-[13px] text-text-tertiary">
        No products yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-alt">
        {SEGMENTS.map((seg) => {
          const count = data[seg.key];
          const pct = (count / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={seg.key}
              className={seg.colorClass}
              style={{ width: `${pct}%` }}
              title={`${seg.label}: ${count}`}
            />
          );
        })}
      </div>
      <div className="flex flex-col gap-2.5">
        {SEGMENTS.map((seg) => (
          <div key={seg.key} className="flex items-center justify-between text-[12.5px]">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${seg.colorClass}`} />
              <span className="text-text-secondary">{seg.label}</span>
            </div>
            <span className="tabular-nums text-text-primary">{data[seg.key]} products</span>
          </div>
        ))}
      </div>
    </div>
  );
}