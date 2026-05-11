"use client";

// Org-admin dashboard quick-add strip. Surfaces the four actions an
// org admin reaches for daily — add staff, admit a patient, schedule
// an appointment, raise an invoice — right on the dashboard so they
// don't have to dive into the sidebar. "Add staff" opens an inline
// modal because that's the fastest "I just hired Dr. Sharma" path;
// the other three deep-link to their dedicated pages where the full
// multi-step flow makes sense.

import Link from "next/link";
import { useState } from "react";

interface QuickAddPanelProps {
  /** Re-fetch the dashboard after a successful create so the KPI
   *  cards reflect the new staff/admission immediately. */
  onChange: () => void;
}

export default function QuickAddPanel({ onChange }: QuickAddPanelProps) {
  const [staffOpen, setStaffOpen] = useState(false);
  const actions: Array<{
    label: string;
    desc: string;
    icon: string;
    tone: string;
    onClick?: () => void;
    href?: string;
  }> = [
    {
      label: "Add staff",
      desc: "Doctor, nurse, technician…",
      icon: "👥",
      tone: "from-emerald-500 to-teal-600",
      onClick: () => setStaffOpen(true),
    },
    {
      label: "Admit patient",
      desc: "Open IPD admission",
      icon: "🛏️",
      tone: "from-rose-500 to-pink-600",
      href: "/admin/admissions",
    },
    {
      label: "Schedule appointment",
      desc: "OPD slot for today",
      icon: "📅",
      tone: "from-sky-500 to-indigo-600",
      href: "/admin/appointments",
    },
    {
      label: "Raise invoice",
      desc: "Bill for a visit",
      icon: "🧾",
      tone: "from-amber-500 to-orange-600",
      href: "/admin/invoices",
    },
  ];

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">
          Quick add
        </h2>
        <span className="text-[11px] text-slate-400">
          The four things you do most
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map((a) => {
          const body = (
            <div
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${a.tone} p-4 text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-xl`}
            >
              <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/15 blur-2xl" />
              <div className="relative flex items-start gap-3">
                <span className="text-2xl">{a.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold leading-tight">{a.label}</p>
                  <p className="mt-0.5 text-[11px] text-white/85">{a.desc}</p>
                </div>
                <span className="self-end text-white/80 transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </div>
            </div>
          );
          if (a.href) {
            return (
              <Link key={a.label} href={a.href} className="block">
                {body}
              </Link>
            );
          }
          return (
            <button
              key={a.label}
              type="button"
              onClick={a.onClick}
              className="block w-full text-left"
            >
              {body}
            </button>
          );
        })}
      </div>
      {staffOpen && (
        <AddStaffModal
          onClose={() => setStaffOpen(false)}
          onSaved={() => {
            setStaffOpen(false);
            onChange();
          }}
        />
      )}
    </div>
  );
}

const STAFF_ROLES = [
  "doctor",
  "resident",
  "nurse",
  "technician",
  "pharmacist",
  "radiographer",
  "admin",
  "housekeeping",
  "other",
] as const;

function AddStaffModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    role: "doctor" as (typeof STAFF_ROLES)[number],
    specialty: "",
    department: "",
    phone: "",
    email: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setErr("Please enter a first and last name.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/hospital/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(json.error || "Failed to create staff member.");
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-4 text-white">
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/15 blur-2xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">
                Quick add · Org admin
              </p>
              <h3 className="mt-1 text-lg font-bold">Add staff member</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/20"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="space-y-4 px-6 py-5">
          {err && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {err}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name*">
              <input
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="qa-inp"
                required
              />
            </Field>
            <Field label="Last name*">
              <input
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="qa-inp"
                required
              />
            </Field>
            <Field label="Role">
              <select
                value={form.role}
                onChange={(e) =>
                  setForm({ ...form, role: e.target.value as typeof form.role })
                }
                className="qa-inp capitalize"
              >
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r} className="capitalize">
                    {r}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Specialty">
              <input
                value={form.specialty}
                onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                className="qa-inp"
                placeholder="Cardiology / ER…"
              />
            </Field>
            <Field label="Department">
              <input
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="qa-inp"
              />
            </Field>
            <Field label="Phone">
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="qa-inp"
              />
            </Field>
            <div className="col-span-2">
              <Field label="Email">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="qa-inp"
                  placeholder="staff@example.com"
                />
              </Field>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Need to set per-module access (e.g. only Physiotherapy)? Open{" "}
            <Link
              href="/admin/staff"
              className="font-semibold text-emerald-700 underline"
            >
              Medical Staff
            </Link>{" "}
            after creating.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-gradient-to-r from-emerald-600 to-teal-700 px-5 py-2 text-sm font-semibold text-white shadow transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Create staff"}
          </button>
        </div>
        <style jsx>{`
          :global(.qa-inp) {
            width: 100%;
            padding: 0.5rem 0.75rem;
            border: 1px solid #cbd5e1;
            border-radius: 0.5rem;
            font-size: 0.875rem;
            background: white;
            outline: none;
          }
          :global(.qa-inp:focus) {
            border-color: #10b981;
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.18);
          }
        `}</style>
      </form>
    </div>
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
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}
