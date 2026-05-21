"use client";

// V9 §3 PPME admin board.
//
// List view + per-report detail with the V9 §3.5 test grid.
// Submit / approve / reject buttons drive the lifecycle. Schedule
// dialog opens a minimal form. Settlement is automatic on submit
// per V9 §3.8 — no admin action needed on the wallet side.

import { useCallback, useEffect, useState } from "react";

type Status = "scheduled" | "in_progress" | "submitted" | "approved" | "rejected" | "cancelled";
type Tier = "basic" | "standard" | "comprehensive" | "executive";

interface PpmeTest {
  code: string; name: string;
  status: "pending" | "done" | "skipped" | "abnormal";
  result?: string; referenceRange?: string;
  recordedBy?: string; recordedAt?: string;
}
interface PpmeReport {
  id: string;
  patientId: string; patientName: string; patientPhone?: string;
  insurerId: string; insurerName: string; insurerRef: string;
  policyType: "health" | "life" | "critical_illness" | "travel";
  tier: Tier;
  feeCents: number; currency: string;
  facilityId: string; facilityName: string;
  status: Status;
  tests: PpmeTest[];
  photoUrls: string[];
  examinerNotes?: string; examinerEmail?: string;
  reportHash?: string;
  scheduledFor?: string;
  completedAt?: string;
  createdAt: string; updatedAt: string;
}

const TIER_LABEL: Record<Tier, string> = {
  basic: "Basic", standard: "Standard", comprehensive: "Comprehensive", executive: "Executive",
};

const STATUS_PILL: Record<Status, string> = {
  scheduled: "bg-sky-100 text-sky-800",
  in_progress: "bg-amber-100 text-amber-800",
  submitted: "bg-indigo-100 text-indigo-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
  cancelled: "bg-gray-100 text-gray-600",
};

