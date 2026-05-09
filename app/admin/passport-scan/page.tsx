"use client";

// Clinic-side passport scanner.
//
// Two input paths: (1) paste/scan-into the token textbox, (2) embed a
// camera scanner (deferred — most front desks have a USB scanner that
// types the token directly into the focused field).
//
// On submit we POST to /api/passport/scan; if consent is missing we
// surface a copy-and-paste deep-link the patient can open on their
// phone to grant. On success we render the bundle.

import { useState } from "react";

interface BundleResp {
  bundle: {
    patient: { name: string; medicalId: string; age?: number; sex?: string; isDependent: boolean; relationship?: string };
    allergies?: Array<{ drugName: string; severity?: string; reaction?: string }>;
    currentMeds?: Array<{ drugName: string; strength?: string }>;
    diagnoses?: Array<{ text: string; date?: string }>;
    prescriptions?: Array<{ at: string; doctor?: string; items: Array<{ drugName: string; strength?: string; dose?: string }> }>;
    scopes: string[];
    notice: string;
  };
  consent: { id: string; scopes: string[]; expiresAt: string | null; scanCount: number };
}

interface RejectResp {
  error: string;
  patient?: { name: string; medicalId: string; formattedMedicalId: string };
  requestUrl?: string;
}

const SCOPE_LABEL: Record<string, string> = {
  allergies: "Allergies", current_meds: "Current meds", diagnoses: "Diagnoses",
  prescriptions: "Prescriptions", vaccinations: "Vaccinations", vitals: "Vitals",
};

