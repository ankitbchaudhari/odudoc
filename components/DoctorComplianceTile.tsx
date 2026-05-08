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

  const refreshStripe = async () => {
    try {
      const r = await fetch("/api/doctors/me/stripe/status", { cache: "no-store" });
      if (r.ok) setStripe(await r.json());
    } catch {
      // Network blip — leave the existing state alone.
    }
  };

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

  // When the doctor returns from the Stripe-hosted form via
  // /dashboard/doctor?stripe=return, Stripe sometimes hasn't yet
  // flipped account.details_submitted to true — there's a 30-90s
  // sync delay. Re-fetch status a few times after a return so the
  // tile reflects reality without forcing the doctor to F5.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe") !== "return") return;
    let attempts = 0;
    const id = window.setInterval(() => {
      attempts++;
      refreshStripe();
      if (attempts >= 6) window.clearInterval(id);
    }, 5000);
    return () => window.clearInterval(id);
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
            {!me.verified && (
              <div className="mt-2.5">
                <a
                  href="/dashboard/doctor"
                  className="inline-block rounded-lg bg-gradient-to-r from-amber-500 to-rose-500 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  Start verification →
                </a>
              </div>
            )}
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

          {/* Stripe Connect — needs to be unmistakable. The CTA is the
              single most-important action a verified doctor needs to
              take to start earning, so render the button row whenever
              we're not in the "Ready" state and make it big. */}
          <li className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900">Stripe payouts</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {stripeReady
                    ? "Ready — payouts will land on your connected bank."
                    : stripePartial
                      ? "Onboarding incomplete — finish the Stripe form to receive payouts."
                      : "Not connected — connect a Stripe account to receive earnings."}
                </p>
              </div>
              <span
                className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
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
              <div className="mt-3 space-y-2">
                {/* Primary CTA — full-width, large, gradient. Cannot be
                    missed even on a small phone viewport. */}
                <button
                  onClick={() => startStripe(stripeMissing ? "onboard" : "refresh")}
                  disabled={busy}
                  className="block w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 text-center text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 sm:text-base"
                >
                  {busy
                    ? "Opening Stripe…"
                    : stripeMissing
                      ? "Connect Stripe account →"
                      : "Resume Stripe onboarding →"}
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={refreshStripe}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    title="Re-check Stripe — useful if you finished the form in another window."
                  >
                    ↻ Refresh status
                  </button>
                  <span className="text-[11px] text-slate-500">
                    Just finished the Stripe form? Click <b>Refresh status</b> — it can take up to a minute to sync.
                  </span>
                </div>

                {error && (
                  <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    {error}
                  </p>
                )}
              </div>
            )}
          </li>
        </ul>
      </div>
    </section>
  );
}
