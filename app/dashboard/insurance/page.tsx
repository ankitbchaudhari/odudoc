"use client";

// Patient insurance hub. Three sections:
//   1. My policies (add / edit / set primary)
//   2. Coverage estimator — pick a procedure + plan, see sticker
//      price + insurer pays vs patient pays
//   3. My pre-auths — status of in-flight cashless requests

import { useCallback, useEffect, useMemo, useState } from "react";

type RoomCategory = "general_ward" | "twin_sharing" | "single_ac" | "deluxe" | "icu";

interface TpaEntry { id: string; name: string; shortCode: string; kind: "tpa" | "insurer"; preauthSlaHours: number }
interface Policy {
  id: string; userId: string; tpaId: string;
  memberId: string; planName?: string;
  sumInsuredRupees?: number; cumulativeBonusPct?: number;
  validUntil?: string; groupHolder?: string; isPrimary: boolean;
}
interface ProcedureTariff {
  code: string; name: string; category: string;
  tariffRupees: number; losDays?: number; icd10?: string;
  hasSubLimit?: boolean; waitingPeriodMonths?: number;
}
interface RoomCap { category: RoomCategory; capPctPerDay: number; label: string }
interface Estimate {
  procedure: ProcedureTariff;
  grossRupees: number; netRupees: number;
  insurerPaysRupees: number; patientPaysRupees: number;
  warnings: Array<{ severity: "block" | "warn" | "info"; message: string }>;
  breakdown: Array<{ label: string; amount: number }>;
  confidence: number;
}
interface Preauth {
  id: string; status: string; procedureName: string;
  tpaId: string; memberId: string;
  estimateRupees: { gross: number; net: number; insurerPays: number; patientPays: number };
  approvedAmountRupees?: number; tpaReference?: string; tpaNote?: string;
  proposedAdmissionDate?: string;
  organizationId: string; updatedAt: string;
}

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
  submitted: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  approved_with_query: "bg-yellow-100 text-yellow-800",
  rejected: "bg-rose-100 text-rose-800",
  cancelled: "bg-slate-200 text-slate-600 dark:text-slate-300",
};

function fmtINR(n: number) { return `₹${Math.round(n).toLocaleString("en-IN")}`; }

