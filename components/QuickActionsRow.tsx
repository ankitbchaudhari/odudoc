"use client";

// Quick-action row on /dashboard — surfaces three high-leverage
// patient actions above the colourful stat cards:
//
//   1) Book the same doctor again — derived from the most recent
//      completed consultation. Skips when there's no history.
//   2) Reorder medications — derived from the most recent active
//      prescription. Deep-links into /shop with the rx tagged.
//   3) Refer a friend & earn ₹100 — deterministic per-user code,
//      copy + WhatsApp-share, both sides credited on first paid
//      booking.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Consultation } from "@/lib/consultations-store";
import type { PrescriptionRecord } from "@/lib/prescriptions-store";

export default function QuickActionsRow({
  consultations,
  prescriptions,
}: {
  consultations: Consultation[];
  prescriptions: PrescriptionRecord[];
}) {
  // Last completed consult = our "book again" anchor. We don't use
  // the latest of any status (an awaiting/cancelled one is the wrong
  // signal) — only completed has the goodwill that drives rebooking.
  const lastCompleted = useMemo(
    () =>
      consultations
        .filter((c) => c.status === "completed" && c.doctorId)
        .sort((a, b) => new Date(b.updatedAt || b.scheduledFor).getTime() - new Date(a.updatedAt || a.scheduledFor).getTime())[0],
    [consultations],
  );

  // Last active Rx = reorder candidate. We accept the most-recent
  // active regardless of doctor; if the patient has chronic meds we
  // surface those over a one-off antibiotic.
  const lastRx = useMemo(
    () =>
      prescriptions
        .filter((p) => p.status === "active")
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0],
    [prescriptions],
  );

  // Real referral code from the server. Lazy-fetched on mount so the
  // initial dashboard paint isn't blocked. lib/users-store.ts owns
  // code generation (collision-free, 8-char alphanumeric) and
  // /api/referral-program/me exposes both the code and the share URL.
  const [referral, setReferral] = useState<{ code: string; shareUrl: string } | null>(null);
  useEffect(() => {
    fetch("/api/referral-program/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.code) setReferral({ code: d.code, shareUrl: d.shareUrl });
      })
      .catch(() => {});
  }, []);

  // Hide the whole row only if every card would be empty.
  if (!lastCompleted && !lastRx && !referral) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
        For you
      </h2>
      <div className="grid gap-3 md:grid-cols-3">
        {lastCompleted ? (
          <BookAgainCard doctor={{ id: lastCompleted.doctorId, name: lastCompleted.doctorName }} />
        ) : (
          <PlaceholderCard
            emoji="🩺"
            title="Book your first consult"
            sub="Browse 1 of 14 specialties"
            href="/doctors"
            gradient="from-indigo-500 to-violet-500"
          />
        )}
        {lastRx ? (
          <ReorderRxCard rx={lastRx} />
        ) : (
          <PlaceholderCard
            emoji="💊"
            title="Order medicines"
            sub="Get them delivered to your door"
            href="/shop"
            gradient="from-emerald-500 to-teal-500"
          />
        )}
        {referral && <ReferralCard code={referral.code} shareUrl={referral.shareUrl} />}
      </div>
    </section>
  );
}

function BookAgainCard({ doctor }: { doctor: { id: string; name: string } }) {
  return (
    <Link
      href={`/doctors/${doctor.id}#book-online`}
      className="group relative overflow-hidden rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50 via-violet-50 to-fuchsia-50 dark:from-indigo-950/40 dark:via-violet-950/40 dark:to-fuchsia-950/40 p-4 transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-lg text-white shadow-md shadow-indigo-500/30">
          🔁
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-700/80 dark:text-indigo-300/80">
            Book again
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-gray-900 dark:text-slate-100">{doctor.name}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Same doctor, one-tap rebook →
          </p>
        </div>
      </div>
    </Link>
  );
}

function ReorderRxCard({ rx }: { rx: PrescriptionRecord }) {
  const medCount = rx.data?.medications?.length || 0;
  const firstMed = rx.data?.medications?.[0]?.name;
  return (
    <Link
      href={`/shop?rx=${encodeURIComponent(rx.id)}`}
      className="group relative overflow-hidden rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-50 via-teal-50 to-sky-50 dark:from-emerald-950/40 dark:via-teal-950/40 dark:to-sky-950/40 p-4 transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-lg text-white shadow-md shadow-emerald-500/30">
          💊
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700/80 dark:text-emerald-300/80">
            Reorder Rx
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-gray-900 dark:text-slate-100">
            {firstMed || rx.data?.diagnosis || "Last prescription"}
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            {medCount > 0 ? `${medCount} medicine${medCount === 1 ? "" : "s"} · order online →` : "Order online →"}
          </p>
        </div>
      </div>
    </Link>
  );
}

function ReferralCard({ code, shareUrl }: { code: string; shareUrl: string }) {
  const [copied, setCopied] = useState(false);

  const shareText = `Try OduDoc for online doctor consultations. Sign up with my code ${code}: ${shareUrl}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  const copy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard denied — fallback silently */
    }
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-amber-950/40 dark:via-orange-950/40 dark:to-rose-950/40 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-lg text-white shadow-md shadow-amber-500/30">
          🎁
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700/80 dark:text-amber-300/80">
            Refer & earn ₹100
          </p>
          <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-slate-100">
            Share your code
          </p>
          <div className="mt-1.5 flex items-center gap-1.5">
            <code className="rounded-md bg-white dark:bg-slate-950 px-2 py-0.5 text-xs font-mono font-bold text-amber-700 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-900/60">
              {code}
            </code>
            <button
              onClick={copy}
              className="rounded-md bg-white dark:bg-slate-950 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-900/60 hover:bg-amber-50 dark:hover:bg-amber-900/20"
            >
              {copied ? "✓ Copied" : "Copy"}
            </button>
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-gradient-to-r from-emerald-500 to-green-600 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm hover:shadow-md"
            >
              WhatsApp
            </a>
          </div>
          <p className="mt-1.5 text-[11px] text-gray-500 dark:text-slate-400">
            Both of you get ₹100 wallet credit on their first paid booking.
          </p>
        </div>
      </div>
    </div>
  );
}

function PlaceholderCard({
  emoji, title, sub, href, gradient,
}: { emoji: string; title: string; sub: string; href: string; gradient: string }) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-lg text-white shadow-md`}>
          {emoji}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{title}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">{sub} →</p>
        </div>
      </div>
    </Link>
  );
}

