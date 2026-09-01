"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/constants";

export function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors",
        isActive
          ? "bg-accent-soft text-accent"
          : "text-text-secondary hover:bg-surface-alt hover:text-text-primary",
        collapsed && "justify-center px-2"
      )}
    >
      <Icon
        className={cn("h-4 w-4 shrink-0", isActive ? "text-accent" : "text-text-tertiary group-hover:text-text-primary")}
        strokeWidth={1.75}
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}
