"use client";

// /clinic/[clinicId]/insurance — clinic-side TPA empanelment hub.
//
// Manager-only management of which TPAs / insurers the clinic is
// empanelled with. Each row shows discount %, contact, validUntil
// + a renewal-soon banner when expiry is within 60 days. Driving
// goal: when a patient asks "do you accept X insurance?" reception
// has a definitive yes/no instead of "let me check with the doctor".

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Tpa {
  id: string;
  name: string;
  shortCode: string;
  kind: "tpa" | "insurer";
  country?: string;
  preauthSlaHours?: number;
}

interface Empanelment {
  id: string;
  clinicId: string;
  tpaId: string;
  discountPct: number;
  portalUrl?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  validUntil?: string;
  notes?: string;
  active: boolean;
}

interface Staff { role: "receptionist" | "assistant" | "manager"; name: string; }

export default function ClinicInsurancePage() {
  const params = useParams<{ clinicId: string }>();
  const router = useRouter();
  const clinicId = params.clinicId;
  const [empanelments, setEmpanelments] = useState<Empanelment[]>([]);
  const [tpas, setTpas] = useState<Tpa[]>([]);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Empanelment | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [eRes, dRes] = await Promise.all([
      fetch("/api/clinic/empanelments", { cache: "no-store" }),
      fetch("/api/clinic/dashboard", { cache: "no-store" }),
    ]);
    if (eRes.status === 401) {
      router.replace(`/clinic/${clinicId}/login`);
      return;
    }
    const e = await eRes.json();
    const d = await dRes.json().catch(() => ({}));
    setEmpanelments(e.empanelments || []);
    setTpas(e.tpas || []);
    setStaff(d.staff || null);
    setLoading(false);
  }, [clinicId, router]);
  useEffect(() => { load(); }, [load]);

  const isManager = staff?.role === "manager";
  const tpaById = useMemo(() => new Map(tpas.map((t) => [t.id, t])), [tpas]);

  const renewalsSoon = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 60);
    return empanelments.filter((e) => e.validUntil && new Date(e.validUntil) <= cutoff);
  }, [empanelments]);

  const remove = async (id: string) => {
    if (!confirm("Remove this empanelment? Patients will no longer see this insurer as accepted.")) return;
    const r = await fetch(`/api/clinic/empanelments/${id}`, { method: "DELETE" });
    if (r.ok) load();
  };

  return (
    <main className="relative mx-auto max-w-5xl px-4 py-8">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-gradient-to-tr from-sky-400/25 via-violet-400/25 to-fuchsia-300/25 blur-3xl dark:from-sky-600/25 dark:via-violet-600/25 dark:to-fuchsia-500/15" />
      </div>

      <Link href={`/clinic/${clinicId}/dashboard`} className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 dark:text-slate-400 hover:text-indigo-600">
        ← Dashboard
      </Link>

      <header className="mb-6 overflow-hidden rounded-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg shadow-indigo-500/5">
        <div className="relative bg-gradient-to-br from-sky-600 via-violet-600 to-fuchsia-600 px-6 py-6 text-white">
          <div className="relative flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Cashless insurance</p>
              <h1 className="mt-1 text-2xl font-bold">TPA empanelments</h1>
              <p className="mt-1 max-w-xl text-sm text-white/80">
                List the TPAs and insurers your clinic is empanelled with. Reception uses this when a patient
                asks "do you accept X insurance?" and at pre-auth submission time.
              </p>
            </div>
            {isManager && (
              <button
                onClick={() => { setEditing(null); setShowForm(true); }}
                className="shrink-0 rounded-xl bg-white/15 backdrop-blur-sm px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/30 hover:bg-white/25 transition"
              >
                + Add empanelment
              </button>
            )}
          </div>
        </div>
      </header>

      {renewalsSoon.length > 0 && (
        <div className="mb-5 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 px-4 py-3">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            ⏰ {renewalsSoon.length} empanelment{renewalsSoon.length === 1 ? "" : "s"} renew within 60 days
          </p>
          <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">
            {renewalsSoon.map((e) => tpaById.get(e.tpaId)?.name || e.tpaId).join(" · ")}
          </p>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">Loading…</p>
      ) : empanelments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 dark:border-slate-700 bg-sky-50/40 dark:bg-sky-950/20 p-10 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-violet-500 text-2xl text-white shadow-lg shadow-sky-500/30">🛡️</span>
          <p className="mt-3 text-base font-semibold text-gray-900 dark:text-slate-100">No empanelments yet</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-gray-500 dark:text-slate-400">
            {isManager
              ? `Add each TPA / insurer your clinic accepts so reception can confirm coverage at the front desk.`
              : `Your manager hasn't added any TPA empanelments yet.`}
          </p>
          {isManager && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-5 rounded-xl bg-gradient-to-r from-sky-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/30"
            >
              + Add first empanelment
            </button>
          )}
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {empanelments.map((e) => {
            const tpa = tpaById.get(e.tpaId);
            const expSoon = e.validUntil && new Date(e.validUntil) <= new Date(Date.now() + 60 * 86400 * 1000);
            return (
              <li key={e.id} className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                        {tpa?.name || e.tpaId}
                      </p>
                      <span className="rounded-full bg-sky-100 dark:bg-sky-950/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                        {tpa?.kind === "insurer" ? "Insurer" : "TPA"}
                      </span>
                      {!e.active && (
                        <span className="rounded-full bg-slate-200 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                          Inactive
                        </span>
                      )}
                      {expSoon && (
                        <span className="rounded-full bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                          Renew soon
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                      Discount: <span className="font-medium text-gray-700 dark:text-slate-300">{e.discountPct}%</span>
                      {e.validUntil && ` · valid until ${e.validUntil}`}
                    </p>
                    {(e.contactPerson || e.contactPhone || e.contactEmail) && (
                      <p className="mt-1 text-[11px] text-gray-500 dark:text-slate-400 truncate">
                        Desk: {e.contactPerson}{e.contactPhone ? ` · ${e.contactPhone}` : ""}{e.contactEmail ? ` · ${e.contactEmail}` : ""}
                      </p>
                    )}
                    {e.portalUrl && (
                      <a href={e.portalUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[11px] text-indigo-600 dark:text-indigo-300 hover:underline">
                        Open claims portal →
                      </a>
                    )}
                  </div>
                  {isManager && (
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <button onClick={() => { setEditing(e); setShowForm(true); }} className="text-[11px] text-indigo-600 dark:text-indigo-300 hover:underline">
                        Edit
                      </button>
                      <button onClick={() => remove(e.id)} className="text-[11px] text-rose-600 hover:underline">
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {showForm && (
        <EmpanelmentForm
          editing={editing}
          tpas={tpas}
          existing={empanelments}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </main>
  );
}

const inputBase =
  "w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition";

function EmpanelmentForm({
  editing, tpas, existing, onClose, onSaved,
}: {
  editing: Empanelment | null;
  tpas: Tpa[];
  existing: Empanelment[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tpaId, setTpaId] = useState(editing?.tpaId || "");
  const [discount, setDiscount] = useState(String(editing?.discountPct ?? 0));
  const [portal, setPortal] = useState(editing?.portalUrl || "");
  const [person, setPerson] = useState(editing?.contactPerson || "");
  const [phone, setPhone] = useState(editing?.contactPhone || "");
  const [email, setEmail] = useState(editing?.contactEmail || "");
  const [valid, setValid] = useState(editing?.validUntil || "");
  const [notes, setNotes] = useState(editing?.notes || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Hide TPAs we already have an empanelment for (except the one we're editing).
  const availableTpas = useMemo(
    () => tpas.filter((t) => editing?.tpaId === t.id || !existing.some((e) => e.tpaId === t.id)),
    [tpas, existing, editing],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!tpaId) { setErr("Pick a TPA / insurer."); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/clinic/empanelments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tpaId,
          discountPct: Number(discount) || 0,
          portalUrl: portal || undefined,
          contactPerson: person || undefined,
          contactPhone: phone || undefined,
          contactEmail: email || undefined,
          validUntil: valid || undefined,
          notes: notes || undefined,
        }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Save failed"); return; }
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="w-full max-w-lg overflow-hidden rounded-t-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <header className="bg-gradient-to-r from-sky-600 via-violet-600 to-fuchsia-600 px-6 py-4 text-white">
          <h2 className="text-lg font-bold">{editing ? "Edit empanelment" : "Add empanelment"}</h2>
        </header>
        <form onSubmit={submit} className="grid gap-3 px-6 py-5 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">TPA / Insurer *</span>
            <select required value={tpaId} onChange={(e) => setTpaId(e.target.value)} className={inputBase} disabled={!!editing}>
              <option value="">— Pick one —</option>
              {availableTpas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.kind === "insurer" ? "Insurer" : "TPA"})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Tariff discount %</span>
            <input type="number" min={0} max={100} step="0.5" value={discount} onChange={(e) => setDiscount(e.target.value)} className={inputBase} placeholder="10" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Valid until</span>
            <input type="date" value={valid} onChange={(e) => setValid(e.target.value)} className={inputBase} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Claim portal URL</span>
            <input type="url" value={portal} onChange={(e) => setPortal(e.target.value)} className={inputBase} placeholder="https://provider.tpa.com/login" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Desk officer</span>
            <input value={person} onChange={(e) => setPerson(e.target.value)} className={inputBase} placeholder="Ms. Sharma" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Desk phone</span>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputBase} placeholder="+91 98XXXXXXXX" />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Desk email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputBase} placeholder="cashless@tpa.com" />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Notes</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputBase} placeholder="Special clauses, supporting docs needed, etc." />
          </label>
          {err && <p className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-xs text-rose-700 dark:text-rose-300 sm:col-span-2">{err}</p>}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800">Cancel</button>
            <button disabled={busy} className="rounded-xl bg-gradient-to-r from-sky-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-sky-500/30 disabled:opacity-50">
              {busy ? "Saving…" : editing ? "Save changes" : "Add empanelment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
