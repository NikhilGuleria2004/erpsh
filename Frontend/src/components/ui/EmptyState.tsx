import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-alt">
        <Icon className="h-4.5 w-4.5 text-text-tertiary" strokeWidth={1.75} />
      </div>
      <p className="text-[13px] font-medium text-text-primary">{title}</p>
      {description && (
        <p className="max-w-xs text-[13px] text-text-secondary">{description}</p>
      )}
    </div>
  );
}