export default function PassportScanPage() {
  const [token, setToken] = useState("");
  const [scanning, setScanning] = useState(false);
  const [bundle, setBundle] = useState<BundleResp | null>(null);
  const [reject, setReject] = useState<RejectResp | null>(null);
  const [genericError, setGenericError] = useState<string | null>(null);

  const reset = () => { setToken(""); setBundle(null); setReject(null); setGenericError(null); };

  const submit = async () => {
    setBundle(null); setReject(null); setGenericError(null);
    const t = token.trim();
    if (!t) return;
    setScanning(true);
    try {
      const r = await fetch("/api/passport/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: t }),
      });
      if (r.ok) {
        setBundle(await r.json());
      } else {
        const body = await r.json().catch(() => ({}));
        if (body.error === "consent_required") setReject(body);
        else setGenericError(body.error || `Scan failed (${r.status})`);
      }
    } finally {
      setScanning(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Health Passport Scanner</h2>
        <p className="mt-1 text-sm text-gray-500">
          Scan or paste the patient&apos;s QR token. If they&apos;ve granted you access we&apos;ll surface their consented bundle. Otherwise you&apos;ll get a deep-link to send them so they can grant access from their phone.
        </p>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Patient passport token</p>
        <textarea
          value={token}
          onChange={(e) => setToken(e.target.value)}
          rows={2}
          placeholder="Paste the QR token here (or use a USB QR scanner that types into this field)"
          className="w-full rounded-lg border border-slate-300 bg-white p-3 font-mono text-xs"
          autoFocus
        />
        <div className="mt-3 flex gap-2">
          <button onClick={submit} disabled={scanning || !token.trim()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
            {scanning ? "Scanning…" : "Verify & read"}
          </button>
          <button onClick={reset} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Clear</button>
        </div>
      </div>

      {genericError && (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {genericError === "invalid_token" ? "Invalid passport token. Ask the patient to refresh their QR." : genericError}
        </div>
      )}

      {reject && (
        <div className="mt-4 rounded-2xl border-2 border-amber-300 bg-amber-50 p-5">
          <p className="text-sm font-bold text-amber-900">Patient identified — consent needed</p>
          <p className="mt-2 text-sm text-amber-800">
            <strong>{reject.patient?.name || "Patient"}</strong>{" "}
            <span className="font-mono text-xs text-amber-700">({reject.patient?.formattedMedicalId})</span> has not granted your clinic access to their health passport.
          </p>
          <p className="mt-3 text-xs text-amber-700">
            Ask the patient to tap this link on their own phone to grant consent. Once granted, scan again — your read will succeed instantly.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md bg-white p-2">
            <code className="flex-1 truncate text-xs text-slate-700">{reject.requestUrl}</code>
            <button
              onClick={() => navigator.clipboard?.writeText(`${window.location.origin}${reject.requestUrl}`)}
              className="rounded-md bg-amber-600 px-3 py-1 text-xs font-bold text-white"
            >
              Copy link
            </button>
          </div>
        </div>
      )}

      {bundle && (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Consent active — passport read</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {bundle.bundle.patient.name}
                  {bundle.bundle.patient.isDependent && <span className="ml-2 rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-bold uppercase text-pink-700">{bundle.bundle.patient.relationship || "dependent"}</span>}
                </p>
                <p className="font-mono text-xs text-slate-500">
                  {bundle.bundle.patient.medicalId.match(/.{1,4}/g)?.join("-")}
                  {bundle.bundle.patient.age !== undefined ? ` · ${bundle.bundle.patient.age}y` : ""}
                  {bundle.bundle.patient.sex ? ` · ${bundle.bundle.patient.sex}` : ""}
                </p>
              </div>
              <div className="text-right text-[11px] text-slate-500">
                <p>Scan #{bundle.consent.scanCount}</p>
                <p>{bundle.consent.expiresAt ? `expires ${new Date(bundle.consent.expiresAt).toLocaleString()}` : "no expiry"}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {bundle.consent.scopes.map((s) => (
                <span key={s} className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-emerald-800 ring-1 ring-emerald-200">
                  ✓ {SCOPE_LABEL[s] || s}
                </span>
              ))}
            </div>
          </div>

          {bundle.bundle.allergies && bundle.bundle.allergies.length > 0 && (
            <Section title="⚠ Allergies" tone="rose">
              <div className="flex flex-wrap gap-1.5">
                {bundle.bundle.allergies.map((a, i) => (
                  <span key={i} className="rounded-md bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-800">
                    {a.drugName}{a.severity ? <span className="ml-1 text-[10px] opacity-80">({a.severity})</span> : null}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {bundle.bundle.currentMeds && bundle.bundle.currentMeds.length > 0 && (
            <Section title="💊 Current medications" tone="sky">
              <ul className="text-sm">
                {bundle.bundle.currentMeds.map((m, i) => (
                  <li key={i} className="border-b border-sky-100 py-1.5 last:border-b-0">
                    <strong>{m.drugName}</strong>{m.strength ? ` ${m.strength}` : ""}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {bundle.bundle.diagnoses && bundle.bundle.diagnoses.length > 0 && (
            <Section title="📋 Recent diagnoses" tone="indigo">
              <ul className="text-sm">
                {bundle.bundle.diagnoses.map((d, i) => (
                  <li key={i} className="border-b border-indigo-100 py-1.5 last:border-b-0">
                    {d.text} {d.date && <span className="text-xs text-slate-500">· {new Date(d.date).toLocaleDateString()}</span>}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {bundle.bundle.prescriptions && bundle.bundle.prescriptions.length > 0 && (
            <Section title="℞ Recent prescriptions" tone="violet">
              <ul className="space-y-2 text-sm">
                {bundle.bundle.prescriptions.map((p, i) => (
                  <li key={i} className="rounded-md bg-violet-50 p-2">
                    <p className="text-xs text-slate-500">{new Date(p.at).toLocaleDateString()}{p.doctor ? ` · ${p.doctor}` : ""}</p>
                    <ul className="mt-1 list-disc pl-5 text-xs">
                      {p.items.map((x, j) => <li key={j}><strong>{x.drugName}</strong>{x.strength ? ` ${x.strength}` : ""}{x.dose ? ` · ${x.dose}` : ""}</li>)}
                    </ul>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <p className="rounded-md bg-slate-50 p-3 text-xs text-slate-600">{bundle.bundle.notice}</p>
        </div>
      )}
    </div>
  );
}

function Section({ title, tone, children }: { title: string; tone: "rose" | "sky" | "indigo" | "violet"; children: React.ReactNode }) {
  const cls = tone === "rose" ? "border-rose-200" : tone === "sky" ? "border-sky-200" : tone === "indigo" ? "border-indigo-200" : "border-violet-200";
  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm ${cls}`}>
      <p className="mb-2 text-sm font-bold text-slate-900">{title}</p>
      {children}
    </div>
  );
}
