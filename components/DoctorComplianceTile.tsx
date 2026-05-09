"use client";

// Compliance + payouts status card for the doctor dashboard.
//
// Renders three rows the doctor genuinely needs to act on:
//   1. Verification — am I admin-verified yet?
//   2. License — when does it expire?
//   3. Payout details — have I told us how to pay you?
//
// Stripe Connect was previously here; we've moved to a universal
// manual payout flow that works in every country we operate in.

import { useEffect, useState } from "react";
import { ISO_COUNTRIES, detectIsoCountry } from "@/lib/iso-countries";

interface DoctorMe {
  id: string;
  email: string;
  verified?: boolean;
  verifiedAt?: string;
  licenseCountry?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
}

interface PayoutDetails {
  method?: "bank" | "paypal" | "wise" | "upi" | "other";
  accountHolder?: string;
  bankName?: string;
  accountNumber?: string;
  paypalEmail?: string;
  upiId?: string;
  updatedAt?: string;
}

const DAY = 24 * 60 * 60 * 1000;

function expiryUrgency(iso?: string): { label: string; cls: string } {
  if (!iso) return { label: "—", cls: "text-gray-400" };
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return { label: "—", cls: "text-gray-400" };
  const days = Math.floor((ms - Date.now()) / DAY);
  if (days < 0) return { label: "Expired", cls: "text-rose-700 bg-rose-50 ring-rose-200" };
  if (days <= 3) return { label: `Expires in ${days}d`, cls: "text-rose-700 bg-rose-50 ring-rose-200" };
  if (days <= 14) return { label: `Expires in ${days}d`, cls: "text-amber-700 bg-amber-50 ring-amber-200" };
  if (days <= 30) return { label: `Expires in ${days}d`, cls: "text-amber-700 bg-amber-50 ring-amber-200" };
  return { label: iso, cls: "text-emerald-700 bg-emerald-50 ring-emerald-200" };
}

function payoutSummary(p: PayoutDetails | null): string {
  if (!p || !p.method) return "";
  if (p.method === "bank") {
    const tail = p.accountNumber ? `••••${p.accountNumber.slice(-4)}` : "";
    return [p.bankName, tail].filter(Boolean).join(" · ");
  }
  if (p.method === "paypal") return p.paypalEmail || "PayPal";
  if (p.method === "upi") return p.upiId || "UPI";
  if (p.method === "wise") return p.paypalEmail || "Wise";
  return "Custom method";
}

function methodLabel(m?: PayoutDetails["method"]): string {
  switch (m) {
    case "bank": return "Bank transfer";
    case "paypal": return "PayPal";
    case "wise": return "Wise";
    case "upi": return "UPI";
    case "other": return "Other";
    default: return "";
  }
}

