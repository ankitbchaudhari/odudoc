"use client";

// Doctor creates a multi-sitting procedure plan for a patient.
// Optionally schedules the initial sittings inline.

import { useRouter } from "next/navigation";
import { useState } from "react";

const CATEGORY_OPTIONS = [
  { v: "dental_rct", l: "Dental — Root canal" },
  { v: "dental_orthodontic", l: "Dental — Orthodontic" },
  { v: "dental_implant", l: "Dental — Implant" },
  { v: "oncology_chemo", l: "Oncology — Chemo" },
  { v: "oncology_radio", l: "Oncology — Radio" },
  { v: "physio_rehab", l: "Physio — Rehab" },
  { v: "skin_laser", l: "Skin — Laser" },
  { v: "fertility_ivf", l: "Fertility — IVF" },
  { v: "psychiatry_therapy", l: "Psychiatry — Therapy" },
  { v: "other", l: "Other" },
];

export default function NewProcedurePlanPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    patientEmail: "",
    patientName: "",
    category: "dental_rct",
    title: "",
    plannedSittings: 3,
    packageFeeUsd: 0,
    perSittingFeeUsd: 0,
    notes: "",
  });
  const [sittings, setSittings] = useState<string[]>(["", "", ""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateSittingsCount = (n: number) => {
    setForm({ ...form, plannedSittings: n });
    setSittings((cur) => {
      const out = [...cur];
      while (out.length < n) out.push("");
      while (out.length > n) out.pop();
      return out;
    });
  };

  const submit = async () => {
    setBusy(true); setError(null);
    try {
      const initialSittings = sittings.filter(Boolean).map((s) => ({ scheduledFor: s }));
      const r = await fetch("/api/procedure-plans", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          patientEmail: form.patientEmail,
          patientName: form.patientName,
          category: form.category,
          title: form.title,
          plannedSittings: form.plannedSittings,
          packageFeeUsd: form.packageFeeUsd,
          perSittingFeeUsd: form.perSittingFeeUsd || undefined,
          notes: form.notes || undefined,
          initialSittings: initialSittings.length ? initialSittings : undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || "Failed"); return; }
      router.push("/dashboard/procedure-plans");
    } finally { setBusy(false); }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Care plans</p>
      <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">New procedure plan</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Multi-sitting bundle for the patient. Schedule the first few sittings inline; you can add more later.
      </p>

      <section className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Patient email">
            <Input v={form.patientEmail} onChange={(v) => setForm({ ...form, patientEmail: v })} />
          </Field>
          <Field label="Patient name">
            <Input v={form.patientName} onChange={(v) => setForm({ ...form, patientName: v })} />
          </Field>
          <Field label="Category">
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800">
              {CATEGORY_OPTIONS.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
            </select>
          </Field>
          <Field label="Total sittings">
            <input type="number" min={1} max={50} value={form.plannedSittings}
              onChange={(e) => updateSittingsCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Title">
              <Input v={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="e.g. RCT 16 (upper right molar)" />
            </Field>
          </div>
          <Field label="Package fee (USD)">
            <input type="number" min={0} value={form.packageFeeUsd} onChange={(e) => setForm({ ...form, packageFeeUsd: Number(e.target.value) || 0 })}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </Field>
          <Field label="Per-sitting fee (USD, optional)">
            <input type="number" min={0} value={form.perSittingFeeUsd} onChange={(e) => setForm({ ...form, perSittingFeeUsd: Number(e.target.value) || 0 })}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </Field>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Schedule sittings (optional)</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {sittings.map((s, i) => (
              <input
                key={i}
                type="datetime-local"
                value={s}
                onChange={(e) => setSittings((cur) => cur.map((x, idx) => idx === i ? e.target.value : x))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            ))}
          </div>
        </div>

        {error && <p className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{error}</p>}

        <button onClick={submit}
          disabled={busy || !form.patientEmail || !form.patientName || !form.title}
          className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-600 px-4 py-2 text-sm font-bold text-white shadow disabled:opacity-60">
          {busy ? "Creating…" : "Create plan"}
        </button>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}
function Input({ v, onChange, placeholder }: { v: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input value={v} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" />;
}
