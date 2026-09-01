"use client";

import { usePathname } from "next/navigation";
import { Bell, Menu, LogOut, Moon, Sun } from "lucide-react";
import { PRIMARY_NAV, SECONDARY_NAV } from "@/lib/constants";
import { SearchInput } from "@/components/ui/Input";
import { MobileNav } from "@/components/layout/MobileNav";
import { useAuth } from "@/lib/useAuth";
import { useTheme } from "@/lib/useTheme";
import { useState } from "react";

function usePageTitle(): string {
  const pathname = usePathname();
  const all = [...PRIMARY_NAV, ...SECONDARY_NAV];
  const match = all.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  return match?.label ?? "Overview";
}

export function Header() {
  const title = usePageTitle();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggleTheme, ready } = useTheme();

  const initials = user
    ? user.name
        .split(/\s+/)
        .map((p) => p[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "—";

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 md:px-6">
      <button
        onClick={() => setMobileNavOpen(true)}
        className="rounded-md p-1.5 text-text-secondary hover:bg-surface-alt md:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-4.5 w-4.5" />
      </button>

      <h1 className="shrink-0 text-[15px] font-semibold text-text-primary">{title}</h1>

      <div className="ml-2 hidden max-w-xs flex-1 sm:block">
        <SearchInput placeholder="Search products, orders, customers..." />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="rounded-md p-1.5 text-text-secondary hover:bg-surface-alt hover:text-text-primary"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {ready && theme === "dark" ? (
            <Sun className="h-4.5 w-4.5" strokeWidth={1.75} />
          ) : (
            <Moon className="h-4.5 w-4.5" strokeWidth={1.75} />
          )}
        </button>
        <button
          className="relative rounded-md p-1.5 text-text-secondary hover:bg-surface-alt hover:text-text-primary"
          aria-label="Notifications"
        >
          <Bell className="h-4.5 w-4.5" strokeWidth={1.75} />
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-danger" />
        </button>
        <div
          className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent"
          aria-label={user?.name ?? "User"}
        >
          {initials}
        </div>
        <button
          onClick={logout}
          className="rounded-md p-1.5 text-text-secondary hover:bg-surface-alt hover:text-text-primary"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>

      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
    </header>
  );
}