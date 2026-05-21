"use client";

// V16 — Scanner view (doctor / nurse / reception).
//
// Paste or scan the token. Server validates the four security
// gates (existence, revocation, window, scanner role) and returns
// the scoped payload. Failures display a clear, specific reason.

import { useState } from "react";

interface ScanResponse {
  ok?: boolean;
  error?: string;
  payload?: {
    patientId: string;
    fields: string[];
    data: Record<string, unknown>;
    kind: string;
    contextKind?: string;
    contextId?: string;
    dataFromDate?: string;
    dataToDate?: string;
    scannedAt: string;
    scannedBy: string;
  };
}

const ERR_MSG: Record<string, string> = {
  not_found:     "Token not found. The code may be fake or already deleted.",
  revoked:       "This QR has been revoked by the patient. They no longer authorise this access.",
  expired:       "This QR has expired. Ask the patient to re-issue.",
  consumed:      "This QR was single-use and has already been scanned.",
  wrong_role:    "Your role isn't authorised to scan this QR kind.",
  wrong_doctor:  "This consent QR is pre-authorised for a different doctor.",
  not_yet_valid: "This QR isn't valid yet. Try again at the appointment time.",
  unauthenticated: "Sign in before scanning.",
};

export default function QrScannerPage() {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScanResponse | null>(null);

  const scan = async () => {
    if (!token.trim()) return;
    setBusy(true);
    setResult(null);
    try {
      const r = await fetch(`/api/qr/${encodeURIComponent(token.trim())}/scan`, { method: "POST" });
      const j = await r.json().catch(() => ({}));
      setResult(j as ScanResponse);
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Patient QR scanner</h1>
        <p className="mt-1 text-sm text-gray-600">
          V16 — paste the token from a scanned QR (or wire a hardware
          camera scanner that POSTs here). Every scan is logged in
          the V13 accountability feed.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">Token</label>
        <div className="mt-2 flex gap-2">
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && scan()}
            placeholder="Paste the token from the scanned QR"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
          />
          <button onClick={scan} disabled={busy || !token.trim()} className="rounded-xl bg-[#0F6E56] px-5 py-2 text-sm font-bold text-white hover:bg-[#0A5942] disabled:opacity-60">
            {busy ? "Resolving…" : "Scan"}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Patient receives a real-time notification on every scan.
          Misuse is visible to platform admin within 10 seconds.
        </p>
      </div>

      {result && (
        result.error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
            <p className="font-bold text-rose-900">Scan rejected</p>
            <p className="mt-1 text-sm text-rose-800">{ERR_MSG[result.error] || `Error: ${result.error}`}</p>
          </div>
        ) : result.payload ? (
          <ScanResult payload={result.payload} />
        ) : null
      )}
    </div>
  );
}

const FIELD_LABELS: Record<string, string> = {
  identity: "Identity",
  allergies: "Allergies",
  blood_group: "Blood group",
  chronic_conditions: "Chronic conditions",
  current_medications: "Current medications",
  ice_contacts: "Emergency contacts",
  abha_id: "ABHA / national health ID",
  recent_consultations: "Last 5 consultations",
  recent_prescriptions: "Last 5 prescriptions",
  recent_lab_results: "Recent lab results",
  active_admission: "Active admission",
  vital_signs_24h: "Vital signs (last 24 h)",
  vaccinations: "Vaccinations",
  discharge_summaries: "Discharge summaries",
};

function ScanResult({ payload }: { payload: NonNullable<ScanResponse["payload"]> }) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">{payload.kind} QR · authorised</p>
          <p className="mt-1 text-lg font-bold text-emerald-900">Patient {payload.patientId}</p>
          <p className="text-xs text-emerald-800">
            Scanned by {payload.scannedBy} at {new Date(payload.scannedAt).toLocaleString()}
            {payload.dataFromDate && payload.dataToDate && ` · data window ${payload.dataFromDate} → ${payload.dataToDate}`}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {payload.fields.map((f) => (
          <FieldBlock key={f} field={f} value={payload.data[f]} />
        ))}
      </div>
    </div>
  );
}

function FieldBlock({ field, value }: { field: string; value: unknown }) {
  const label = FIELD_LABELS[field] || field;
  return (
    <div className="rounded-lg border border-emerald-200 bg-white p-3">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</p>
      <div className="mt-1 text-sm text-gray-800">
        {renderValue(value)}
      </div>
    </div>
  );
}

function renderValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined || value === "") return <span className="text-gray-400">No data on file</span>;
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-gray-400">None recorded</span>;
    return (
      <ul className="space-y-1">
        {value.map((v, i) => (
          <li key={i} className="rounded bg-gray-50 px-2 py-1 text-xs">
            {typeof v === "object" && v !== null
              ? Object.entries(v as Record<string, unknown>).filter(([, vv]) => vv).map(([k, vv]) => `${k}: ${String(vv)}`).join(" · ")
              : String(v)
            }
          </li>
        ))}
      </ul>
    );
  }
  if (typeof value === "object") {
    return (
      <dl className="grid gap-1 text-xs sm:grid-cols-2">
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <dt className="text-gray-500">{k}</dt>
            <dd className="font-medium text-gray-900">{String(v ?? "—")}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return <span>{String(value)}</span>;
}
