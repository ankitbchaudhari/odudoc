"use client";

// Patient digital consent — grant cross-clinic access, view active consents, revoke.

import { useCallback, useEffect, useState } from "react";

type ConsentScope = "demographics_only" | "summary" | "full_chart" | "psychiatric";

interface Consent {
  id: string;
  sourceOwnerEmail: string;
  grantedToOwnerEmail: string;
  patientId: string;
  scope: ConsentScope;
  purpose?: string;
  expiresAt?: string;
  revokedAt?: string;
  createdAt: string;
}

const SCOPE_LABEL: Record<ConsentScope, string> = {
  demographics_only: "Demographics only",
  summary: "Summary chart",
  full_chart: "Full chart",
  psychiatric: "Psychiatric / sensitive",
};

export default function ConsentPage() {
  const [consents, setConsents] = useState<Consent[]>([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    sourceOwnerEmail: "",
    grantedToOwnerEmail: "",
    patientId: "",
    scope: "summary" as ConsentScope,
    purpose: "",
    expiresAt: "",
  });

  const load = useCallback(async () => {
    const r = await fetch("/api/emr/consent", { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setConsents(d.consents || []);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    await fetch("/api/emr/consent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ ...form, grantedToOwnerEmail: "", purpose: "" });
    await load(); setBusy(false);
  };

  const revoke = async (id: string) => {
    if (!confirm("Revoke this access? The other clinic loses visibility immediately.")) return;
    setBusy(true);
    await fetch(`/api/emr/consent?id=${id}`, { method: "DELETE" });
    await load(); setBusy(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/40 to-cyan-50/40">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 p-8 text-white shadow-xl">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">Privacy · You're in control</p>
          <h1 className="mt-1 text-3xl font-bold">My data sharing</h1>
          <p className="mt-2 max-w-md text-sm text-white/90">
            By default, your records stay private to the clinic that
            holds them. Grant another institution access here when you
            need a second opinion, transfer, or referral.
          </p>
        </div>

        <form onSubmit={submit} className="mt-6 rounded-3xl border border-white/60 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Grant new access</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Inp label="Source clinic (current)" required value={form.sourceOwnerEmail} onChange={(v) => setForm({ ...form, sourceOwnerEmail: v })} placeholder="dr.source@clinic.com" />
            <Inp label="Recipient clinic" required value={form.grantedToOwnerEmail} onChange={(v) => setForm({ ...form, grantedToOwnerEmail: v })} placeholder="dr.referral@hospital.com" />
            <Inp label="Patient ID" required value={form.patientId} onChange={(v) => setForm({ ...form, patientId: v })} />
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">Scope</span>
              <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value as ConsentScope })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                {(Object.keys(SCOPE_LABEL) as ConsentScope[]).map((s) => (
                  <option key={s} value={s}>{SCOPE_LABEL[s]}</option>
                ))}
              </select>
            </label>
            <Inp label="Purpose" value={form.purpose} onChange={(v) => setForm({ ...form, purpose: v })} placeholder="Second opinion / transfer" />
            <Inp label="Expires (optional)" type="datetime-local" value={form.expiresAt} onChange={(v) => setForm({ ...form, expiresAt: v })} />
          </div>
          <button type="submit" disabled={busy} className="mt-4 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:-translate-y-0.5 disabled:opacity-50">
            {busy ? "Recording…" : "Grant access"}
          </button>
        </form>

        <section className="mt-6 rounded-3xl border border-white/60 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Active & past consents</h3>
          <div className="mt-3 space-y-2">
            {consents.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 p-6 text-center text-xs text-slate-500">
                No consents on file yet.
              </p>
            ) : consents.map((c) => (
              <div key={c.id} className={`rounded-2xl border p-4 ${c.revokedAt ? "border-slate-200 bg-slate-50/50" : "border-emerald-200 bg-emerald-50/40"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {c.sourceOwnerEmail} → <span className="text-emerald-700">{c.grantedToOwnerEmail}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600">
                      Patient {c.patientId} · {SCOPE_LABEL[c.scope]}
                      {c.purpose && <> · {c.purpose}</>}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Granted {new Date(c.createdAt).toLocaleString()}
                      {c.expiresAt && <> · expires {new Date(c.expiresAt).toLocaleString()}</>}
                      {c.revokedAt && <> · revoked {new Date(c.revokedAt).toLocaleString()}</>}
                    </p>
                  </div>
                  {!c.revokedAt && (
                    <button onClick={() => revoke(c.id)} className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50">
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Inp(p: { label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">{p.label}{p.required && <span className="ml-0.5 text-rose-500">*</span>}</span>
      <input type={p.type || "text"} required={p.required} value={p.value} onChange={(e) => p.onChange(e.target.value)} placeholder={p.placeholder} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
    </label>
  );
}
