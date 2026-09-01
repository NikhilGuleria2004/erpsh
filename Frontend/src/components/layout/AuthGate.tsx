"use client";

import { useAuth } from "@/lib/useAuth";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();
  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg text-text-tertiary">
        <p className="text-[13px]">Loading…</p>
      </div>
    );
  }
  return <>{children}</>;
}