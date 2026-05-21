"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface Props {
  slug: string;
  tier: "free" | "paid" | "premium";
  priceCents: number;
  currency: string;
}

export default function EnrolButton({ slug, tier, priceCents, currency }: Props) {
  const { status } = useSession();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (status === "loading") {
    return <button disabled className="w-full rounded-xl bg-gray-200 py-3 text-sm font-semibold text-gray-500">Loading…</button>;
  }
  if (status !== "authenticated") {
    return (
      <Link
        href={`/auth/login?callbackUrl=${encodeURIComponent(`/courses/${slug}`)}`}
        className="block w-full rounded-xl bg-[#0F6E56] py-3 text-center text-sm font-semibold text-white hover:bg-[#0A5942]"
      >
        Sign in to enrol
      </Link>
    );
  }

  const enrol = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/courses/${slug}/enrol`, { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (j.error === "insufficient_balance") {
          setMsg({ ok: false, text: "Wallet under-funded. Top up at /dashboard/finance and try again." });
        } else if (j.error === "course_not_published") {
          setMsg({ ok: false, text: "This course isn't open for enrolment right now." });
        } else if (j.error === "unauthenticated") {
          setMsg({ ok: false, text: "Please sign in again." });
        } else {
          setMsg({ ok: false, text: j.error || "Enrolment failed." });
        }
        return;
      }
      setMsg({
        ok: true,
        text: tier === "free"
          ? "You're enrolled! Open My Learning to start."
          : `Enrolled. ${currency === "INR" ? "₹" : "$"}${(priceCents / 100).toLocaleString()} charged to your wallet.`,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={enrol}
        disabled={busy}
        className="w-full rounded-xl bg-[#0F6E56] py-3 text-sm font-bold text-white hover:bg-[#0A5942] disabled:opacity-60"
      >
        {busy ? "Enrolling…" : tier === "free" ? "Enrol — free" : `Enrol · ${currency === "INR" ? "₹" : "$"}${(priceCents / 100).toLocaleString()}`}
      </button>
      {msg && (
        <p className={`rounded-lg px-3 py-2 text-xs ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
          {msg.text}
          {msg.ok && <Link href="/dashboard/courses" className="ml-1 font-semibold underline">My Learning →</Link>}
        </p>
      )}
    </div>
  );
}
