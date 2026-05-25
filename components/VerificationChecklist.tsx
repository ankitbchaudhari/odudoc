"use client";

// Verification checklist — shown wherever the wallet / booking gate
// might fire. Renders the three required steps (email, phone, ID)
// with their state and an action link. Tells the user exactly what's
// missing instead of a generic "verification_required" error.
//
// Designed to be dropped into a card on the dashboard, the wallet
// page, the booking page, or anywhere else a `verification_required`
// response surfaces. Auto-fetches /api/me/verification-status on
// mount; pass `status` as a prop to render synchronously from a
// parent that already has the data.

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stat {
  emailOk: boolean;
  phoneOk: boolean;
  idOk: boolean;
  allOk: boolean;
  missing: ("email" | "phone" | "id")[];
  stats: { idsAttached: number; idsVerified: number };
}

interface MeResponse {
  user: { email: string; phone: string; role: string };
  status: Stat;
}

export default function VerificationChecklist({
  status: passedStatus,
  email,
  phone,
  compact = false,
}: {
  status?: Stat;
  email?: string;
  phone?: string;
  compact?: boolean;
}) {
  const [data, setData] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(!passedStatus);

  useEffect(() => {
    if (passedStatus) return;
    let cancelled = false;
    fetch("/api/me/verification-status", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled) return;
        if (j?.status) setData(j as MeResponse);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [passedStatus]);

  const status = passedStatus || data?.status;
  if (loading && !status) {
    return (
      <div className="rounded-xl bg-white p-4 text-xs text-gray-500 shadow-sm ring-1 ring-gray-100">
        Checking verification…
      </div>
    );
  }
  if (!status) return null;

  if (status.allOk) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
        <Check />
        Verified — wallet + bookings unlocked
      </div>
    );
  }

  const items: Array<{
    key: "email" | "phone" | "id";
    title: string;
    sub: string;
    href: string;
    cta: string;
    done: boolean;
  }> = [
    {
      key: "email",
      title: "Email",
      sub: email || data?.user.email || "Verify your inbox",
      href: "/auth/verify-email",
      cta: "Send verification link",
      done: status.emailOk,
    },
    {
      key: "phone",
      title: "Phone",
      sub: phone || data?.user.phone || "Confirm via OTP",
      href: "/login/patient",
      cta: "Verify with OTP",
      done: status.phoneOk,
    },
    {
      key: "id",
      title: "Identity",
      sub:
        status.stats.idsAttached === 0
          ? "Attach an ID document"
          : status.stats.idsVerified === 0
            ? `${status.stats.idsAttached} attached, awaiting verification`
            : "Verified",
      href: "/dashboard/profile",
      cta:
        status.stats.idsAttached === 0
          ? "Attach a government / health ID"
          : "Open profile",
      done: status.idOk,
    },
  ];

  return (
    <div
      className={`rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 ${
        compact ? "p-3" : "p-5"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className={`font-bold text-gray-900 ${compact ? "text-sm" : "text-base"}`}>
          Verify your account
        </h3>
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
          {status.missing.length} step{status.missing.length === 1 ? "" : "s"} left
        </span>
      </div>
      <p className="mb-3 text-xs text-gray-500">
        Email + phone + one ID must be verified before you can add money
        to your wallet or book an appointment.
      </p>
      <ul className="space-y-2">
        {items.map((it) => (
          <li
            key={it.key}
            className={`flex items-center gap-3 rounded-xl border p-3 ${
              it.done
                ? "border-emerald-200 bg-emerald-50/60"
                : "border-gray-200 bg-white"
            }`}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                it.done
                  ? "bg-emerald-500 text-white"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {it.done ? <Check /> : <DotDotDot />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">{it.title}</p>
              <p className="truncate text-xs text-gray-500">{it.sub}</p>
            </div>
            {!it.done && (
              <Link
                href={it.href}
                className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800"
              >
                {it.cta}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Check() {
  return (
    <svg
      className="h-3.5 w-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={3}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function DotDotDot() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="6" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="18" cy="12" r="1.5" />
    </svg>
  );
}