function fmt(cents: number, currency: string): string {
  const symbol = currency === "INR" ? "₹" : "$";
  return `${symbol}${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

export default function PpmePage() {
  const [reports, setReports] = useState<PpmeReport[]>([]);
  const [selected, setSelected] = useState<PpmeReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSchedule, setShowSchedule] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/ppme", { cache: "no-store" });
    if (r.ok) setReports((await r.json()).reports || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const reloadSelected = async (id: string) => {
    const r = await fetch(`/api/ppme/${id}`, { cache: "no-store" });
    if (r.ok) {
      const d = (await r.json()).report;
      setSelected(d);
      setReports((rows) => rows.map((x) => x.id === d.id ? d : x));
    }
  };

  const updateTest = async (code: string, patch: Partial<PpmeTest>) => {
    if (!selected) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/ppme/${selected.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ testCode: code, test: patch }),
      });
      if (r.ok) reloadSelected(selected.id);
    } finally { setBusy(false); }
  };

  const submit = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/ppme/${selected.id}/submit`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) });
      if (r.ok) reloadSelected(selected.id);
    } finally { setBusy(false); }
  };

  const decide = async (decision: "approved" | "rejected") => {
    if (!selected) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/ppme/${selected.id}/decide`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (r.ok) reloadSelected(selected.id);
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pre-Policy Medical Exams</h1>
          <p className="mt-1 text-sm text-gray-600">
            V9 §3 — OduDoc-run medical screenings for insurance applicants.
            Settlement runs automatically on submit: insurer → platform (15%)
            → performing facility (85%).
          </p>
        </div>
        <button
          onClick={() => setShowSchedule(true)}
          className="rounded-xl bg-[#0F6E56] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0A5942]"
        >
          + Schedule PPME
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        {/* List */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <p className="p-6 text-center text-sm text-gray-500">Loading…</p>
          ) : reports.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-500">No PPME reports yet. Schedule one to get started.</p>
          ) : (
            <ul className="max-h-[70vh] divide-y divide-gray-100 overflow-y-auto">
              {reports.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => setSelected(r)}
                    className={`block w-full px-4 py-3 text-left transition-colors hover:bg-gray-50 ${selected?.id === r.id ? "bg-[#0F6E56]/5" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{r.patientName}</p>
                        <p className="text-xs text-gray-500">{r.insurerName} · Ref {r.insurerRef}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_PILL[r.status]}`}>{r.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {TIER_LABEL[r.tier]} · {r.policyType.replace("_", " ")} · {fmt(r.feeCents, r.currency)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Detail */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          {!selected ? (
            <p className="text-sm text-gray-500">Select a report on the left to view detail.</p>
          ) : (
            <div className="space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selected.patientName}</h2>
                  <p className="text-xs text-gray-500">{selected.facilityName} · {selected.insurerName}</p>
                  <p className="text-xs text-gray-400">Fee {fmt(selected.feeCents, selected.currency)} · {TIER_LABEL[selected.tier]}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_PILL[selected.status]}`}>{selected.status}</span>
              </div>

              {selected.reportHash && (
                <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700">
                  <span className="font-bold">Report SHA-256:</span>{" "}
                  <code className="font-mono">{selected.reportHash}</code>
                </div>
              )}

              {/* Tests */}
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-600">Tests</p>
                <ul className="space-y-2">
                  {selected.tests.map((t) => (
                    <li key={t.code} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900">{t.name}</p>
                        <select
                          value={t.status}
                          onChange={(e) => updateTest(t.code, { status: e.target.value as PpmeTest["status"] })}
                          disabled={busy || selected.status === "submitted" || selected.status === "approved"}
                          className="rounded border border-gray-300 px-2 py-0.5 text-xs"
                        >
                          <option value="pending">Pending</option>
                          <option value="done">Done</option>
                          <option value="skipped">Skipped</option>
                          <option value="abnormal">Abnormal</option>
                        </select>
                      </div>
                      <input
                        value={t.result || ""}
                        onChange={(e) => updateTest(t.code, { result: e.target.value })}
                        disabled={busy || selected.status === "submitted" || selected.status === "approved"}
                        placeholder="Result (e.g. 124/82 mmHg)"
                        className="mt-1 w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs"
                      />
                    </li>
                  ))}
                </ul>
              </div>

              {/* Lifecycle buttons */}
              <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                {(selected.status === "scheduled" || selected.status === "in_progress") && (
                  <button
                    onClick={submit}
                    disabled={busy}
                    className="rounded-lg bg-[#0F6E56] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#0A5942] disabled:opacity-60"
                  >
                    Submit report (locks data + runs settlement)
                  </button>
                )}
                {selected.status === "submitted" && (
                  <>
                    <button onClick={() => decide("approved")} disabled={busy} className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">Approve</button>
                    <button onClick={() => decide("rejected")} disabled={busy} className="rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60">Reject</button>
                  </>
                )}
                {(selected.status === "approved" || selected.status === "rejected") && (
                  <p className="text-xs italic text-gray-500">Lifecycle complete. {selected.completedAt && `Submitted ${new Date(selected.completedAt).toLocaleString()}`}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showSchedule && <ScheduleModal onClose={() => setShowSchedule(false)} onScheduled={(r) => { setReports((rs) => [r, ...rs]); setSelected(r); setShowSchedule(false); }} />}
    </div>
  );
}

function ScheduleModal({ onClose, onScheduled }: { onClose: () => void; onScheduled: (r: PpmeReport) => void }) {
  const [form, setForm] = useState({
    patientId: "", patientName: "", patientPhone: "",
    insurerId: "demo-insurer", insurerName: "Demo Insurance Co",
    insurerRef: `REF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    policyType: "health", tier: "standard",
    facilityId: "apollo-vadodara", facilityName: "Apollo Hospital — Vadodara",
  });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    const r = await fetch("/api/ppme", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (r.ok) onScheduled((await r.json()).report);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-gray-900">Schedule PPME</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {(["patientId", "patientName", "patientPhone", "insurerName", "insurerRef", "facilityName"] as const).map((k) => (
            <label key={k} className="text-xs font-semibold text-gray-700">
              {k}
              <input
                value={(form as Record<string, string>)[k] || ""}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm font-normal"
              />
            </label>
          ))}
          <label className="text-xs font-semibold text-gray-700">
            policyType
            <select value={form.policyType} onChange={(e) => setForm({ ...form, policyType: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm font-normal">
              <option value="health">health</option>
              <option value="life">life</option>
              <option value="critical_illness">critical_illness</option>
              <option value="travel">travel</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-gray-700">
            tier
            <select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm font-normal">
              <option value="basic">basic</option>
              <option value="standard">standard</option>
              <option value="comprehensive">comprehensive</option>
              <option value="executive">executive</option>
            </select>
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} disabled={busy} className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm">Cancel</button>
          <button onClick={submit} disabled={busy} className="rounded-lg bg-[#0F6E56] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60">
            {busy ? "Scheduling…" : "Schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}
