"use client";

import { useState } from "react";

const MODULES = [
  "Patient Management",
  "IPD/OPD",
  "Lab Management",
  "Pharmacy",
  "Billing & Accounting",
  "Inventory",
  "Surgery / OT",
  "Radiology & DICOM",
  "Telemedicine",
  "AI & Voice Consultation",
];

const BEDS = ["<20", "20-50", "50-200", "200+"];

export default function DemoRequestForm() {
  const [form, setForm] = useState({
    organizationName: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    country: "",
    bedsRange: "",
    currentSystem: "",
    message: "",
  });
  const [modules, setModules] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleModule = (m: string) => {
    setModules((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.organizationName || !form.contactName || !form.contactEmail) {
      setError("Please fill organization name, your name and email.");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/enterprise-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, interestedModules: modules }),
      });
      if (r.ok) {
        setDone(true);
      } else {
        const data = await r.json().catch(() => ({}));
        setError(data?.error || "Could not submit. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-3xl text-white">
          ✓
        </div>
        <h3 className="text-xl font-bold text-gray-900">Thanks — we&apos;ll reach out within 24 hours.</h3>
        <p className="mt-2 text-sm text-gray-600">
          Our solutions team will email {form.contactEmail || "you"} to schedule the demo.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600">
            Hospital / Organization name *
          </label>
          <input
            type="text"
            required
            value={form.organizationName}
            onChange={(e) => setForm({ ...form, organizationName: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600">
            Your name *
          </label>
          <input
            type="text"
            required
            value={form.contactName}
            onChange={(e) => setForm({ ...form, contactName: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600">
            Work email *
          </label>
          <input
            type="email"
            required
            value={form.contactEmail}
            onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600">Phone</label>
          <input
            type="tel"
            value={form.contactPhone}
            onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600">Country</label>
          <input
            type="text"
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600">Beds / capacity</label>
          <div className="flex flex-wrap gap-2">
            {BEDS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setForm({ ...form, bedsRange: b })}
                className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                  form.bedsRange === b
                    ? "border-indigo-500 bg-indigo-500 text-white"
                    : "border-gray-300 bg-white text-gray-600 hover:border-indigo-300"
                }`}
              >
                {b} beds
              </button>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600">
            Which modules interest you?
          </label>
          <div className="flex flex-wrap gap-2">
            {MODULES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => toggleModule(m)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  modules.includes(m)
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-gray-300 bg-white text-gray-600 hover:border-indigo-300"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600">
            Current HMS / system (if any)
          </label>
          <input
            type="text"
            value={form.currentSystem}
            onChange={(e) => setForm({ ...form, currentSystem: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            placeholder="e.g. eHospital, paper records, in-house tool"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600">Anything else?</label>
          <textarea
            rows={3}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            placeholder="Timeline, integrations, specific pain points..."
          />
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-indigo-700 disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Request demo"}
      </button>
      <p className="mt-3 text-center text-xs text-gray-400">
        We&apos;ll never share your information.
      </p>
    </form>
  );
}
