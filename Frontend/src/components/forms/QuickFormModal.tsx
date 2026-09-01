"use client";

import { useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

export interface QuickFormField {
  name: string;
  label: string;
  placeholder?: string;
  type?: "text" | "number" | "date" | "email";
  required?: boolean;
  options?: { label: string; value: string }[];
}

interface QuickFormModalProps {
  triggerLabel: string;
  title: string;
  description?: string;
  fields: QuickFormField[];
  triggerIcon?: ReactNode;
  onSubmit?: (values: Record<string, string>) => Promise<void> | void;
  submitLabel?: string;
}

export function QuickFormModal({
  triggerLabel,
  title,
  description,
  fields,
  triggerIcon = <Plus className="h-3.5 w-3.5" />,
  onSubmit,
  submitLabel = "Save",
}: QuickFormModalProps) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setValues({});
    setError(null);
    setSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!onSubmit) {
      setOpen(false);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(values);
      reset();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        {triggerIcon}
        {triggerLabel}
      </Button>
      <Modal
        open={open}
        onClose={() => {
          reset();
          setOpen(false);
        }}
        title={title}
        description={description}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                reset();
                setOpen(false);
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="quick-form"
              disabled={submitting}
            >
              {submitting ? "Saving..." : submitLabel}
            </Button>
          </>
        }
      >
        <form id="quick-form" className="flex flex-col gap-3.5" onSubmit={handleSubmit}>
          {fields.map((field) => (
            <label key={field.name} className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-text-primary">
                {field.label}
                {field.required ? "" : ""}
              </span>
              {field.options ? (
                <select
                  value={values[field.name] ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [field.name]: e.target.value }))
                  }
                  required={field.required}
                  className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-text-primary focus:border-accent focus:outline-none"
                >
                  <option value="" disabled>
                    Select...
                  </option>
                  {field.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  type={field.type ?? "text"}
                  placeholder={field.placeholder}
                  value={values[field.name] ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [field.name]: e.target.value }))
                  }
                  required={field.required}
                />
              )}
            </label>
          ))}
          {error && (
            <p className="text-[12.5px] text-danger">{error}</p>
          )}
          {!onSubmit && (
            <p className="text-[12px] text-text-tertiary">
              This form is a UI placeholder — nothing is saved yet.
            </p>
          )}
        </form>
      </Modal>
    </>
  );
}