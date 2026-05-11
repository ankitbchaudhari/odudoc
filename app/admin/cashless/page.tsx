"use client";

// Hospital cashless desk — pre-auth queue + TPA empanelment.
// Distinct from the existing /admin/insurance page (which manages
// invoice-level claims): this is the front-desk pre-admission flow.

import { useCallback, useEffect, useState } from "react";
import { PageHero } from "@/components/admin/PageShell";

interface TpaEntry { id: string; name: string; shortCode: string; kind: string; preauthSlaHours: number }
interface Empanelment {
  id: string; tpaId: string; discountPct: number;
  portalUrl?: string; contactPerson?: string; contactPhone?: string;
  contactEmail?: string; validUntil?: string; notes?: string;
}
interface Preauth {
  id: string; status: string;
  patientUserId: string; patientName: string;
  tpaId: string; memberId: string;
  procedureCode: string; procedureName: string;
  estimateRupees: { gross: number; net: number; insurerPays: number; patientPays: number };
  approvedAmountRupees?: number; tpaReference?: string; tpaNote?: string;
  doctorName?: string; clinicalNotes?: string;
  proposedAdmissionDate?: string;
  documents: Array<{ name: string; attached: boolean }>;
  filedByEmail?: string; updatedAt: string;
}

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  submitted: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  approved_with_query: "bg-yellow-100 text-yellow-800",
  rejected: "bg-rose-100 text-rose-800",
  cancelled: "bg-slate-200 text-slate-600",
};

function fmtINR(n: number) { return `₹${Math.round(n).toLocaleString("en-IN")}`; }

