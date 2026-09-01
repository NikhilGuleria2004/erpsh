"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Layers } from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardBody } from "@/components/ui/Card";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Could not sign in. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const doQuickLogin = async (role: "admin" | "manager" | "employee") => {
    setSubmitting(true);
    setError(null);
    const emailForRole =
      role === "admin"
        ? "admin@ledgerly.example"
        : role === "manager"
          ? "manager@ledgerly.example"
          : "employee@ledgerly.example";
    try {
      await login(emailForRole, "ChangeMe123!");
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Could not sign in. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-white">
            <Layers className="h-5 w-5" strokeWidth={2} />
          </div>
          <h1 className="text-[20px] font-semibold text-text-primary">Ledgerly</h1>
        </div>
        <Card>
          <CardBody className="flex flex-col gap-4">
            <div>
              <h2 className="text-[16px] font-semibold text-text-primary">
                Sign in to your account
              </h2>
              <p className="mt-1 text-[13px] text-text-secondary">
                Use the credentials provided by your administrator.
              </p>
            </div>
            <form onSubmit={onSubmit} className="flex flex-col gap-3.5">
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-text-primary">
                  Email
                </span>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-text-primary">
                  Password
                </span>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </label>
              {error && (
                <p className="text-[12.5px] text-danger">{error}</p>
              )}
              <Button type="submit" disabled={submitting}>
                {submitting ? "Signing in..." : "Sign in"}
              </Button>
            </form>
            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <p className="text-[12px] text-text-tertiary">
                Development quick login (uses the seeded demo accounts).
              </p>
              <div className="grid grid-cols-1 gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={submitting}
                  onClick={() => doQuickLogin("admin")}
                  className="w-full"
                >
                  Test as Admin
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={submitting}
                  onClick={() => doQuickLogin("manager")}
                  className="w-full"
                >
                  Test as Manager
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={submitting}
                  onClick={() => doQuickLogin("employee")}
                  className="w-full"
                >
                  Test as Employee
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
        <p className="mt-4 text-center text-[12px] text-text-tertiary">
          Need help? Contact your administrator.
        </p>
        <p className="mt-1 text-center text-[11.5px] text-text-tertiary">
          <Link href="/dashboard" className="hoverunderline">
            Back to dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}