export default function DoctorComplianceTile() {
  const [me, setMe] = useState<DoctorMe | null>(null);
  const [payout, setPayout] = useState<PayoutDetails | null>(null);
  // License-form state — collapsed by default. Opens when the doctor
  // clicks "Add" / "Edit" on the Medical license row.
  const [licenseOpen, setLicenseOpen] = useState(false);
  const [licenseBusy, setLicenseBusy] = useState(false);
  const [licenseMsg, setLicenseMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [licenseForm, setLicenseForm] = useState({
    country: "",
    number: "",
    expiry: "",
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/doctors/me", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/doctors/me/payout", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([meJson, payoutJson]) => {
        if (cancelled) return;
        const doc = meJson?.doctor ?? null;
        setMe(doc);
        setPayout(payoutJson?.payout ?? null);
        // Pre-fill the license form with whatever's already on file
        // so an "Edit" click doesn't blank out existing values.
        if (doc) {
          setLicenseForm({
            country: doc.licenseCountry || detectIsoCountry(),
            number: doc.licenseNumber || "",
            expiry: doc.licenseExpiry || "",
          });
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const saveLicense = async () => {
    if (!me) return;
    setLicenseBusy(true);
    setLicenseMsg(null);
    try {
      const res = await fetch("/api/doctors/me/license", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          country: licenseForm.country,
          number: licenseForm.number,
          expiry: licenseForm.expiry || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLicenseMsg({ kind: "err", text: data.error || `Save failed (${res.status})` });
        return;
      }
      setMe({
        ...me,
        licenseCountry: data.licenseCountry,
        licenseNumber: data.licenseNumber,
        licenseExpiry: data.licenseExpiry,
      });
      setLicenseMsg({ kind: "ok", text: "✓ License saved." });
      setTimeout(() => {
        setLicenseOpen(false);
        setLicenseMsg(null);
      }, 1200);
    } catch (err) {
      setLicenseMsg({ kind: "err", text: (err as Error).message || "Network error" });
    } finally {
      setLicenseBusy(false);
    }
  };

  if (!me) return null;
  const urg = expiryUrgency(me.licenseExpiry);
  const payoutReady = !!(payout && payout.method && payoutSummary(payout));
  const hasLicense = Boolean(me.licenseNumber);

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="h-1 bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500" />
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Compliance &amp; payouts</h3>
          <span className="text-xs text-gray-400">Status</span>
        </div>

        <ul className="space-y-3 text-sm">
          {/* Verification */}
          <li className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">Identity verified</p>
                <p className="text-xs text-gray-500">
                  {me.verified
                    ? `Verified${me.verifiedAt ? ` on ${new Date(me.verifiedAt).toLocaleDateString()}` : ""}`
                    : "Submit ID + selfie + license documents to activate your dashboard."}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
                  me.verified
                    ? "bg-gradient-to-r from-sky-50 to-blue-50 text-sky-700 ring-sky-200"
                    : "bg-amber-50 text-amber-700 ring-amber-200"
                }`}
              >
                {me.verified ? "✓ Verified" : "Pending"}
              </span>
            </div>
          </li>

          {/* Medical license — now editable inline so doctors can
              add or update it without going through the admin
              verification flow. Identity-critical so we POST to a
              dedicated /api/doctors/me/license endpoint with strict
              validation rather than the open PATCH on /api/doctors/me. */}
          <li className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">Medical license</p>
                <p className="text-xs text-gray-500">
                  {hasLicense
                    ? `${me.licenseCountry || ""} · ${me.licenseNumber}`
                    : "Not on file — add your medical board registration to complete your card."}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {hasLicense && (
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${urg.cls}`}>
                    {urg.label}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setLicenseOpen((v) => !v)}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                    hasLicense
                      ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      : "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-sm hover:-translate-y-0.5"
                  }`}
                >
                  {hasLicense ? (licenseOpen ? "Cancel" : "Edit") : "Add license"}
                </button>
              </div>
            </div>

            {licenseOpen && (
              <div className="mt-3 grid gap-3 rounded-xl border border-sky-100 bg-white p-3 sm:grid-cols-3">
                <label className="block text-xs">
                  <span className="font-bold uppercase tracking-wider text-slate-500">Country</span>
                  <select
                    value={licenseForm.country}
                    onChange={(e) => setLicenseForm({ ...licenseForm, country: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  >
                    <option value="">Select…</option>
                    {ISO_COUNTRIES.map((c) => (
                      <option key={c.iso} value={c.iso}>{c.iso} — {c.name}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs">
                  <span className="font-bold uppercase tracking-wider text-slate-500">License number</span>
                  <input
                    value={licenseForm.number}
                    onChange={(e) => setLicenseForm({ ...licenseForm, number: e.target.value })}
                    placeholder="e.g. ME12345 / MCI-67890"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="block text-xs">
                  <span className="font-bold uppercase tracking-wider text-slate-500">Expiry (optional)</span>
                  <input
                    type="date"
                    value={licenseForm.expiry}
                    onChange={(e) => setLicenseForm({ ...licenseForm, expiry: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  />
                </label>
                <div className="sm:col-span-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={saveLicense}
                    disabled={licenseBusy || !licenseForm.country || !licenseForm.number}
                    className="rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {licenseBusy ? "Saving…" : "Save license"}
                  </button>
                  {licenseMsg && (
                    <span className={`text-xs font-semibold ${licenseMsg.kind === "ok" ? "text-emerald-700" : "text-rose-700"}`}>
                      {licenseMsg.text}
                    </span>
                  )}
                </div>
                <p className="sm:col-span-3 text-[11px] text-slate-500">
                  This is your medical board / council registration number
                  (e.g. State Medical Council in India, GMC in the UK,
                  state license # in the US). It appears on your ID card
                  and is shown to patients.
                </p>
              </div>
            )}
          </li>

          {/* Manual payout — universal, country-agnostic. Doctor enters
              bank / PayPal / Wise / UPI / other, admin processes
              payouts off-platform. */}
          <li className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900">Payout details</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {payoutReady
                    ? `${methodLabel(payout?.method)} · ${payoutSummary(payout)}`
                    : "Add your bank, PayPal, Wise, UPI, or other payout details so we can send your earnings."}
                </p>
              </div>
              <span
                className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
                  payoutReady
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    : "bg-rose-50 text-rose-700 ring-rose-200"
                }`}
              >
                {payoutReady ? "On file" : "Required"}
              </span>
            </div>

            <div className="mt-3">
              <a
                href="/dashboard/doctor/payout"
                className="block w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 text-center text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg sm:text-base"
              >
                {payoutReady ? "Update payout details →" : "Add payout details →"}
              </a>
              <p className="mt-2 text-[11px] text-slate-500">
                Payouts are processed manually by our finance team every 7–14 days. Works in every country.
              </p>
            </div>
          </li>
        </ul>
      </div>
    </section>
  );
}
