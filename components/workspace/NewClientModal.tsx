"use client";

import { useEffect, useState } from "react";
import { createClient, type ClientCreatePayload } from "@/lib/api";

interface NewClientModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function NewClientModal({ open, onClose, onCreated }: NewClientModalProps) {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setName("");
    setIndustry("");
    setContactName("");
    setContactEmail("");
    setNotes("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Client name is required");
      return;
    }
    setLoading(true);
    try {
      const payload: ClientCreatePayload = {
        name: trimmed,
        industry: industry.trim() || undefined,
        contact_name: contactName.trim() || undefined,
        contact_email: contactEmail.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      await createClient(payload);
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create client");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-client-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 id="new-client-title" className="text-lg font-semibold text-slate-900">
            New Client
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Add a client to your organization workspace
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          <Field label="Client Name" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="Acme Insurance Brokers"
              required
              disabled={loading}
            />
          </Field>

          <Field label="Industry">
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className={inputClass}
              placeholder="Commercial lines"
              disabled={loading}
            />
          </Field>

          <Field label="Primary Contact Name">
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className={inputClass}
              disabled={loading}
            />
          </Field>

          <Field label="Primary Contact Email">
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className={inputClass}
              disabled={loading}
            />
          </Field>

          <Field label="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${inputClass} min-h-[5rem] resize-y`}
              rows={3}
              disabled={loading}
            />
          </Field>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:bg-slate-50";
