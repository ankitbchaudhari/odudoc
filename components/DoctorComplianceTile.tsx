"use client";

// Compliance + payouts status card for the doctor dashboard.
//
// Renders three rows the doctor genuinely needs to act on:
//   1. Verification — am I admin-verified yet? (read-only badge)
//   2. Stripe Connect — is my payout account fully onboarded?
//      One-click buttons to start / resume the Connect flow.
//   3. License — when does it expire? Visual urgency states for
//      <30 days / <14 days / <3 days / expired.
//
// Mounts a light fetch chain on first paint:
//   GET /api/doctors/me              — verified + license fields
//   GET /api/doctors/me/stripe/status — onboarding state
//
// All click handlers post to /onboard or /refresh and follow the
// returned link. Designed to hide itself when the doctor isn't logged
// in (the parent dashboard will already have shown a sign-in prompt).

import { useEffect, useState } from "react";

interface DoctorMe {
  id: string;
  email: string;
  verified?: boolean;
  verifiedAt?: string;
  licenseCountry?: string;
  licenseNumber?: string;
  licenseExpiry?: string; // ISO date
}

interface StripeStatus {
  connected: boolean;
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  requirements?: { currently_due?: string[]; past_due?: string[] } | null;
}

const DAY = 24 * 60 * 60 * 1000;

function expiryUrgency(iso?: string): {
  label: string;
  cls: string;
} {
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

export default function DoctorComplianceTile() {
  const [me, setMe] = useState<DoctorMe | null>(null);
  const [stripe, setStripe] = useState<StripeStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/doctors/me", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/doctors/me/stripe/status", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([meJson, stripeJson]) => {
        if (cancelled) return;
        setMe(meJson?.doctor ?? null);
        setStripe(stripeJson ?? null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const startStripe = async (kind: "onboard" | "refresh") => {
    setError(null);
    setBusy(true);
    try {
      const r = await fetch(`/api/doctors/me/stripe/${kind}`, { method: "POST" });
      const j = await r.json();
      if (!r.ok || !j.url) {
        setError(j.error || `Stripe ${kind} failed (${r.status})`);
        return;
      }
      window.location.href = j.url;
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!me) return null;
  const urg = expiryUrgency(me.licenseExpiry);
  const stripeReady = stripe?.connected && stripe?.payoutsEnabled && stripe?.detailsSubmitted;
  const stripeMissing = !stripe?.connected;
  const stripePartial = stripe?.connected && (!stripe?.payoutsEnabled || !stripe?.detailsSubmitted);

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
          <li className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
            <div>
              <p className="font-semibold text-gray-900">Identity verified</p>
              <p className="text-xs text-gray-500">
                {me.verified
                  ? `Verified${me.verifiedAt ? ` on ${new Date(me.verifiedAt).toLocaleDateString()}` : ""}`
                  : "Pending — admin will email you when complete."}
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

          {/* Stripe Connect */}
          <li className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">Stripe payouts</p>
                <p className="text-xs text-gray-500">
                  {stripeReady
                    ? "Ready — payouts will land on your connected bank."
                    : stripePartial
                      ? "Onboarding incomplete — finish the Stripe form to receive payouts."
                      : "Not connected — you must connect a Stripe account to receive earnings."}
                </p>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
                  stripeReady
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    : stripePartial
                      ? "bg-amber-50 text-amber-700 ring-amber-200"
                      : "bg-rose-50 text-rose-700 ring-rose-200"
                }`}
              >
                {stripeReady ? "Ready" : stripePartial ? "Incomplete" : "Not connected"}
              </span>
            </div>
            {!stripeReady && (
              <div className="mt-2.5 flex flex-wrap gap-2">
                <button
                  onClick={() => startStripe(stripeMissing ? "onboard" : "refresh")}
                  disabled={busy}
                  className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"
                >
                  {busy
                    ? "Opening Stripe…"
                    : stripeMissing
                      ? "Connect Stripe →"
                      : "Resume onboarding →"}
                </button>
                {error && <p className="text-xs text-rose-600">{error}</p>}
              </div>
            )}
          </li>
        </ul>
      </div>
    </section>
  );
}