export default function InsurancePage() {
  const [registry, setRegistry] = useState<TpaEntry[]>([]);
  const [country, setCountry] = useState<string | null>(null);
  const [currency, setCurrency] = useState<{ code: string; symbol: string; locale: string } | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [procedures, setProcedures] = useState<ProcedureTariff[]>([]);
  const [rooms, setRooms] = useState<RoomCap[]>([]);
  const [preauths, setPreauths] = useState<Preauth[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ tpaId: "", memberId: "", planName: "", sumInsuredRupees: "", validUntil: "", groupHolder: "" });
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Estimator state
  const [estPolicyId, setEstPolicyId] = useState<string>("");
  const [estProc, setEstProc] = useState<string>("");
  const [estRoom, setEstRoom] = useState<RoomCategory | "">("");
  const [estPreEx, setEstPreEx] = useState(false);
  const [estPolicyAge, setEstPolicyAge] = useState("18");
  const [estCoPay, setEstCoPay] = useState("");
  const [est, setEst] = useState<Estimate | null>(null);

  const load = useCallback(async () => {
    const [r1, r2, r3] = await Promise.all([
      fetch("/api/insurance/policies", { cache: "no-store" }),
      fetch("/api/insurance/estimate", { cache: "no-store" }),
      fetch("/api/insurance/preauth?view=patient", { cache: "no-store" }),
    ]);
    if (r1.ok) {
      const d = await r1.json();
      setPolicies(d.policies || []);
      setRegistry(d.registry || []);
      setCountry(d.country || null);
      setCurrency(d.currency || null);
    }
    if (r2.ok) {
      const d = await r2.json();
      setProcedures(d.procedures || []);
      setRooms(d.roomCategories || []);
    }
    if (r3.ok) setPreauths((await r3.json()).preauths || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addPolicy = async () => {
    if (!form.tpaId || !form.memberId.trim()) return;
    const r = await fetch("/api/insurance/policies", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tpaId: form.tpaId,
        memberId: form.memberId,
        planName: form.planName || undefined,
        sumInsuredRupees: form.sumInsuredRupees ? Number(form.sumInsuredRupees) : undefined,
        validUntil: form.validUntil || undefined,
        groupHolder: form.groupHolder || undefined,
      }),
    });
    if (r.ok) {
      setToast({ kind: "ok", text: "Policy added." });
      setShowAdd(false);
      setForm({ tpaId: "", memberId: "", planName: "", sumInsuredRupees: "", validUntil: "", groupHolder: "" });
      await load();
    } else {
      setToast({ kind: "err", text: "Add failed." });
    }
  };

  const setPrimary = async (id: string) => {
    const r = await fetch(`/api/insurance/policies/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPrimary: true }),
    });
    if (r.ok) { setToast({ kind: "ok", text: "Primary updated." }); await load(); }
  };

  const removePolicy = async (id: string) => {
    if (!confirm("Remove this policy?")) return;
    const r = await fetch(`/api/insurance/policies/${id}`, { method: "DELETE" });
    if (r.ok) { setToast({ kind: "ok", text: "Removed." }); await load(); }
  };

  const tpaName = (id: string) => registry.find((t) => t.id === id)?.name || id;

  const estimate = async () => {
    if (!estProc) return;
    const policy = policies.find((p) => p.id === estPolicyId);
    if (!policy?.sumInsuredRupees) {
      setToast({ kind: "err", text: "Select a policy with a sum-insured." });
      return;
    }
    const r = await fetch("/api/insurance/estimate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        procedureCode: estProc,
        sumInsuredRupees: policy.sumInsuredRupees,
        roomCategory: estRoom || undefined,
        preExisting: estPreEx,
        policyAgeMonths: estPolicyAge ? Number(estPolicyAge) : undefined,
        coPayPct: estCoPay ? Number(estCoPay) : undefined,
      }),
    });
    if (r.ok) setEst((await r.json()).estimate);
  };

  const procByCategory = useMemo(() => {
    const map = new Map<string, ProcedureTariff[]>();
    for (const p of procedures) {
      const k = p.category.toUpperCase();
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(p);
    }
    return map;
  }, [procedures]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {toast && (
        <div className={`mb-4 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${toast.kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="text-xs font-semibold underline">Dismiss</button>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Insurance & Cashless</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Link your health-insurance policies, estimate coverage before a procedure, and track your cashless pre-auth status — no upfront cash if your hospital is empanelled with your insurer.
        </p>
      </div>

      {/* ── Policies ──────────────────────────────────── */}
      <section className="mb-8 rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">My policies</h2>
          <button onClick={() => setShowAdd(true)} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white">+ Add policy</button>
        </div>
        {policies.length === 0 ? (
          <p className="rounded-lg bg-slate-50 dark:bg-slate-900 p-4 text-sm text-slate-500 dark:text-slate-400">No policies linked yet. Add your insurance card details so hospitals can run cashless on your behalf.</p>
        ) : (
          <ul className="space-y-2">
            {policies.map((p) => (
              <li key={p.id} className={`rounded-xl border p-4 ${p.isPrimary ? "border-indigo-300 bg-indigo-50/40" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {tpaName(p.tpaId)}
                      {p.isPrimary && <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-700">Primary</span>}
                    </p>
                    <p className="font-mono text-xs text-slate-500 dark:text-slate-400">Member ID {p.memberId}</p>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                      {p.planName && <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5">{p.planName}</span>}
                      {p.sumInsuredRupees && <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-emerald-800">SI {fmtINR(p.sumInsuredRupees)}</span>}
                      {p.validUntil && <span className="rounded-md bg-amber-100 px-2 py-0.5 text-amber-800">Valid till {new Date(p.validUntil).toLocaleDateString()}</span>}
                      {p.groupHolder && <span className="text-slate-400">via {p.groupHolder}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    {!p.isPrimary && <button onClick={() => setPrimary(p.id)} className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">Set primary</button>}
                    <button onClick={() => removePolicy(p.id)} className="rounded-md border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-600">Remove</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Coverage estimator ────────────────────────────── */}
      <section className="mb-8 rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-slate-100">Coverage estimator</h2>
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">Get a sticker price before any procedure. Final numbers come from the TPA after pre-auth — this is the upfront estimate.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <F label="Policy">
            <select value={estPolicyId} onChange={(e) => setEstPolicyId(e.target.value)} className="form-input">
              <option value="">Pick a policy…</option>
              {policies.map((p) => <option key={p.id} value={p.id}>{tpaName(p.tpaId)} — {p.memberId} ({p.sumInsuredRupees ? fmtINR(p.sumInsuredRupees) : "no SI"})</option>)}
            </select>
          </F>
          <F label="Procedure">
            <select value={estProc} onChange={(e) => setEstProc(e.target.value)} className="form-input">
              <option value="">Pick a procedure…</option>
              {Array.from(procByCategory.entries()).map(([cat, list]) => (
                <optgroup key={cat} label={cat}>
                  {list.map((p) => <option key={p.code} value={p.code}>{p.name} — {fmtINR(p.tariffRupees)}</option>)}
                </optgroup>
              ))}
            </select>
          </F>
          <F label="Room category (optional)">
            <select value={estRoom} onChange={(e) => setEstRoom(e.target.value as RoomCategory | "")} className="form-input">
              <option value="">—</option>
              {rooms.map((r) => <option key={r.category} value={r.category}>{r.label}</option>)}
            </select>
          </F>
          <F label="Policy age (months)"><input className="form-input" value={estPolicyAge} onChange={(e) => setEstPolicyAge(e.target.value)} /></F>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input type="checkbox" checked={estPreEx} onChange={(e) => setEstPreEx(e.target.checked)} />
            Pre-existing condition declared
          </label>
          <F label="Co-pay % (optional)"><input className="form-input" value={estCoPay} onChange={(e) => setEstCoPay(e.target.value)} placeholder="e.g. 20" /></F>
        </div>
        <button onClick={estimate} disabled={!estProc || !estPolicyId} className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Estimate</button>

        {est && (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-900 p-4">
              <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Total bill (gross)</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-slate-100">{fmtINR(est.grossRupees)}</p>
              {est.netRupees !== est.grossRupees && <p className="text-[11px] text-emerald-700">After hospital discount: {fmtINR(est.netRupees)}</p>}
            </div>
            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="text-[11px] uppercase tracking-wider text-emerald-700">Insurer pays</p>
              <p className="mt-1 text-2xl font-extrabold text-emerald-900">{fmtINR(est.insurerPaysRupees)}</p>
            </div>
            <div className="rounded-xl bg-rose-50 p-4">
              <p className="text-[11px] uppercase tracking-wider text-rose-700">You pay (out of pocket)</p>
              <p className="mt-1 text-2xl font-extrabold text-rose-900">{fmtINR(est.patientPaysRupees)}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Confidence: {Math.round(est.confidence * 100)}%</p>
            </div>
            {est.warnings.length > 0 && (
              <div className="sm:col-span-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                {est.warnings.map((w, i) => (
                  <p key={i} className={`text-sm ${w.severity === "block" ? "text-rose-800" : "text-amber-800"}`}>
                    {w.severity === "block" ? "🚫" : "⚠"} {w.message}
                  </p>
                ))}
              </div>
            )}
            <div className="sm:col-span-3 rounded-xl bg-white dark:bg-slate-900 p-4 ring-1 ring-slate-200 dark:ring-slate-800">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Breakdown</p>
              <ul className="space-y-1 text-sm">
                {est.breakdown.map((b, i) => (
                  <li key={i} className="flex justify-between border-b border-slate-100 py-1">
                    <span className="text-slate-700 dark:text-slate-300">{b.label}</span>
                    <span className={`font-mono font-semibold ${b.amount < 0 ? "text-emerald-700" : "text-slate-900 dark:text-slate-100"}`}>{b.amount < 0 ? "−" : ""}{fmtINR(Math.abs(b.amount))}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* ── Pre-auths ────────────────────────────────── */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-slate-100">My pre-authorizations</h2>
        {preauths.length === 0 ? (
          <p className="rounded-lg bg-slate-50 dark:bg-slate-900 p-4 text-sm text-slate-500 dark:text-slate-400">No pre-auths yet. When a hospital files one for you, it shows up here.</p>
        ) : (
          <ul className="space-y-2">
            {preauths.map((p) => (
              <li key={p.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{p.procedureName}</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {tpaName(p.tpaId)} · Member {p.memberId} · Updated {new Date(p.updatedAt).toLocaleDateString()}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Estimate: {fmtINR(p.estimateRupees.gross)} gross · Insurer {fmtINR(p.estimateRupees.insurerPays)} · You {fmtINR(p.estimateRupees.patientPays)}
                    </p>
                    {p.approvedAmountRupees !== undefined && <p className="mt-1 text-xs font-semibold text-emerald-700">✓ Approved: {fmtINR(p.approvedAmountRupees)} · TPA ref {p.tpaReference}</p>}
                    {p.tpaNote && <p className="mt-1 text-xs italic text-slate-600 dark:text-slate-300">&ldquo;{p.tpaNote}&rdquo;</p>}
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${STATUS_COLOR[p.status]}`}>{p.status.replace("_", " ")}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Add policy dialog */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Add insurance policy</h3>
            {country && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Showing carriers for <span className="font-semibold text-slate-700 dark:text-slate-200">{country}</span>. Pick the closest match — you can also type a member id from any plan.
              </p>
            )}
            <div className="mt-3 space-y-3">
              <F label="Insurer / TPA">
                <select value={form.tpaId} onChange={(e) => setForm({ ...form, tpaId: e.target.value })} className="form-input">
                  <option value="">Pick…</option>
                  {registry.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.kind})</option>)}
                </select>
              </F>
              <F label="Member ID"><input className="form-input font-mono" value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })} placeholder="As printed on the card" /></F>
              <F label="Plan name (optional)"><input className="form-input" value={form.planName} onChange={(e) => setForm({ ...form, planName: e.target.value })} /></F>
              <F label={`Sum insured (${currency?.symbol || "₹"})`}><input className="form-input" type="number" value={form.sumInsuredRupees} onChange={(e) => setForm({ ...form, sumInsuredRupees: e.target.value })} placeholder={currency?.code === "INR" ? "500000" : "50000"} /></F>
              <F label="Valid until"><input type="date" className="form-input" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} /></F>
              <F label="Group / corporate holder (optional)"><input className="form-input" value={form.groupHolder} onChange={(e) => setForm({ ...form, groupHolder: e.target.value })} placeholder={country === "IN" ? "e.g. Infosys group floater" : country === "US" ? "e.g. Employer group plan" : "e.g. Employer / group floater"} /></F>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowAdd(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Cancel</button>
              <button onClick={addPolicy} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Add policy</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        :global(.form-input) {
          width: 100%; border-radius: 0.5rem; border: 1px solid #cbd5e1;
          background: #fff; padding: 0.5rem 0.75rem;
          font-size: 0.875rem; color: #0f172a;
        }
        :global(.form-input:focus) {
          outline: none; border-color: #6366f1;
          box-shadow: 0 0 0 2px rgba(99,102,241,0.2);
        }
      `}</style>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</label>
      {children}
    </div>
  );
}
