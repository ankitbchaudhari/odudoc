"use client";

// IV MAR nurse console.
//
// Live queue of scheduled IV doses across the ward, sorted by
// next-due. Each row shows the 5-rights status, time-to-go, drug,
// patient, schedule class. Click a row → modal with scan inputs
// (patient wristband + drug barcode) → POST /api/iv-mar.
//
// Overdue banner at the top counts unconfirmed past-due doses;
// auto-refreshes every 30 s.

import { useCallback, useEffect, useState } from "react";

interface IvOrder {
  id: string;
  patientEmail: string;
  patientName: string;
  patientBedId?: string;
  drug: string;
  dose: string;
  diluent?: string;
  rate?: string;
  frequency: string;
  scheduleClass?: "OTC" | "H" | "H1" | "X" | "G" | "K";
}

interface MarRow {
  id: string;
  orderId: string;
  scheduledAt: string;
  administeredAt?: string;
  administeredBy?: string;
  witnessBy?: string;
  status: "due" | "given" | "missed" | "held" | "refused" | "wrong_time";
  reason?: string;
  verifiedPatient?: boolean;
  verifiedDrug?: boolean;
  order: IvOrder | null;
}

const STATUS_PALETTE: Record<MarRow["status"], string> = {
  due: "bg-sky-100 text-sky-800 ring-sky-300",
  given: "bg-emerald-100 text-emerald-800 ring-emerald-300",
  missed: "bg-rose-100 text-rose-800 ring-rose-300",
  held: "bg-amber-100 text-amber-800 ring-amber-300",
  refused: "bg-slate-200 text-slate-700 ring-slate-300",
  wrong_time: "bg-orange-100 text-orange-800 ring-orange-300",
};

export default function IvMarConsolePage() {
  const [rows, setRows] = useState<MarRow[]>([]);
  const [overdueCount, setOverdueCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [scanFor, setScanFor] = useState<MarRow | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/iv-mar", { cache: "no-store" });
      const j = await r.json();
      setRows(j.administrations || []);
      setOverdueCount((j.overdue || []).length);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  // Filter to next 24h + still-due to keep the screen actionable.
  const visible = rows
    .filter((r) => r.status === "due" || r.status === "wrong_time")
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  return (
    <main className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-600">IV MAR · Nursing</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">Medication administration</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Scheduled IV doses across the ward. Tap a row to scan the patient wristband + drug barcode.
          Refreshes every 30s.
        </p>
      </header>

      {overdueCount > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-rose-300 bg-rose-50 p-4 text-rose-900 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-100">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-sm font-bold">{overdueCount} overdue dose{overdueCount === 1 ? "" : "s"}</p>
              <p className="text-xs">Past scheduled time + not yet recorded. Escalated to shift lead.</p>
            </div>
          </div>
          <button
            onClick={refresh}
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white"
          >
            Refresh
          </button>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <p className="p-8 text-center text-sm text-slate-400">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">✓ All doses up to date. Check back in 30 s.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {visible.map((r) => {
              const now = Date.now();
              const due = new Date(r.scheduledAt).getTime();
              const diffMin = Math.round((due - now) / 60_000);
              const overdue = diffMin < 0;
              return (
                <li key={r.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-900 dark:text-slate-100">
                        {r.order?.drug || "Unknown drug"} {r.order?.dose && <span className="text-slate-500 dark:text-slate-400">{r.order.dose}</span>}
                      </p>
                      {r.order?.scheduleClass && (
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                          {r.order.scheduleClass === "X" ? "NDPS" : r.order.scheduleClass}
                        </span>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ${STATUS_PALETTE[r.status]}`}>
                        {r.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {r.order?.patientName} {r.order?.patientBedId && <>· Bed {r.order.patientBedId}</>} · {r.order?.frequency}
                      {r.order?.diluent && <> · in {r.order.diluent}</>}
                      {r.order?.rate && <> · {r.order.rate}</>}
                    </p>
                    <p className={`mt-0.5 text-xs ${overdue ? "font-bold text-rose-600" : "text-slate-500 dark:text-slate-400"}`}>
                      {overdue
                        ? `Overdue by ${-diffMin} min`
                        : diffMin < 60
                          ? `Due in ${diffMin} min`
                          : `Due at ${new Date(r.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                    </p>
                  </div>
                  <button
                    onClick={() => setScanFor(r)}
                    className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow"
                  >
                    Record dose
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {scanFor && (
        <ScanModal row={scanFor} onClose={() => setScanFor(null)} onDone={() => { setScanFor(null); refresh(); }} />
      )}
    </main>
  );
}

function ScanModal({ row, onClose, onDone }: { row: MarRow; onClose: () => void; onDone: () => void }) {
  const [patientScan, setPatientScan] = useState("");
  const [drugScan, setDrugScan] = useState("");
  const [witness, setWitness] = useState("");
  const [reason, setReason] = useState("");
  const [outcome, setOutcome] = useState<"given" | "held" | "refused">("given");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<null | { verified: boolean; status: string }>(null);
  const [error, setError] = useState<string | null>(null);
  const needsWitness = row.order?.scheduleClass === "X";

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/iv-mar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          administrationId: row.id,
          patientEmailScanned: patientScan,
          drugScanned: drugScan,
          witnessBy: witness || undefined,
          reason: reason || undefined,
          status: outcome,
        }),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || "Failed"); return; }
      setResult({ verified: j.verified, status: j.admin.status });
      // Auto-close on clean given.
      if (j.verified && j.admin.status === "given") setTimeout(onDone, 1200);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Record dose</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          {row.order?.drug} {row.order?.dose} for {row.order?.patientName}
        </p>

        <div className="mt-4 space-y-3">
          <Field label="Scan patient wristband (email or id)">
            <input
              value={patientScan}
              onChange={(e) => setPatientScan(e.target.value)}
              autoFocus
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              placeholder={row.order?.patientEmail}
            />
          </Field>
          <Field label="Scan drug barcode (drug name)">
            <input
              value={drugScan}
              onChange={(e) => setDrugScan(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              placeholder={row.order?.drug}
            />
          </Field>
          {needsWitness && (
            <Field label="Witness signature (NDPS required)">
              <input
                value={witness}
                onChange={(e) => setWitness(e.target.value)}
                className="w-full rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm"
                placeholder="Witness name / staff id"
              />
            </Field>
          )}
          <Field label="Outcome">
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as "given" | "held" | "refused")}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="given">Given</option>
              <option value="held">Held (clinical reason)</option>
              <option value="refused">Patient refused</option>
            </select>
          </Field>
          {outcome !== "given" && (
            <Field label="Reason">
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </Field>
          )}

          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
          {result && (
            <div className={`rounded-lg p-3 text-xs ${result.verified ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
              {result.verified ? "✓ 5 rights verified · " : "⚠ Verification mismatch · "}
              Recorded as: <strong>{result.status}</strong>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-slate-700">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={busy || !patientScan || !drugScan || (needsWitness && !witness)}
              className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-sm font-bold text-white shadow disabled:opacity-60"
            >
              {busy ? "Submitting…" : "Record"}
            </button>
          </div>
        </div>
      </div>
    </div>
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
