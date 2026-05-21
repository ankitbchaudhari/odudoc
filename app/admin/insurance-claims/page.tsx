"use client";

// V7 §2 Insurance claims panel — adjudicate + pay claims.
//
// Tabs intentionally NOT here yet — single-purpose surface that
// closes the PPME → submit-claim → approve → pay → settle loop end
// to end. The existing /admin/insurance handles policy admin; this
// page handles claim workflow specifically per V7 §2.6–2.8.

import { useCallback, useEffect, useState } from "react";

type ClaimStatus = "submitted" | "under_review" | "approved" | "rejected" | "paid";

interface Insurer {
  id: string; name: string; country: string; lines: string[];
  defaultPpmeTier: Record<string, string>;
}
interface Claim {
  id: string;
  insurerId: string;
  patientId: string; patientName: string;
  policyNumber: string;
  hospitalId: string; hospitalName: string;
  preAuthId?: string;
  billedCents: number; approvedCents?: number; currency: string;
  status: ClaimStatus;
  diagnosis: string;
  dischargeDate: string;
  submittedAt: string; decidedAt?: string; paidAt?: string;
  notes?: string;
}

const STATUS_PILL: Record<ClaimStatus, string> = {
  submitted:    "bg-sky-100 text-sky-800",
  under_review: "bg-amber-100 text-amber-800",
  approved:     "bg-indigo-100 text-indigo-800",
  rejected:     "bg-rose-100 text-rose-800",
  paid:         "bg-emerald-100 text-emerald-800",
};

function fmt(cents: number, currency: string): string {
  const sym = currency === "INR" ? "₹" : "$";
  return `${sym}${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

export default function InsuranceClaimsPanel() {
  const [insurers] = useState<Insurer[]>([{
    id: "demo-insurer", name: "Demo Insurance Co", country: "India",
    lines: ["health", "life", "critical_illness"],
    defaultPpmeTier: { health: "standard", life: "comprehensive", critical_illness: "executive", travel: "basic" },
  }]);
  const [insurerId, setInsurerId] = useState("demo-insurer");
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSubmit, setShowSubmit] = useState(false);

  const loadClaims = useCallback(async () => {
    if (!insurerId) return;
    setLoading(true);
    const r = await fetch(`/api/insurance/claims?insurerId=${insurerId}`, { cache: "no-store" });
    if (r.ok) setClaims((await r.json()).claims || []);
    setLoading(false);
  }, [insurerId]);
  useEffect(() => { loadClaims(); }, [loadClaims]);

  const decide = async (decision: "approved" | "rejected", approvedCents?: number, notes?: string) => {
    if (!selectedClaim) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/insurance/claims/${selectedClaim.id}/decide`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision, approvedCents, notes }),
      });
      if (!r.ok) { setError((await r.json()).error || "decide_failed"); return; }
      setSelectedClaim((await r.json()).claim);
      await loadClaims();
    } finally { setBusy(false); }
  };

  const pay = async () => {
    if (!selectedClaim) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/insurance/claims/${selectedClaim.id}/pay`, { method: "POST" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        if (j.error === "insufficient_insurer_funds") {
          setError(`Insurer wallet under-funded. Needed ${fmt(j.needed, selectedClaim.currency)}, has ${fmt(j.available, selectedClaim.currency)}. Top up + retry.`);
        } else {
          setError(j.error || "pay_failed");
        }
        return;
      }
      setSelectedClaim((await r.json()).claim);
      await loadClaims();
    } finally { setBusy(false); }
  };

  const insurer = insurers.find((i) => i.id === insurerId);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Insurance claims</h1>
          <p className="mt-1 text-sm text-gray-600">
            V7 §2.6–2.8 — submit, adjudicate, and pay claims. Payouts
            run through the insurer→hospital wallet transfer
            automatically once you click Pay.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={insurerId} onChange={(e) => setInsurerId(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm">
            {insurers.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
          <button onClick={() => setShowSubmit(true)} className="rounded-xl bg-[#0F6E56] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0A5942]">+ Submit claim</button>
        </div>
      </div>

      {insurer && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-4 text-sm">
            <div><p className="text-xs font-bold uppercase tracking-wider text-gray-500">Country</p><p className="mt-1">{insurer.country}</p></div>
            <div><p className="text-xs font-bold uppercase tracking-wider text-gray-500">Lines</p><p className="mt-1">{insurer.lines.join(", ")}</p></div>
            <div className="col-span-2"><p className="text-xs font-bold uppercase tracking-wider text-gray-500">Default PPME tier</p>
              <p className="mt-1 text-xs">{Object.entries(insurer.defaultPpmeTier).map(([k, v]) => `${k}: ${v}`).join(" · ")}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <p className="p-6 text-center text-sm text-gray-500">Loading…</p>
          ) : claims.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-500">No claims yet. Click + Submit claim to start a demo flow.</p>
          ) : (
            <ul className="max-h-[70vh] divide-y divide-gray-100 overflow-y-auto">
              {claims.map((c) => (
                <li key={c.id}>
                  <button onClick={() => { setSelectedClaim(c); setError(null); }} className={`block w-full px-4 py-3 text-left hover:bg-gray-50 ${selectedClaim?.id === c.id ? "bg-[#0F6E56]/5" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{c.patientName}</p>
                        <p className="truncate text-xs text-gray-500">{c.hospitalName} · Policy {c.policyNumber}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_PILL[c.status]}`}>{c.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{fmt(c.billedCents, c.currency)} · {c.diagnosis}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          {!selectedClaim ? (
            <p className="text-sm text-gray-500">Select a claim on the left to adjudicate.</p>
          ) : (
            <div className="space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selectedClaim.patientName}</h2>
                  <p className="text-xs text-gray-500">{selectedClaim.hospitalName} · Policy {selectedClaim.policyNumber}</p>
                  <p className="text-xs text-gray-400">Discharged {new Date(selectedClaim.dischargeDate).toLocaleDateString()}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_PILL[selectedClaim.status]}`}>{selectedClaim.status}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 rounded-xl bg-gray-50 p-3 text-xs">
                <div><span className="font-semibold text-gray-700">Diagnosis:</span> {selectedClaim.diagnosis}</div>
                <div><span className="font-semibold text-gray-700">Billed:</span> {fmt(selectedClaim.billedCents, selectedClaim.currency)}</div>
                {selectedClaim.approvedCents !== undefined && <div><span className="font-semibold text-gray-700">Approved:</span> {fmt(selectedClaim.approvedCents, selectedClaim.currency)}</div>}
              </div>
              {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div>}

              <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                {selectedClaim.status === "submitted" && <DecideButtons onApprove={(amt) => decide("approved", amt)} onReject={() => decide("rejected")} billedCents={selectedClaim.billedCents} currency={selectedClaim.currency} busy={busy} />}
                {selectedClaim.status === "approved" && (
                  <button onClick={pay} disabled={busy} className="rounded-lg bg-[#0F6E56] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#0A5942] disabled:opacity-60">
                    {busy ? "Paying…" : `Pay claim · ${fmt(selectedClaim.approvedCents || 0, selectedClaim.currency)}`}
                  </button>
                )}
                {selectedClaim.status === "paid" && selectedClaim.paidAt && <p className="text-sm italic text-emerald-700">Paid {new Date(selectedClaim.paidAt).toLocaleString()}</p>}
                {selectedClaim.status === "rejected" && <p className="text-sm italic text-rose-700">Rejected. Hospital can resubmit with additional documentation.</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {showSubmit && <SubmitClaimModal insurerId={insurerId} onClose={() => setShowSubmit(false)} onSubmitted={() => { setShowSubmit(false); loadClaims(); }} />}
    </div>
  );
}

