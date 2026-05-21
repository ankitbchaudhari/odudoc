"use client";

// V15 — universal scanner. One input, 12 contexts, auto-routed.

import { useState } from "react";

interface DispatchResult {
  context: string;
  label: string;
  payload?: Record<string, unknown>;
  nextAction?: { label: string; endpoint?: string; method?: string; body?: Record<string, unknown> };
  error?: string;
}

const CONTEXT_PILL: Record<string, string> = {
  qr_token:               "bg-emerald-100 text-emerald-800 border-emerald-300",
  opd_token:              "bg-sky-100 text-sky-800 border-sky-300",
  drug_pack_serial:       "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300",
  pharmacy_stock_barcode: "bg-amber-100 text-amber-800 border-amber-300",
  lab_sample:             "bg-indigo-100 text-indigo-800 border-indigo-300",
  vaccine_vial:           "bg-cyan-100 text-cyan-800 border-cyan-300",
  blood_unit:             "bg-rose-100 text-rose-800 border-rose-300",
  equipment_asset:        "bg-slate-100 text-slate-800 border-slate-300",
  prescription:           "bg-teal-100 text-teal-800 border-teal-300",
  insurance_card:         "bg-violet-100 text-violet-800 border-violet-300",
  mar_drug_barcode:       "bg-orange-100 text-orange-800 border-orange-300",
  unknown:                "bg-gray-100 text-gray-700 border-gray-300",
};

const ERR_MSG: Record<string, string> = {
  empty_code: "Scan or paste a code.",
  unrecognised: "Unrecognised code shape. Manual lookup needed.",
  unauthenticated: "Sign in before scanning (anti-counterfeit verification is the only public scan).",
  not_found: "Code not found in the registry.",
  revoked: "QR has been revoked by the patient.",
  expired: "QR has expired.",
  consumed: "Single-use QR already scanned.",
  wrong_role: "Your role isn't authorised to scan this code.",
  wrong_doctor: "Consent QR pre-authorised for a different doctor.",
  drug_not_in_master: "This drug barcode isn't linked to the drug master yet.",
};

export default function ScannerPage() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DispatchResult | null>(null);

  const scan = async () => {
    if (!code.trim()) return;
    setBusy(true);
    setResult(null);
    try {
      const r = await fetch("/api/scanner/dispatch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const j = await r.json();
      setResult(j);
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Universal scanner</h1>
        <p className="mt-1 text-sm text-gray-600">
          V15 — one scanner for 12 contexts. Paste / scan a code below and
          OduDoc Pro figures out what it is. Every scan is logged.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">Scan code</label>
        <div className="mt-2 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && scan()}
            placeholder="Paste any code — QR token, OPD T-NNN, drug pack serial, barcode, lab/blood/vaccine ID, …"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
            autoFocus
          />
          <button onClick={scan} disabled={busy || !code.trim()} className="rounded-xl bg-[#0F6E56] px-5 py-2 text-sm font-bold text-white hover:bg-[#0A5942] disabled:opacity-60">
            {busy ? "Resolving…" : "Scan"}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Recognises: V16 patient QR, V17 OPD token, V7 anti-counterfeit pack, lab / vaccine / blood / equipment IDs, Rx, insurance card, MAR drug barcode, pharmacy stock barcode (EAN-13 / DRG-…).
        </p>
      </div>

      {result && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold ${CONTEXT_PILL[result.context] || CONTEXT_PILL.unknown}`}>
              {result.label}
            </span>
            {result.error && (
              <span className="rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                {ERR_MSG[result.error] || result.error}
              </span>
            )}
          </div>

          {result.payload && (
            <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-gray-50 p-3 text-xs font-mono text-gray-800">
              {JSON.stringify(result.payload, null, 2)}
            </pre>
          )}

          {result.nextAction && (
            <div className="mt-4 rounded-lg border border-[#0F6E56]/40 bg-[#0F6E56]/5 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#0F6E56]">Next action</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">{result.nextAction.label}</p>
              {result.nextAction.endpoint && (
                <p className="mt-1 font-mono text-[11px] text-gray-600">
                  {result.nextAction.method || "GET"} {result.nextAction.endpoint}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <ScanLegend />
    </div>
  );
}

function ScanLegend() {
  const contexts: Array<{ key: string; label: string; example: string }> = [
    { key: "qr_token", label: "Patient QR (V16)", example: "44-char base64url" },
    { key: "opd_token", label: "OPD token (V17)", example: "T-042" },
    { key: "drug_pack_serial", label: "Medicine pack (V7 §3.6)", example: "B-XYZ-AB12CD34EF" },
    { key: "pharmacy_stock_barcode", label: "Pharmacy stock (V15 §4)", example: "8901030801234 or DRG-…" },
    { key: "lab_sample", label: "Lab sample tube", example: "LAB-ord_xxx-1" },
    { key: "vaccine_vial", label: "Vaccine vial", example: "VAX-…" },
    { key: "blood_unit", label: "Blood unit", example: "BLD-…" },
    { key: "equipment_asset", label: "Equipment / asset", example: "EQP-…" },
    { key: "prescription", label: "Prescription", example: "RX-rx_xxx" },
    { key: "insurance_card", label: "Insurance card", example: "INS-POL-0001" },
    { key: "mar_drug_barcode", label: "MAR drug barcode", example: "MAR-…" },
    { key: "unknown", label: "Anything else", example: "manual lookup" },
  ];
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-600">12 scanner contexts</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {contexts.map((c) => (
          <div key={c.key} className="flex items-center gap-2 text-xs">
            <span className={`shrink-0 rounded border px-2 py-0.5 font-bold ${CONTEXT_PILL[c.key]}`}>{c.label}</span>
            <span className="truncate font-mono text-gray-500">{c.example}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
