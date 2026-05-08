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

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/doctors/me", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/doctors/me/payout", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([meJson, payoutJson]) => {
        if (cancelled) return;
        setMe(meJson?.doctor ?? null);
        setPayout(payoutJson?.payout ?? null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!me) return null;
  const urg = expiryUrgency(me.licenseExpiry);
  const payoutReady = !!(payout && payout.method && payoutSummary(payout));

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

          {/* License expiry */}
          <li className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
            <div>
              <p className="font-semibold text-gray-900">Medical license</p>
              <p className="text-xs text-gray-500">
                {me.licenseNumber ? `${me.licenseCountry || ""} · ${me.licenseNumber}` : "Not on file"}
              </p>
            </div>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${urg.cls}`}>
              {urg.label}
            </span>
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
