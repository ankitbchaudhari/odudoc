"use client";

// Demo wizard — one-click "this hospital just signed up; fill every
// store with realistic data so the entire platform demos in 60s".

import { useState } from "react";

interface SeedReport {
  rosterStaffCreated: number;
  rosterStaffSkipped: number;
  procurementSkusCreated: number;
  pharmacyStockCreated: number;
  pharmacyStockSeeded: string[];
  tpaEmpanelmentsCreated: number;
  teleIcuBedsCreated: number;
  notes: string[];
}

export default function DemoWizardPage() {
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<SeedReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/demo-wizard", { method: "POST" });
      if (r.ok) setReport((await r.json()).report);
      else {
        const body = await r.json().catch(() => ({}));
        setError(body.error || `Failed (${r.status})`);
      }
    } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Demo Wizard</h2>
        <p className="mt-1 text-sm text-gray-500">
          One click → 16 staff, 10 procurement SKUs, 3 pharmacy partners with stock, 5 TPA empanelments, 6 ICU beds. The platform lights up across every console.
        </p>
      </div>

      {error && <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-700">
          Active-org context required (use the org-switcher in the header). The wizard will skip rows that already exist for this org.
        </p>
        <button onClick={run} disabled={busy} className="mt-4 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
          {busy ? "Seeding…" : "Run wizard for active org"}
        </button>
      </div>

      {report && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
          <p className="text-lg font-bold text-emerald-900">✓ Done</p>
          <ul className="mt-3 space-y-1 text-sm text-emerald-900">
            <li>• Roster staff: <strong>{report.rosterStaffCreated} created</strong>{report.rosterStaffSkipped > 0 ? ` · ${report.rosterStaffSkipped} skipped` : ""}</li>
            <li>• Procurement SKUs: <strong>{report.procurementSkusCreated} created</strong></li>
            <li>• Pharmacy stock: <strong>{report.pharmacyStockCreated} entries across {report.pharmacyStockSeeded.length} pharmac{report.pharmacyStockSeeded.length === 1 ? "y" : "ies"}</strong></li>
            <li>• TPA empanelments: <strong>{report.tpaEmpanelmentsCreated} added</strong></li>
            <li>• Tele-ICU beds: <strong>{report.teleIcuBedsCreated} created</strong></li>
          </ul>
          {report.notes.length > 0 && (
            <div className="mt-4 rounded-lg bg-white p-3 text-xs text-slate-700">
              <p className="font-semibold">Next steps:</p>
              <ul className="mt-1 list-disc pl-5">
                {report.notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
