"use client";

// Clinician queues a case for M&M review.
// Production flow would auto-fire from the discharge module on
// death / major morbidity; this page is the manual fallback +
// the entry point for near-miss / unexpected-outcome cases.

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewMmCasePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    patientEmail: "",
    patientName: "",
    patientMrn: "",
    kind: "death" as "death" | "major_morbidity" | "near_miss" | "unexpected_outcome",
    eventDate: "",
    primaryDiagnosis: "",
    causeOfDeath: "",
    summary: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/mm-review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          patientMrn: form.patientMrn || undefined,
          causeOfDeath: form.causeOfDeath || undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || "Failed"); return; }
      router.push("/admin/mortality-review");
    } finally { setBusy(false); }
  };

  const isDeath = form.kind === "death";

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-600">Quality · M&amp;M</p>
      <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">Queue a case for review</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Surfaces in the committee&apos;s queue. The chair will assign a meeting slot + presenter, capture the
        discussion, grade preventability, and link any CAPA actions.
      </p>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Patient email">
            <Input value={form.patientEmail} onChange={(v) => setForm({ ...form, patientEmail: v })} />
          </Field>
          <Field label="Patient name">
            <Input value={form.patientName} onChange={(v) => setForm({ ...form, patientName: v })} />
          </Field>
          <Field label="MRN (optional)">
            <Input value={form.patientMrn} onChange={(v) => setForm({ ...form, patientMrn: v })} />
          </Field>
          <Field label="Case kind">
            <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as typeof form.kind })}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800">
              <option value="death">Death</option>
              <option value="major_morbidity">Major morbidity</option>
              <option value="near_miss">Near miss</option>
              <option value="unexpected_outcome">Unexpected outcome</option>
            </select>
          </Field>
          <Field label="Event date">
            <input type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </Field>
          <Field label="Primary diagnosis">
            <Input value={form.primaryDiagnosis} onChange={(v) => setForm({ ...form, primaryDiagnosis: v })} />
          </Field>
          {isDeath && (
            <div className="sm:col-span-2">
              <Field label="Cause of death">
                <Input value={form.causeOfDeath} onChange={(v) => setForm({ ...form, causeOfDeath: v })} />
              </Field>
            </div>
          )}
          <div className="sm:col-span-2">
            <Field label="Summary (committee briefing)">
              <textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })}
                rows={5} placeholder="What happened, in chronological order. Care timeline, key decisions, any deviations from protocol."
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </Field>
          </div>
        </div>

        {error && <p className="mt-3 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{error}</p>}

        <button onClick={submit}
          disabled={busy || !form.patientEmail || !form.patientName || !form.eventDate || !form.primaryDiagnosis || !form.summary}
          className="mt-4 w-full rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 px-4 py-2 text-sm font-bold text-white shadow disabled:opacity-60">
          {busy ? "Queueing…" : "Queue for review"}
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
function Input({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)}
    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" />;
}