export default function AdminCashlessPage() {
  const [tab, setTab] = useState<"queue" | "empanelment">("queue");
  const [registry, setRegistry] = useState<TpaEntry[]>([]);
  const [empanelments, setEmpanelments] = useState<Empanelment[]>([]);
  const [preauths, setPreauths] = useState<Preauth[]>([]);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [empForm, setEmpForm] = useState({ tpaId: "", discountPct: "", portalUrl: "", contactPerson: "", contactPhone: "", contactEmail: "" });
  const [active, setActive] = useState<Preauth | null>(null);

  const load = useCallback(async () => {
    const [r1, r2] = await Promise.all([
      fetch("/api/insurance/tpas", { cache: "no-store" }),
      fetch("/api/insurance/preauth?view=org", { cache: "no-store" }),
    ]);
    if (r1.ok) {
      const d = await r1.json();
      setRegistry(d.registry || []);
      setEmpanelments(d.empanelments || []);
    }
    if (r2.ok) setPreauths((await r2.json()).preauths || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const tpaName = (id: string) => registry.find((t) => t.id === id)?.name || id;

  const setEmp = async () => {
    if (!empForm.tpaId) return;
    const r = await fetch("/api/insurance/tpas", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tpaId: empForm.tpaId,
        discountPct: empForm.discountPct ? Number(empForm.discountPct) : 0,
        portalUrl: empForm.portalUrl || undefined,
        contactPerson: empForm.contactPerson || undefined,
        contactPhone: empForm.contactPhone || undefined,
        contactEmail: empForm.contactEmail || undefined,
      }),
    });
    if (r.ok) {
      setToast({ kind: "ok", text: "Empanelment saved." });
      setEmpForm({ tpaId: "", discountPct: "", portalUrl: "", contactPerson: "", contactPhone: "", contactEmail: "" });
      await load();
    }
  };

  const removeEmp = async (id: string) => {
    if (!confirm("Remove empanelment?")) return;
    const r = await fetch(`/api/insurance/tpas?id=${id}`, { method: "DELETE" });
    if (r.ok) { setToast({ kind: "ok", text: "Removed." }); await load(); }
  };

  const action = async (id: string, payload: Record<string, unknown>) => {
    const r = await fetch(`/api/insurance/preauth/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (r.ok) { setToast({ kind: "ok", text: "Updated." }); await load(); setActive(null); }
    else { setToast({ kind: "err", text: "Action failed." }); }
  };

  const decide = async (id: string, decision: "approved" | "approved_with_query" | "rejected") => {
    let approvedAmountRupees: number | undefined;
    let tpaReference: string | undefined;
    let tpaNote: string | undefined;
    if (decision === "approved" || decision === "approved_with_query") {
      const a = window.prompt("Approved amount (₹)?");
      if (a === null) return;
      approvedAmountRupees = Number(a) || 0;
      tpaReference = window.prompt("TPA reference number?") || undefined;
    }
    if (decision === "approved_with_query" || decision === "rejected") {
      tpaNote = window.prompt(decision === "rejected" ? "Reject reason:" : "Query note:") || undefined;
    }
    await action(id, { action: "decide", decision, approvedAmountRupees, tpaReference, tpaNote });
  };

  return (
    <div>
      {toast && (
        <div className={`mb-4 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${toast.kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="text-xs font-semibold underline">Dismiss</button>
        </div>
      )}

      <div className="mb-6">
        <PageHero
          icon="💳"
          eyebrow="TPA Workflow"
          title="Cashless Desk"
          subtitle="Pre-authorisation queue + TPA empanelment. Submit pre-auths, track TPA decisions, and configure which insurers your hospital is signed up with."
          tone="amber"
        />
      </div>

      <div className="mb-5 flex gap-1 rounded-lg bg-slate-100 p-1">
        {(["queue", "empanelment"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-md px-3 py-1.5 text-sm font-semibold capitalize ${tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}>{t}</button>
        ))}
      </div>

      {tab === "queue" && (
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <p className="mb-3 text-sm text-slate-500">{preauths.length} pre-auth{preauths.length === 1 ? "" : "s"} on file</p>
          {preauths.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No pre-auths yet.</p>
          ) : (
            <ul className="space-y-2">
              {preauths.map((p) => (
                <li key={p.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{p.patientName} — {p.procedureName}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {tpaName(p.tpaId)} · Member {p.memberId} · Filed {new Date(p.updatedAt).toLocaleDateString()}
                        {p.doctorName ? ` · Dr ${p.doctorName}` : ""}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5">Gross {fmtINR(p.estimateRupees.gross)}</span>
                        <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-emerald-800">Insurer {fmtINR(p.estimateRupees.insurerPays)}</span>
                        <span className="rounded-md bg-rose-100 px-2 py-0.5 text-rose-800">Patient {fmtINR(p.estimateRupees.patientPays)}</span>
                        {p.approvedAmountRupees !== undefined && <span className="rounded-md bg-emerald-200 px-2 py-0.5 font-bold text-emerald-900">Approved {fmtINR(p.approvedAmountRupees)}</span>}
                      </div>
                      {p.tpaNote && <p className="mt-1 text-xs italic text-slate-600">&ldquo;{p.tpaNote}&rdquo;</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${STATUS_COLOR[p.status]}`}>{p.status.replace("_", " ")}</span>
                      <button onClick={() => setActive(p)} className="rounded-md border border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-slate-700">Open</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === "empanelment" && (
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <p className="mb-3 text-sm text-slate-500">{empanelments.length} empanelment{empanelments.length === 1 ? "" : "s"} configured. Empanelled = your hospital is cashless-eligible for that insurer; non-empanelled patients pay then claim reimbursement.</p>

          <div className="mb-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
            <p className="mb-2 text-sm font-bold text-slate-900">Add / update empanelment</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <select value={empForm.tpaId} onChange={(e) => setEmpForm({ ...empForm, tpaId: e.target.value })} className="form-input">
                <option value="">Pick TPA / insurer…</option>
                {registry.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.kind})</option>)}
              </select>
              <input className="form-input" type="number" placeholder="Discount %" value={empForm.discountPct} onChange={(e) => setEmpForm({ ...empForm, discountPct: e.target.value })} />
              <input className="form-input" placeholder="Portal URL" value={empForm.portalUrl} onChange={(e) => setEmpForm({ ...empForm, portalUrl: e.target.value })} />
              <input className="form-input" placeholder="Contact person" value={empForm.contactPerson} onChange={(e) => setEmpForm({ ...empForm, contactPerson: e.target.value })} />
              <input className="form-input" placeholder="Phone" value={empForm.contactPhone} onChange={(e) => setEmpForm({ ...empForm, contactPhone: e.target.value })} />
              <input className="form-input" placeholder="Email" value={empForm.contactEmail} onChange={(e) => setEmpForm({ ...empForm, contactEmail: e.target.value })} />
            </div>
            <button onClick={setEmp} disabled={!empForm.tpaId} className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Save</button>
          </div>

          {empanelments.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No empanelments yet.</p>
          ) : (
            <ul className="space-y-2">
              {empanelments.map((e) => (
                <li key={e.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{tpaName(e.tpaId)}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Discount {e.discountPct}% {e.contactPerson ? `· ${e.contactPerson}` : ""} {e.contactPhone ? `· ${e.contactPhone}` : ""}
                      </p>
                      {e.portalUrl && <a href={e.portalUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 underline">Open claim portal</a>}
                    </div>
                    <button onClick={() => removeEmp(e.id)} className="rounded-md border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-600">Remove</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Pre-auth detail dialog */}
      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setActive(null)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">{active.procedureName}</h3>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ${STATUS_COLOR[active.status]}`}>{active.status.replace("_", " ")}</span>
            </div>
            <p className="text-sm text-slate-700">{active.patientName} · {tpaName(active.tpaId)} · {active.memberId}</p>
            {active.clinicalNotes && (
              <div className="mt-3 rounded-md bg-slate-50 p-3 text-xs text-slate-700">
                <p className="font-bold text-slate-500 uppercase tracking-wider">Clinical notes</p>
                <p className="mt-1 whitespace-pre-wrap">{active.clinicalNotes}</p>
              </div>
            )}

            <div className="mt-4">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Document checklist</p>
              <ul className="space-y-1">
                {active.documents.map((d) => (
                  <li key={d.name} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={d.attached} onChange={(e) => action(active.id, { action: "doc", docName: d.name, attached: e.target.checked })} />
                    <span className={d.attached ? "text-slate-700" : "text-slate-400"}>{d.name}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
              <div className="rounded-md bg-slate-50 p-2"><strong>Gross:</strong> {fmtINR(active.estimateRupees.gross)}</div>
              <div className="rounded-md bg-slate-50 p-2"><strong>Net:</strong> {fmtINR(active.estimateRupees.net)}</div>
              <div className="rounded-md bg-emerald-50 p-2"><strong>Insurer pays:</strong> {fmtINR(active.estimateRupees.insurerPays)}</div>
              <div className="rounded-md bg-rose-50 p-2"><strong>Patient pays:</strong> {fmtINR(active.estimateRupees.patientPays)}</div>
              {active.approvedAmountRupees !== undefined && <div className="rounded-md bg-emerald-100 p-2 font-bold text-emerald-900 sm:col-span-2">✓ TPA approved: {fmtINR(active.approvedAmountRupees)} · ref {active.tpaReference}</div>}
              {active.tpaNote && <div className="rounded-md bg-amber-50 p-2 italic text-amber-800 sm:col-span-2">&ldquo;{active.tpaNote}&rdquo;</div>}
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {active.status === "draft" && (
                <button onClick={() => action(active.id, { action: "submit" })} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white">Submit to TPA</button>
              )}
              {active.status === "submitted" && (
                <>
                  <button onClick={() => decide(active.id, "approved")} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white">Approve</button>
                  <button onClick={() => decide(active.id, "approved_with_query")} className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-bold text-white">Approve w/ query</button>
                  <button onClick={() => decide(active.id, "rejected")} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white">Reject</button>
                </>
              )}
              {!["approved", "rejected", "cancelled"].includes(active.status) && (
                <button onClick={() => action(active.id, { action: "cancel" })} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
              )}
              <button onClick={() => setActive(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Close</button>
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
