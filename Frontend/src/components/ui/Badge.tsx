import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "positive" | "warning" | "danger" | "accent";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-surface-alt text-text-secondary border-border",
  positive: "bg-positive-soft text-positive border-transparent",
  warning: "bg-warning-soft text-warning border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
  accent: "bg-accent-soft text-accent border-transparent",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[12px] font-medium leading-5",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}

/** Maps a domain status string (order status, invoice status, etc.) to a Badge tone + label. */
const STATUS_MAP: Record<string, { label: string; tone: Tone }> = {
  active: { label: "Active", tone: "positive" },
  inactive: { label: "Inactive", tone: "neutral" },

  draft: { label: "Draft", tone: "neutral" },
  pending: { label: "Pending", tone: "warning" },
  confirmed: { label: "Confirmed", tone: "accent" },
  partially_received: { label: "Partially received", tone: "warning" },
  received: { label: "Received", tone: "positive" },
  fulfilled: { label: "Fulfilled", tone: "positive" },
  cancelled: { label: "Cancelled", tone: "danger" },

  unpaid: { label: "Unpaid", tone: "warning" },
  partially_paid: { label: "Partially paid", tone: "warning" },
  paid: { label: "Paid", tone: "positive" },
  overdue: { label: "Overdue", tone: "danger" },

  completed: { label: "Completed", tone: "positive" },
  failed: { label: "Failed", tone: "danger" },

  recorded: { label: "Recorded", tone: "positive" },
  pending_approval: { label: "Pending approval", tone: "warning" },

  in_stock: { label: "In stock", tone: "positive" },
  low_stock: { label: "Low stock", tone: "warning" },
  out_of_stock: { label: "Out of stock", tone: "danger" },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const entry = STATUS_MAP[status] ?? { label: status, tone: "neutral" as Tone };
  return (
    <Badge tone={entry.tone} className={className}>
      {entry.label}
    </Badge>
  );
}
