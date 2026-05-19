"use client";

// Clinician form to request a restricted antibiotic.
// Posts to /api/ams; the approval inbox at /admin/ams is the
// receiving side.

import { useEffect, useState } from "react";

const RESTRICTED = [
  "meropenem", "imipenem", "vancomycin", "linezolid", "daptomycin",
  "tigecycline", "caspofungin", "voriconazole", "colistin",
  "ceftazidime_avibactam", "cefiderocol", "ceftolozane_tazobactam",
  "polymyxin_b", "amphotericin_b_liposomal", "piperacillin_tazobactam",
  "cefepime", "ciprofloxacin", "levofloxacin", "amikacin",
];

export default function AmsRequestPage() {
  const [form, setForm] = useState({
    patientEmail: "",
    patientName: "",
    drug: "meropenem",
    indication: "",
    cultureRef: "",
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ id: string; tier: string; status: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Recent submissions (last 5) so the doctor can see what they've
  // already filed without leaving the page.
  const [recent, setRecent] = useState<Array<{ id: string; drug: string; status: string; createdAt: string }>>([]);
  useEffect(() => {
    fetch("/api/ams").then((r) => r.json()).then((j) => {
      setRecent((j.requests || []).slice(0, 5));
    }).catch(() => {});
  }, [done]);

  const submit = async () => {
    setBusy(true); setError(null); setDone(null);
    try {
      const r = await fetch("/api/ams", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          patientEmail: form.patientEmail,
          patientName: form.patientName,
          drug: form.drug,
          indication: form.indication,
          cultureRef: form.cultureRef || undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || "Failed"); return; }
      setDone({ id: j.request.id, tier: j.request.tier, status: j.request.status });
      setForm({ ...form, indication: "", cultureRef: "" });
    } finally { setBusy(false); }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">Antimicrobial stewardship</p>
      <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">Request a restricted antibiotic</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Tier 2 drugs auto-approve with a captured indication. Tier 3–4 need ID-consultant approval within 72 hours.
      </p>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Patient email">
            <input value={form.patientEmail} onChange={(e) => setForm({ ...form, patientEmail: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </Field>
          <Field label="Patient name">
            <input value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </Field>
          <Field label="Drug">
            <select value={form.drug} onChange={(e) => setForm({ ...form, drug: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800">
              {RESTRICTED.map((d) => <option key={d} value={d}>{d.replace(/_/g, " ")}</option>)}
            </select>
          </Field>
          <Field label="Culture reference (optional)">
            <input value={form.cultureRef} onChange={(e) => setForm({ ...form, cultureRef: e.target.value })}
              placeholder="Lab sample id or report"
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Clinical indication (≥ 10 chars)">
              <textarea value={form.indication} onChange={(e) => setForm({ ...form, indication: e.target.value })}
                rows={3} placeholder="Suspected HAP with sepsis. Empirical broad-spectrum cover pending cultures…"
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </Field>
          </div>
        </div>

        {error && <p className="mt-3 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{error}</p>}
        {done && (
          <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-xs dark:bg-emerald-950/30">
            <strong className="text-emerald-900 dark:text-emerald-100">Submitted.</strong>{" "}
            <span className="text-emerald-800 dark:text-emerald-200">
              Tier {done.tier} · status: <strong>{done.status.replace(/_/g, " ")}</strong>.
              {done.tier === "T2"
                ? " Auto-approved (Tier 2 only requires indication)."
                : " Awaiting ID-consultant approval within 72 hours."}
            </span>
          </div>
        )}

        <button onClick={submit}
          disabled={busy || !form.patientEmail || !form.patientName || form.indication.trim().length < 10}
          className="mt-4 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-sm font-bold text-white shadow disabled:opacity-60">
          {busy ? "Submitting…" : "Submit request"}
        </button>
      </section>

      {recent.length > 0 && (
        <section className="mt-8">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Recent submissions</p>
          <ul className="mt-2 space-y-1">
            {recent.map((r) => (
              <li key={r.id} className="rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800">
                <strong>{r.drug.replace(/_/g, " ")}</strong>{" · "}
                <span className="text-slate-600 dark:text-slate-300">{r.status.replace(/_/g, " ")}</span>{" · "}
                <span className="text-slate-500">{new Date(r.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
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
