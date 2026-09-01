import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { Inbox } from "lucide-react";

export interface Column<T> {
  header: string;
  align?: "left" | "right" | "center";
  width?: string;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  emptyLabel?: string;
}

export function DataTable<T>({ columns, rows, getRowKey, emptyLabel }: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="Nothing here yet"
        description={emptyLabel ?? "No records match your current filters."}
      />
    );
  }

  return (
    <div className="scroll-thin overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th
                key={col.header}
                style={{ width: col.width }}
                className={cn(
                  "whitespace-nowrap px-5 py-2.5 text-[12px] font-medium text-text-tertiary",
                  col.align === "right" && "text-right",
                  col.align === "center" && "text-center"
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={getRowKey(row)}
              className="border-b border-border last:border-0 hover:bg-surface-alt/60"
            >
              {columns.map((col) => (
                <td
                  key={col.header}
                  className={cn(
                    "whitespace-nowrap px-5 py-3 text-[13px] text-text-primary",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center"
                  )}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
