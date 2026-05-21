"use client";

// V17 reception view.
//
// Workflow: paste the scanned QR token + pick the doctor → issue
// OPD token → it appears in the live queue list below + on the
// public board at /admin/opd-board.

import { useCallback, useEffect, useState } from "react";

interface OpdToken {
  id: string; displayNumber: string; patientId: string; patientName: string; patientPhone?: string;
  clinicName?: string; doctorId: string; doctorName: string;
  status: "waiting" | "called" | "in_consult" | "completed" | "no_show" | "cancelled";
  queuePosition: number; arrivedAt: string; calledAt?: string;
  patientAbhaId?: string; linkedAppointmentId?: string;
}

const STATUS_PILL: Record<OpdToken["status"], string> = {
  waiting: "bg-amber-100 text-amber-800",
  called: "bg-sky-100 text-sky-800",
  in_consult: "bg-indigo-100 text-indigo-800",
  completed: "bg-emerald-100 text-emerald-800",
  no_show: "bg-rose-100 text-rose-800",
  cancelled: "bg-gray-100 text-gray-600",
};

export default function OpdReceptionPage() {
  const [form, setForm] = useState({
    qrToken: "",
    doctorId: "doc-001", doctorName: "Dr Demo",
    clinicId: "apollo-vadodara", clinicName: "Apollo Hospital — Vadodara",
    departmentId: "", departmentName: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [lastIssued, setLastIssued] = useState<OpdToken | null>(null);
  const [queue, setQueue] = useState<OpdToken[]>([]);

  const loadQueue = useCallback(async () => {
    const r = await fetch(`/api/opd/queue?clinicId=${encodeURIComponent(form.clinicId)}`, { cache: "no-store" });
    if (r.ok) setQueue((await r.json()).tokens || []);
  }, [form.clinicId]);

  useEffect(() => { loadQueue(); }, [loadQueue]);
  useEffect(() => {
    const id = setInterval(loadQueue, 8000);
    return () => clearInterval(id);
  }, [loadQueue]);

  const issue = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/opd/issue", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await r.json();
      if (!r.ok) {
        setErr(
          j.error === "wrong_qr_kind" ? `Wrong QR — got ${j.got}, need identity or appointment.`
          : j.error === "patient_not_found" ? "Patient record not found."
          : j.error === "expired" ? "QR is expired — ask the patient to re-issue."
          : j.error === "revoked" ? "QR has been revoked by the patient."
          : j.error || "Issue failed."
        );
        return;
      }
      setLastIssued(j.token);
      setForm({ ...form, qrToken: "" });
      loadQueue();
    } finally { setBusy(false); }
  };

  const noShow = async (id: string) => {
    if (!confirm("Mark this patient as no-show?")) return;
    await fetch(`/api/opd/${id}/no-show`, { method: "POST" });
    loadQueue();
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">OPD reception</h1>
        <p className="mt-1 text-sm text-gray-600">
          V17 — scan the patient's identity or appointment QR → issue a
          token → patient waits on the display board. Queue refreshes
          every 8 s.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Issue form */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900">Issue token</h2>
          <div className="mt-3 space-y-3">
            <label className="block text-xs font-semibold text-gray-700">
              QR token (paste scanned value)
              <input
                value={form.qrToken}
                onChange={(e) => setForm({ ...form, qrToken: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && issue()}
                placeholder="Patient's identity / appointment QR"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-semibold text-gray-700">Doctor ID
                <input value={form.doctorId} onChange={(e) => setForm({ ...form, doctorId: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm font-normal" />
              </label>
              <label className="text-xs font-semibold text-gray-700">Doctor name
                <input value={form.doctorName} onChange={(e) => setForm({ ...form, doctorName: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm font-normal" />
              </label>
              <label className="text-xs font-semibold text-gray-700">Department
                <input value={form.departmentName} onChange={(e) => setForm({ ...form, departmentName: e.target.value })} placeholder="e.g. Cardiology" className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm font-normal" />
              </label>
              <label className="text-xs font-semibold text-gray-700">Clinic
                <input value={form.clinicName || ""} onChange={(e) => setForm({ ...form, clinicName: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm font-normal" />
              </label>
            </div>
            {err && <p className="rounded bg-rose-50 px-3 py-2 text-xs text-rose-800">{err}</p>}
            <button onClick={issue} disabled={busy || !form.qrToken.trim()} className="w-full rounded-xl bg-[#0F6E56] py-2.5 text-sm font-bold text-white disabled:opacity-60">
              {busy ? "Issuing…" : "Scan QR → Issue token"}
            </button>
            {lastIssued && (
              <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-900">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Latest token</p>
                <p className="mt-1 text-3xl font-extrabold text-[#0F6E56]">{lastIssued.displayNumber}</p>
                <p className="text-sm">{lastIssued.patientName}</p>
                <p className="text-xs text-emerald-800">Dr {lastIssued.doctorName} · position {lastIssued.queuePosition}</p>
                {lastIssued.linkedAppointmentId && <p className="mt-1 text-[11px] font-semibold text-sky-700">📅 Pre-booked appointment</p>}
                {lastIssued.patientAbhaId && <p className="text-[11px] font-semibold text-indigo-700">🇮🇳 ABHA linked: {lastIssued.patientAbhaId}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Live queue */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-3">
            <h2 className="text-sm font-bold text-gray-900">Live queue · {queue.length}</h2>
          </div>
          {queue.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-500">No live tokens. Issue one above to populate.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Patient</th>
                  <th className="px-3 py-2 text-left">Doctor</th>
                  <th className="px-3 py-2 text-left">Arrived</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {queue.map((t) => (
                  <tr key={t.id}>
                    <td className="px-3 py-2 font-mono text-base font-bold text-[#0F6E56]">{t.displayNumber}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{t.patientName}</div>
                      {t.patientPhone && <div className="text-xs text-gray-500">{t.patientPhone}</div>}
                    </td>
                    <td className="px-3 py-2 text-xs">{t.doctorName}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{new Date(t.arrivedAt).toLocaleTimeString()}</td>
                    <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_PILL[t.status]}`}>{t.status}</span></td>
                    <td className="px-3 py-2 text-right">
                      {(t.status === "waiting" || t.status === "called") && (
                        <button onClick={() => noShow(t.id)} className="rounded border border-rose-300 px-2 py-0.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50">No-show</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
