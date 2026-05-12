"use client";

// Public anti-counterfeit medicine verification.
//
// Anyone — patient, pharmacist, doctor — types the brand + batch
// printed on the strip and (optionally) the reseller they bought
// it from. The API combines two registry checks:
//   1. Is this brand+batch in the pharma company's catalogue?
//   2. Is the reseller authorized to sell this brand?
// Returns one of: "verified" / "warning" / "counterfeit_risk" with
// machine-readable reasons we surface as plain English.
//
// Public on purpose — counterfeit verification has to work even
// before a user signs up. No PII captured, no audit log.

import { useState } from "react";

type Verdict = "verified" | "warning" | "counterfeit_risk";

interface VerifyResponse {
  verdict: Verdict;
  reasons: string[];
  drug?: {
    drug?: { brandName: string; genericName: string; composition?: string; strength?: string; manufacturerLicense: string; countryIso2: string };
    batch?: { batchNumber: string; manufacturedOn?: string; expiresOn?: string };
    match: "exact" | "brand_only";
  } | null;
  partner?: {
    status: string;
    partner?: { legalName: string; tradeName?: string; kind: string; address: string; city: string; state: string; pincode?: string; validUntil?: string };
  } | null;
}

const REASON_TEXT: Record<string, string> = {
  brand_not_in_registry: "Brand isn't in any pharma company's registered catalogue on OduDoc.",
  batch_not_in_registry: "The batch number isn't registered for this brand. Could be a misprint, or a counterfeit.",
  partner_not_in_registry: "The seller you named isn't a registered distributor or retailer for any pharma company.",
  partner_not_authorized_for_brand: "The seller is registered, but NOT authorized to sell this brand.",
  partner_authorization_expired: "The seller's authorization expired. Check whether they renewed.",
  partner_inactive: "The seller is registered but currently inactive.",
};

export default function VerifyMedicinePage() {
  const [brandName, setBrandName] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [partnerIdentifier, setPartnerIdentifier] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null); setResult(null);
    if (!brandName.trim()) { setError("Enter the brand name."); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/pharma/verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: brandName.trim(),
          batchNumber: batchNumber.trim() || undefined,
          partnerIdentifier: partnerIdentifier.trim() || undefined,
        }),
      });
      const data = await r.json().catch(() => null);
      if (!r.ok) { setError((data as { error?: string } | null)?.error || `Failed (${r.status})`); return; }
      setResult(data as VerifyResponse);
    } finally { setBusy(false); }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <header className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Anti-counterfeit check</p>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-slate-100 sm:text-4xl">Verify a medicine</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">
            Type what&apos;s printed on the strip. We check it against the pharma company&apos;s registry on OduDoc.
            Free, no sign-up, no data captured.
          </p>
        </header>

        <section className="rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
          <div className="grid grid-cols-1 gap-3">
            <Field label="Brand name (required)" value={brandName} onChange={setBrandName} placeholder="e.g. Crocin, Augmentin, Glycomet" />
            <Field label="Batch number" value={batchNumber} onChange={setBatchNumber} placeholder="Printed on the strip — e.g. AB1234" />
            <Field label="Seller / pharmacy (optional)" value={partnerIdentifier} onChange={setPartnerIdentifier} placeholder="Legal name, GSTIN, or drug license number" />
          </div>
          <button
            onClick={submit}
            disabled={busy || !brandName.trim()}
            className="mt-4 w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-md disabled:opacity-50"
          >
            {busy ? "Checking…" : "Verify"}
          </button>
          {error && <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
        </section>

        {result && <Verdict r={result} />}

        <p className="mt-8 text-center text-[10px] text-slate-400">
          Verification is informational. If you suspect a counterfeit, stop using the medicine and report to your local drug control authority.
        </p>
      </div>
    </main>
  );
}

function Verdict({ r }: { r: VerifyResponse }) {
  const tone = r.verdict === "verified" ? "border-emerald-300 bg-emerald-50"
    : r.verdict === "warning" ? "border-amber-300 bg-amber-50"
    : "border-rose-300 bg-rose-50";
  const text = r.verdict === "verified" ? "text-emerald-800"
    : r.verdict === "warning" ? "text-amber-800"
    : "text-rose-800";
  const emoji = r.verdict === "verified" ? "✓" : r.verdict === "warning" ? "⚠️" : "🚨";
  const headline = r.verdict === "verified" ? "Verified"
    : r.verdict === "warning" ? "Caution — partial match"
    : "Counterfeit risk";

  return (
    <section className={`mt-6 rounded-2xl border-2 p-6 ${tone}`}>
      <div className="flex items-center gap-3">
        <span className="text-3xl">{emoji}</span>
        <div>
          <p className={`text-lg font-extrabold ${text}`}>{headline}</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">{r.verdict === "verified" ? "Both checks cleared." : "See details below."}</p>
        </div>
      </div>

      {r.reasons.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Findings</p>
          <ul className="mt-1 list-disc pl-5 text-sm text-slate-700 dark:text-slate-300 space-y-1">
            {r.reasons.map((rsn) => <li key={rsn}>{REASON_TEXT[rsn] || rsn}</li>)}
          </ul>
        </div>
      )}

      {r.drug?.drug && (
        <div className="mt-4 rounded-xl bg-white/70 p-3 text-xs">
          <p className="font-bold text-slate-900 dark:text-slate-100">Brand match</p>
          <p className="mt-0.5 text-slate-700 dark:text-slate-300">
            <b>{r.drug.drug.brandName}</b>
            {r.drug.drug.genericName && <> · {r.drug.drug.genericName}</>}
            {r.drug.drug.strength && <> · {r.drug.drug.strength}</>}
          </p>
          {r.drug.drug.composition && <p className="text-slate-500 dark:text-slate-400">{r.drug.drug.composition}</p>}
          <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
            Mfr. license {r.drug.drug.manufacturerLicense} · {r.drug.drug.countryIso2}
            {" · match: "}
            <span className="font-semibold">{r.drug.match === "exact" ? "exact (brand + batch)" : "brand only"}</span>
          </p>
          {r.drug.batch && (
            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
              Batch <code className="rounded bg-slate-100 dark:bg-slate-800 px-1">{r.drug.batch.batchNumber}</code>
              {r.drug.batch.expiresOn && <> · expires {new Date(r.drug.batch.expiresOn).toLocaleDateString()}</>}
            </p>
          )}
        </div>
      )}

      {r.partner?.partner && (
        <div className="mt-3 rounded-xl bg-white/70 p-3 text-xs">
          <p className="font-bold text-slate-900 dark:text-slate-100">Seller match</p>
          <p className="mt-0.5 text-slate-700 dark:text-slate-300">
            <b>{r.partner.partner.legalName}</b>
            {r.partner.partner.tradeName && <> · {r.partner.partner.tradeName}</>}
            <span className="ml-1 rounded-full bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] uppercase tracking-wider">{r.partner.partner.kind}</span>
          </p>
          <p className="text-slate-500 dark:text-slate-400">{r.partner.partner.address}, {r.partner.partner.city}, {r.partner.partner.state}{r.partner.partner.pincode ? ` ${r.partner.partner.pincode}` : ""}</p>
          <p className="mt-1 text-[10px]">
            Status: <span className="font-semibold">{r.partner.status.replace(/_/g, " ")}</span>
            {r.partner.partner.validUntil && <> · valid till {new Date(r.partner.partner.validUntil).toLocaleDateString()}</>}
          </p>
        </div>
      )}
    </section>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
      {label}
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-lg border border-slate-300 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-normal" />
    </label>
  );
}
