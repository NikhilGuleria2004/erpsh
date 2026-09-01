"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { apiFetch, ApiError } from "@/lib/api";
import { getStoredUser } from "@/lib/api";

interface BusinessSettings {
  name: string;
  taxNumber?: string;
  address?: string;
  email?: string;
  phone?: string;
  currency: string;
  updatedAt: string;
}

interface NotificationPrefs {
  lowStock: boolean;
  overdueInvoices: boolean;
  receivedPOs: boolean;
  supplierPayments: boolean;
}

export default function SettingsPage() {
  const user = getStoredUser();

  const [businessForm, setBusinessForm] = useState<BusinessSettings | null>(
    null,
  );
  const [businessError, setBusinessError] = useState<string | null>(null);
  const [businessSaving, setBusinessSaving] = useState(false);
  const [businessMessage, setBusinessMessage] = useState<string | null>(null);

  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsMessage, setPrefsMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const s = await apiFetch.get<BusinessSettings>("/settings/business");
        setBusinessForm(s);
      } catch (err) {
        setBusinessError(
          err instanceof ApiError
            ? `${err.code}: ${err.message}`
            : "Could not load business settings.",
        );
      }
      try {
        const p = await apiFetch.get<NotificationPrefs>(
          "/settings/notifications",
        );
        setPrefs(p);
      } catch {
        // Prefs are best-effort; the toggle section will just stay hidden.
      }
    };
    void load();
  }, []);

  const isAdmin = user?.role === "admin";

  const saveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessForm) return;
    setBusinessSaving(true);
    setBusinessMessage(null);
    try {
      const updated = await apiFetch.patch<BusinessSettings>(
        "/settings/business",
        businessForm,
      );
      setBusinessForm(updated);
      setBusinessMessage("Saved.");
    } catch (err) {
      setBusinessMessage(
        err instanceof ApiError ? err.message : "Save failed.",
      );
    } finally {
      setBusinessSaving(false);
    }
  };

  const togglePref = (key: keyof NotificationPrefs) => {
    if (!prefs) return;
    setPrefs({ ...prefs, [key]: !prefs[key] });
  };

  const savePrefs = async () => {
    if (!prefs) return;
    setPrefsSaving(true);
    setPrefsMessage(null);
    try {
      const updated = await apiFetch.patch<NotificationPrefs>(
        "/settings/notifications",
        prefs,
      );
      setPrefs(updated);
      setPrefsMessage("Saved.");
    } catch (err) {
      setPrefsMessage(err instanceof ApiError ? err.message : "Save failed.");
    } finally {
      setPrefsSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Settings"
        description="Business profile and per-user notification preferences."
      />

      <Card>
        <CardBody className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-text-primary">
            Business profile
          </h2>
          {businessError ? (
            <p className="text-[13px] text-danger">{businessError}</p>
          ) : !businessForm ? (
            <p className="text-[13px] text-text-tertiary">Loading...</p>
          ) : !isAdmin ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ReadOnlyField label="Business name" value={businessForm.name} />
              <ReadOnlyField label="Currency" value={businessForm.currency} />
              <ReadOnlyField
                label="Tax number"
                value={businessForm.taxNumber ?? ""}
              />
              <ReadOnlyField
                label="Phone"
                value={businessForm.phone ?? ""}
              />
              <ReadOnlyField label="Email" value={businessForm.email ?? ""} />
              <ReadOnlyField
                label="Address"
                value={businessForm.address ?? ""}
              />
            </div>
          ) : (
            <form onSubmit={saveBusiness} className="flex flex-col gap-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Business name">
                  <Input
                    value={businessForm.name}
                    onChange={(e) =>
                      setBusinessForm({ ...businessForm, name: e.target.value })
                    }
                    required
                  />
                </Field>
                <Field label="Currency">
                  <Input
                    value={businessForm.currency}
                    onChange={(e) =>
                      setBusinessForm({
                        ...businessForm,
                        currency: e.target.value.toUpperCase(),
                      })
                    }
                    required
                    maxLength={8}
                  />
                </Field>
                <Field label="Tax number">
                  <Input
                    value={businessForm.taxNumber ?? ""}
                    onChange={(e) =>
                      setBusinessForm({
                        ...businessForm,
                        taxNumber: e.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Phone">
                  <Input
                    value={businessForm.phone ?? ""}
                    onChange={(e) =>
                      setBusinessForm({
                        ...businessForm,
                        phone: e.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Email">
                  <Input
                    type="email"
                    value={businessForm.email ?? ""}
                    onChange={(e) =>
                      setBusinessForm({
                        ...businessForm,
                        email: e.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Address">
                  <Input
                    value={businessForm.address ?? ""}
                    onChange={(e) =>
                      setBusinessForm({
                        ...businessForm,
                        address: e.target.value,
                      })
                    }
                  />
                </Field>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={businessSaving}
                >
                  {businessSaving ? "Saving..." : "Save business settings"}
                </Button>
                {businessMessage && (
                  <span className="text-[13px] text-text-tertiary">
                    {businessMessage}
                  </span>
                )}
              </div>
            </form>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-text-primary">
            Notifications
          </h2>
          {!prefs ? (
            <p className="text-[13px] text-text-tertiary">Loading...</p>
          ) : (
            <>
              <p className="text-[13px] text-text-tertiary">
                Choose which alerts you receive. Settings apply to your account
                only.
              </p>
              <div className="flex flex-col gap-2">
                <PrefRow
                  label="Low stock"
                  description="Alert when a product falls below its minimum stock level."
                  checked={prefs.lowStock}
                  onChange={() => togglePref("lowStock")}
                />
                <PrefRow
                  label="Overdue invoices"
                  description="Alert when a customer invoice becomes overdue."
                  checked={prefs.overdueInvoices}
                  onChange={() => togglePref("overdueInvoices")}
                />
                <PrefRow
                  label="Received purchase orders"
                  description="Alert when a purchase order is fully received."
                  checked={prefs.receivedPOs}
                  onChange={() => togglePref("receivedPOs")}
                />
                <PrefRow
                  label="Supplier payments"
                  description="Alert when a supplier payment is recorded."
                  checked={prefs.supplierPayments}
                  onChange={() => togglePref("supplierPayments")}
                />
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="primary"
                  disabled={prefsSaving}
                  onClick={savePrefs}
                >
                  {prefsSaving ? "Saving..." : "Save notification preferences"}
                </Button>
                {prefsMessage && (
                  <span className="text-[13px] text-text-tertiary">
                    {prefsMessage}
                  </span>
                )}
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-text-primary">{label}</span>
      {children}
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <Field label={label}>
      <Input value={value} readOnly />
    </Field>
  );
}

function PrefRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-md border border-border p-3 hover:bg-surface-alt cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 accent-accent"
      />
      <span className="flex flex-col">
        <span className="text-[13px] font-medium text-text-primary">
          {label}
        </span>
        <span className="text-[12px] text-text-tertiary">{description}</span>
      </span>
    </label>
  );
}
