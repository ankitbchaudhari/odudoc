"use client";

// Cashless desk → pre-auth draft creator.
// Posts to /api/preauth (POST creates a draft). After creation,
// redirects back to /admin/preauth where the request can be submitted
// to the TPA via the inline "Submit" action.

import { useRouter } from "next/navigation";
import { useState } from "react";

const TPAS = [
  { id: "star", name: "Star Health" },
  { id: "icici-lombard", name: "ICICI Lombard" },
  { id: "bajaj-allianz", name: "Bajaj Allianz" },
  { id: "max-bupa", name: "Niva Bupa" },
  { id: "hdfc-ergo", name: "HDFC ERGO" },
  { id: "tata-aig", name: "Tata AIG" },
  { id: "religare", name: "Care Health" },
  { id: "manipal-cigna", name: "Manipal Cigna" },
];

export default function NewPreAuthPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    patientEmail: "",
    patientName: "",
    tpaId: TPAS[0].id,
    policyNumber: "",
    encounterType: "ipd" as "opd" | "ipd" | "surgery" | "emergency",
    diagnosis: "",
    diagnosisCodes: "",
    procedureCodes: "",
    estimatedAmount: "",
    currency: "INR",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/preauth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          patientEmail: form.patientEmail,
          patientName: form.patientName,
          tpaId: form.tpaId,
          policyNumber: form.policyNumber,
          encounterType: form.encounterType,
          diagnosis: form.diagnosis,
          diagnosisCodes: form.diagnosisCodes.split(",").map((s) => s.trim()).filter(Boolean),
          procedureCodes: form.procedureCodes.split(",").map((s) => s.trim()).filter(Boolean),
          estimatedAmount: Number(form.estimatedAmount),
          currency: form.currency,
        }),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || "Failed"); return; }
      router.push("/admin/preauth");
    } finally { setBusy(false); }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">Cashless desk</p>
      <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">New pre-authorization</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Creates a draft. Submit to the TPA from the queue page once you&apos;ve double-checked the details.
      </p>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Patient email">
            <Input value={form.patientEmail} onChange={(v) => setForm({ ...form, patientEmail: v })} />
          </Field>
          <Field label="Patient name">
            <Input value={form.patientName} onChange={(v) => setForm({ ...form, patientName: v })} />
          </Field>
          <Field label="TPA">
            <select value={form.tpaId} onChange={(e) => setForm({ ...form, tpaId: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800">
              {TPAS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Policy number">
            <Input value={form.policyNumber} onChange={(v) => setForm({ ...form, policyNumber: v })} />
          </Field>
          <Field label="Encounter">
            <select value={form.encounterType} onChange={(e) => setForm({ ...form, encounterType: e.target.value as typeof form.encounterType })}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800">
              <option value="opd">OPD</option>
              <option value="ipd">IPD</option>
              <option value="surgery">Surgery</option>
              <option value="emergency">Emergency</option>
            </select>
          </Field>
          <Field label={`Estimated amount (${form.currency})`}>
            <Input value={form.estimatedAmount} onChange={(v) => setForm({ ...form, estimatedAmount: v })} placeholder="50000" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Diagnosis">
              <Input value={form.diagnosis} onChange={(v) => setForm({ ...form, diagnosis: v })} placeholder="e.g. Acute appendicitis" />
            </Field>
          </div>
          <Field label="ICD-10 codes (comma-sep)">
            <Input value={form.diagnosisCodes} onChange={(v) => setForm({ ...form, diagnosisCodes: v })} placeholder="K35.80" />
          </Field>
          <Field label="Procedure codes (comma-sep)">
            <Input value={form.procedureCodes} onChange={(v) => setForm({ ...form, procedureCodes: v })} placeholder="0DTJ4ZZ" />
          </Field>
        </div>

        {error && <p className="mt-3 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{error}</p>}

        <button onClick={submit}
          disabled={busy || !form.patientEmail || !form.patientName || !form.policyNumber || !form.diagnosis || !form.estimatedAmount}
          className="mt-4 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-sm font-bold text-white shadow disabled:opacity-60">
          {busy ? "Saving…" : "Save draft"}
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
function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" />;
}
