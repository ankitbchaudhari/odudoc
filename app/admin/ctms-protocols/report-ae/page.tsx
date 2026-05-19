"use client";

// Investigator reports an adverse event against a trial subject.
// Severity ≥ 4 is auto-flagged as SAE → the 24-hour sponsor
// notification clock starts ticking.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Protocol { id: string; protocolNumber: string; title: string }

export default function ReportAePage() {
  const router = useRouter();
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [form, setForm] = useState({
    subjectId: "",
    protocolId: "",
    observedOn: "",
    description: "",
    severity: 1 as 1 | 2 | 3 | 4 | 5,
    causality: "possible" as "unrelated" | "unlikely" | "possible" | "probable" | "definite",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ctms/protocols?activeOnly=true")
      .then((r) => r.json())
      .then((j) => {
        setProtocols(j.protocols || []);
        if (j.protocols?.length && !form.protocolId) {
          setForm((f) => ({ ...f, protocolId: j.protocols[0].id }));
        }
      })
      .catch(() => {});
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  const submit = async () => {
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/ctms/adverse-events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || "Failed"); return; }
      router.push("/admin/ctms-protocols");
    } finally { setBusy(false); }
  };

  const sae = form.severity >= 4;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">CTMS · Adverse event</p>
      <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">Report an adverse event</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        CTCAE grade 1–5. Grade 4–5 (life-threatening / fatal) auto-flags as SAE — sponsor + medical monitor
        must be notified within 24 hours.
      </p>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Subject ID">
            <Input value={form.subjectId} onChange={(v) => setForm({ ...form, subjectId: v })} placeholder="Trial-issued, not EMR" />
          </Field>
          <Field label="Protocol">
            <select value={form.protocolId} onChange={(e) => setForm({ ...form, protocolId: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
              disabled={protocols.length === 0}>
              {protocols.length === 0 ? (
                <option value="">No active protocols</option>
              ) : (
                protocols.map((p) => <option key={p.id} value={p.id}>{p.protocolNumber} — {p.title}</option>)
              )}
            </select>
          </Field>
          <Field label="Observed on">
            <input type="datetime-local" value={form.observedOn} onChange={(e) => setForm({ ...form, observedOn: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </Field>
          <Field label="Causality">
            <select value={form.causality} onChange={(e) => setForm({ ...form, causality: e.target.value as typeof form.causality })}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800">
              <option value="unrelated">Unrelated</option>
              <option value="unlikely">Unlikely</option>
              <option value="possible">Possible</option>
              <option value="probable">Probable</option>
              <option value="definite">Definite</option>
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="CTCAE severity grade">
              <div className="flex gap-2">
                {([1, 2, 3, 4, 5] as const).map((g) => (
                  <button key={g} type="button" onClick={() => setForm({ ...form, severity: g })}
                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold ${
                      form.severity === g
                        ? g >= 4 ? "bg-rose-600 text-white" : g >= 3 ? "bg-amber-500 text-white" : "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}>
                    Grade {g}
                  </button>
                ))}
              </div>
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Event description">
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </Field>
          </div>
        </div>

        {sae && (
          <div className="mt-3 rounded-lg border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900 dark:border-rose-700 dark:bg-rose-950/30 dark:text-rose-100">
            ⚠ <strong>This will be flagged as a Serious Adverse Event.</strong> Notify sponsor + medical
            monitor within 24 hours of submission.
          </div>
        )}

        {error && <p className="mt-3 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{error}</p>}

        <button onClick={submit}
          disabled={busy || !form.subjectId || !form.protocolId || !form.observedOn || !form.description}
          className="mt-4 w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2 text-sm font-bold text-white shadow disabled:opacity-60">
          {busy ? "Submitting…" : sae ? "Submit (SAE — sponsor will be paged)" : "Submit AE"}
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
