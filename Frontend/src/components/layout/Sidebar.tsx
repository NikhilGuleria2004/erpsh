"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronsLeft, ChevronsRight, Layers } from "lucide-react";
import { PRIMARY_NAV, SECONDARY_NAV, COMPANY_NAME } from "@/lib/constants";
import { NavLink } from "@/components/navigation/NavLink";
import { useAuth } from "@/lib/useAuth";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();

  const initials = user
    ? user.name
        .split(/\s+/)
        .map((p) => p[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "—";

  const isAdmin = user?.role === "admin";

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-150 md:flex",
        collapsed ? "w-[64px]" : "w-[228px]"
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent text-white">
          <Layers className="h-4 w-4" strokeWidth={2} />
        </div>
        {!collapsed && (
          <Link href="/dashboard" className="text-[14px] font-semibold text-text-primary">
            {COMPANY_NAME}
          </Link>
        )}
      </div>

      <nav className="scroll-thin flex flex-1 flex-col gap-0.5 overflow-y-auto px-2.5 py-3">
        {PRIMARY_NAV.map((item) => (
          <NavLink key={item.href} item={item} collapsed={collapsed} />
        ))}
      </nav>

      <div className="flex flex-col gap-0.5 border-t border-border px-2.5 py-3">
        {SECONDARY_NAV.map((item) => (
          <NavLink key={item.href} item={item} collapsed={collapsed} />
        ))}

        <div
          className={cn(
            "mt-2 flex items-center gap-2.5 rounded-md border border-border px-2.5 py-2",
            collapsed && "justify-center px-2"
          )}
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">
            {initials}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-medium text-text-primary">
                {user?.name ?? "—"}
              </p>
              <p className="truncate text-[11.5px] text-text-tertiary">
                {isAdmin ? "Admin" : user?.role === "manager" ? "Manager" : "Employee"}
              </p>
            </div>
          )}
        </div>

        {!collapsed && (
          <button
            onClick={logout}
            className="mt-1 flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[12.5px] text-text-tertiary hover:bg-surface-alt hover:text-text-primary"
          >
            Sign out
          </button>
        )}

        <button
          onClick={() => setCollapsed((v) => !v)}
          className={cn(
            "mt-1 flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[12.5px] text-text-tertiary hover:bg-surface-alt hover:text-text-primary",
            collapsed && "justify-center px-2"
          )}
        >
          {collapsed ? <ChevronsRight className="h-3.5 w-3.5" /> : <ChevronsLeft className="h-3.5 w-3.5" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}