function DecideButtons({ onApprove, onReject, billedCents, currency, busy }: { onApprove: (amt: number) => void; onReject: () => void; billedCents: number; currency: string; busy: boolean }) {
  const [amt, setAmt] = useState(billedCents);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-xs font-semibold text-gray-700">
        Approve amount ({currency})
        <input type="number" value={amt / 100} onChange={(e) => setAmt(Math.round(Number(e.target.value) * 100))} className="ml-2 w-32 rounded border border-gray-300 px-2 py-1 text-sm" />
      </label>
      <button onClick={() => onApprove(amt)} disabled={busy} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">Approve</button>
      <button onClick={onReject} disabled={busy} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60">Reject</button>
    </div>
  );
}

function SubmitClaimModal({ insurerId, onClose, onSubmitted }: { insurerId: string; onClose: () => void; onSubmitted: () => void }) {
  const [form, setForm] = useState({
    patientId: "demo-patient-1", patientName: "Demo Patient",
    policyNumber: "POL-0001",
    hospitalId: "apollo-vadodara", hospitalName: "Apollo Hospital — Vadodara",
    billedCents: 150_000, currency: "INR",
    diagnosis: "Pneumonia — community-acquired",
    dischargeDate: new Date().toISOString().slice(0, 10),
  });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    const r = await fetch("/api/insurance/claims", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...form, insurerId }),
    });
    setBusy(false);
    if (r.ok) onSubmitted();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-gray-900">Submit claim</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
          {(["patientName", "policyNumber", "hospitalName", "diagnosis"] as const).map((k) => (
            <label key={k} className="font-semibold text-gray-700">{k}
              <input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm font-normal" />
            </label>
          ))}
          <label className="font-semibold text-gray-700">billed (₹)
            <input type="number" value={form.billedCents / 100} onChange={(e) => setForm({ ...form, billedCents: Math.round(Number(e.target.value) * 100) })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm font-normal" />
          </label>
          <label className="font-semibold text-gray-700">discharge date
            <input type="date" value={form.dischargeDate} onChange={(e) => setForm({ ...form, dischargeDate: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm font-normal" />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} disabled={busy} className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm">Cancel</button>
          <button onClick={submit} disabled={busy} className="rounded-lg bg-[#0F6E56] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Submitting…" : "Submit"}</button>
        </div>
      </div>
    </div>
  );
}
