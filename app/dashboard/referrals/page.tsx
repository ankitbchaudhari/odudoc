"use client";

// Universal referral dashboard — works for both patients and
// doctors. Shows the user's code, a copyable share link, current
// credit balance, pending vs qualified counts, and a recent-rows
// timeline.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface ReferralRow {
  id: string;
  refereeEmail: string;
  status: "pending" | "qualified" | "void";
  rewardEachCents: number;
  currency: string;
  createdAt: string;
  qualifiedAt?: string;
}

interface MeResponse {
  code: string;
  shareUrl: string;
  doctorShareUrl: string;
  creditCents: number;
  currency: string;
  rewardEachCents: number;
  doctorRewardEachCents: number;
  role: string;
  stats: {
    pending: number;
    qualified: number;
    totalEarnedCents: number;
    recent: ReferralRow[];
  };
}

function formatMoney(cents: number, currency: string): string {
  return `${currency === "USD" ? "$" : ""}${(cents / 100).toFixed(2)}`;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return iso.slice(0, 10);
}

export default function ReferralsPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"code" | "url" | null>(null);
  const [claimCode, setClaimCode] = useState("");
  const [claimBusy, setClaimBusy] = useState(false);
  const [claimResult, setClaimResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/referral-program/me", {
        cache: "no-store",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not load");
      }
      const data: MeResponse = await res.json();
      setMe(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // If the user landed here with ?ref=CODE in the URL (typical for
  // newly-registered users coming back to claim their code), auto-
  // populate the input.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) setClaimCode(ref.toUpperCase());
  }, []);

  async function copyText(value: string, kind: "code" | "url") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      window.prompt("Copy:", value);
    }
  }

  async function shareNative() {
    if (!me) return;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({
          title: "OduDoc — get $10 toward your first consultation",
          text: `Use my code ${me.code} on OduDoc and we both get $${(me.rewardEachCents / 100).toFixed(0)} in credit when you book your first consultation.`,
          url: me.shareUrl,
        });
      } catch {
        // user cancelled — no-op
      }
    } else {
      copyText(me.shareUrl, "url");
    }
  }

  async function submitClaim() {
    if (!claimCode || claimCode.trim().length < 4) {
      setClaimResult("Enter a referral code first.");
      return;
    }
    setClaimBusy(true);
    setClaimResult(null);
    try {
      const res = await fetch("/api/referral-program/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: claimCode.trim().toUpperCase(), source: "dashboard" }),
      });
      const data = await res.json();
      if (data.ok) {
        setClaimResult("✓ Code applied. You'll both get credit on your first paid consultation.");
        setClaimCode("");
        load();
      } else {
        const reasons: Record<string, string> = {
          invalid_code: "That code doesn't match any user.",
          self_referral: "You can't refer yourself — share your own code instead.",
          already_referred: "You've already claimed a referral. Only one per account.",
        };
        setClaimResult(reasons[data.reason] || data.error || "Could not apply code.");
      }
    } catch (err) {
      setClaimResult(err instanceof Error ? err.message : "Apply failed");
    } finally {
      setClaimBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-10">
        <div className="mx-auto max-w-4xl px-4">
          <div className="h-44 animate-pulse rounded-3xl bg-slate-200" />
        </div>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="rounded-3xl bg-white p-8 text-center shadow">
          <p className="text-sm text-slate-700">{error || "Sign in to view your referral dashboard."}</p>
          <Link
            href="/auth/signin"
            className="mt-3 inline-block text-sm font-semibold text-indigo-600 hover:underline"
          >
            Sign in →
          </Link>
        </div>
      </div>
    );
  }

  const reward = formatMoney(me.rewardEachCents, me.currency);
  const doctorReward = formatMoney(me.doctorRewardEachCents, me.currency);

  async function copyDoctorLink() {
    if (!me) return;
    await copyText(me.doctorShareUrl, "url");
  }

  async function shareDoctorLink() {
    if (!me) return;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({
          title: `OduDoc — refer a doctor, earn ${doctorReward}`,
          text: `Hey, I'm on OduDoc and they're paying ${doctorReward} when a doctor I refer joins and gets verified. Sign up here:`,
          url: me.doctorShareUrl,
        });
      } catch {
        // user cancelled
      }
    } else {
      copyDoctorLink();
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 py-10">
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute -top-40 left-1/2 h-[420px] w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-200/40 via-violet-200/40 to-fuchsia-200/40 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4">
        <div className="mb-6">
          <Link
            href={me.role === "doctor" ? "/dashboard/doctor" : "/dashboard"}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
          >
            ← Dashboard
          </Link>
        </div>

        {/* Hero card */}
        <div className="mb-6 overflow-hidden rounded-3xl border border-white/60 bg-white/85 p-7 shadow-xl shadow-indigo-500/5 backdrop-blur-xl sm:p-8">
          <div className="flex flex-wrap items-start gap-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/30">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                OduDoc · Referral program
              </p>
              <h1 className="mt-1 bg-gradient-to-r from-slate-900 via-indigo-900 to-fuchsia-900 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
                Share OduDoc, earn {reward} per friend
              </h1>
              <p className="mt-2 max-w-xl text-sm text-slate-600">
                Share your code with patients, doctors or anyone you&apos;d like to
                bring on the platform. <b>You both get {reward} in credit</b>{" "}
                when they complete their first paid consultation. Credit auto-
                applies on your next booking.
              </p>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label="Available credit"
            value={formatMoney(me.creditCents, me.currency)}
            tone="emerald"
          />
          <Stat
            label="Total earned"
            value={formatMoney(me.stats.totalEarnedCents, me.currency)}
            tone="indigo"
          />
          <Stat label="Qualified" value={String(me.stats.qualified)} tone="violet" />
          <Stat label="Pending" value={String(me.stats.pending)} tone="amber" />
        </div>

        {/* Share card */}
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Your referral code
            </p>
            <div className="mt-2 flex items-center gap-3">
              <code className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-2xl font-bold tracking-widest text-slate-900">
                {me.code}
              </code>
              <button
                onClick={() => copyText(me.code, "code")}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  copied === "code"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-900 text-white hover:bg-indigo-600"
                }`}
              >
                {copied === "code" ? "✓ Copied" : "Copy code"}
              </button>
            </div>
            <p className="mt-3 text-[11px] text-slate-500">
              Anyone signing up at <code>odudoc.com/?ref={me.code}</code> gets
              attributed to you automatically.
            </p>
          </div>
          <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Share link
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                {me.shareUrl}
              </code>
              <button
                onClick={() => copyText(me.shareUrl, "url")}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  copied === "url"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {copied === "url" ? "✓" : "Copy"}
              </button>
            </div>
            <button
              onClick={shareNative}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 hover:shadow-lg"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
              </svg>
              Share with WhatsApp / email / SMS
            </button>
          </div>
        </div>

        {/* Refer a doctor — bigger reward, separate share link */}
        <div className="mb-6 overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-md shadow-emerald-500/30">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 11h-6M19 8v6" />
                </svg>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                  Refer a doctor · {doctorReward} bonus
                </p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">
                  Know another doctor? Both of you earn {doctorReward} when they join.
                </h3>
                <p className="mt-1 max-w-xl text-sm text-slate-700">
                  Send this link to a colleague. They apply via{" "}
                  <code className="rounded bg-white/70 px-1.5 py-0.5 text-xs">/for-doctors</code>,
                  and the moment our team verifies their account,{" "}
                  <b>{doctorReward} lands in your wallet</b> and{" "}
                  <b>{doctorReward}</b> in theirs.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs text-slate-700">
              {me.doctorShareUrl}
            </code>
            <button
              onClick={copyDoctorLink}
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                copied === "url"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-white text-slate-700 ring-1 ring-emerald-200 hover:bg-emerald-50"
              }`}
            >
              {copied === "url" ? "✓ Copied" : "Copy link"}
            </button>
            <button
              onClick={shareDoctorLink}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-500/30 hover:shadow-lg"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
              </svg>
              Share with a colleague
            </button>
          </div>
          <p className="mt-3 text-[11px] text-emerald-700">
            Doctor referrals pay <b>{doctorReward}</b> per side · patient
            referrals pay <b>{reward}</b>. Same code works for both — the
            reward amount is decided by who signs up.
          </p>
        </div>

        {/* Claim a code (if you have one) */}
        <div className="mb-6 rounded-3xl border border-white/60 bg-white p-6 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
            Got a code from a friend?
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Apply it now and you&apos;ll both earn {reward} when you complete your
            first paid consultation.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              value={claimCode}
              onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
              placeholder="REFERRALCODE"
              className="min-w-[200px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-sm tracking-widest outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
            />
            <button
              onClick={submitClaim}
              disabled={claimBusy || !claimCode.trim()}
              className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-50"
            >
              {claimBusy ? "Applying…" : "Apply code"}
            </button>
          </div>
          {claimResult && (
            <p className={`mt-2 text-xs ${claimResult.startsWith("✓") ? "text-emerald-700" : "text-rose-700"}`}>
              {claimResult}
            </p>
          )}
        </div>

        {/* Recent referrals */}
        <div className="overflow-hidden rounded-3xl border border-white/60 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-bold text-slate-900">Recent referrals</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Showing your latest 20 referrals.
            </p>
          </div>
          {me.stats.recent.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500">
              No referrals yet — share your code or link with friends to start
              earning.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {me.stats.recent.map((r) => (
                <li key={r.id} className="flex items-center gap-4 px-6 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {r.refereeEmail}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Referred {timeAgo(r.createdAt)}
                      {r.qualifiedAt && ` · qualified ${timeAgo(r.qualifiedAt)}`}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      r.status === "qualified"
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                        : r.status === "pending"
                          ? "bg-amber-50 text-amber-700 ring-1 ring-amber-100"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {r.status}
                  </span>
                  <span className="hidden text-sm font-bold tabular-nums text-slate-900 sm:inline">
                    {r.status === "qualified"
                      ? `+${formatMoney(r.rewardEachCents, r.currency)}`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "emerald" | "indigo" | "violet" | "amber";
}) {
  const tones: Record<string, { bg: string; text: string; ring: string }> = {
    emerald: { bg: "from-emerald-50 to-emerald-100/30", text: "text-emerald-700", ring: "ring-emerald-100" },
    indigo: { bg: "from-indigo-50 to-indigo-100/30", text: "text-indigo-700", ring: "ring-indigo-100" },
    violet: { bg: "from-violet-50 to-violet-100/30", text: "text-violet-700", ring: "ring-violet-100" },
    amber: { bg: "from-amber-50 to-amber-100/30", text: "text-amber-700", ring: "ring-amber-100" },
  };
  const t = tones[tone];
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${t.bg} p-4 ring-1 ${t.ring} backdrop-blur`}>
      <p className={`text-[11px] font-semibold uppercase tracking-wide ${t.text}`}>
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}
