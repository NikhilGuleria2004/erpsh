"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X, Layers } from "lucide-react";
import { PRIMARY_NAV, SECONDARY_NAV, COMPANY_NAME } from "@/lib/constants";
import { NavLink } from "@/components/navigation/NavLink";

export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex md:hidden">
      <button
        aria-label="Close navigation"
        onClick={onClose}
        className="absolute inset-0 bg-black/30"
      />
      <div className="relative flex h-full w-[240px] flex-col bg-surface">
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <Link href="/dashboard" onClick={onClose} className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-white">
              <Layers className="h-4 w-4" strokeWidth={2} />
            </div>
            <span className="text-[14px] font-semibold text-text-primary">{COMPANY_NAME}</span>
          </Link>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-text-tertiary hover:bg-surface-alt">
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav onClick={onClose} className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2.5 py-3">
          {PRIMARY_NAV.map((item) => (
            <NavLink key={item.href} item={item} collapsed={false} />
          ))}
        </nav>
        <div onClick={onClose} className="border-t border-border px-2.5 py-3">
          {SECONDARY_NAV.map((item) => (
            <NavLink key={item.href} item={item} collapsed={false} />
          ))}
        </div>
      </div>
    </div>
  );
}
