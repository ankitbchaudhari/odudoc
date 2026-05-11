"use client";

// Persistent banner that shows when the signed-in user is on a
// temporary password. Mounts at the top of /admin and /dashboard
// layouts; polls /api/auth/me on focus + every 60s so a freshly-
// changed password makes it disappear without a full reload.
//
// Two states:
//   • Soft warning  — temp password still valid, countdown to expiry.
//     User can click through to /auth/change-password and set their
//     own at their leisure.
//   • Hard warning  — < 24h until expiry. Same banner, red palette,
//     stronger copy ("locked out tomorrow").
//
// We deliberately DON'T block the rest of the page — lib/auth.ts
// already refuses login after the TTL elapses, which is the real
// gate. The banner is the early-warning surface.

import Link from "next/link";
import { useEffect, useState } from "react";

interface MePayload {
  mustChangePassword?: boolean;
  tempPasswordExpiresAt?: string | null;
}

export default function TempPasswordBanner() {
  const [data, setData] = useState<MePayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as MePayload;
        if (!cancelled) setData(json);
      } catch {
        // Ignore — banner just stays hidden.
      }
    }
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    const id = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      window.clearInterval(id);
    };
  }, []);

  if (!data?.mustChangePassword) return null;

  const expiresAt = data.tempPasswordExpiresAt
    ? new Date(data.tempPasswordExpiresAt)
    : null;
  const msLeft = expiresAt ? expiresAt.getTime() - Date.now() : 0;
  const hoursLeft = Math.max(0, Math.floor(msLeft / 3_600_000));
  const isUrgent = hoursLeft < 24;

  const tone = isUrgent
    ? "from-rose-600 via-red-600 to-orange-600"
    : "from-amber-500 via-orange-500 to-rose-500";

  const lead = isUrgent
    ? "⚠️ Your temporary password expires soon"
    : "🔑 Set your own password to keep your account active";

  const detail = expiresAt
    ? hoursLeft >= 24
      ? `${Math.ceil(hoursLeft / 24)} day${Math.ceil(hoursLeft / 24) === 1 ? "" : "s"} left — after that you'll be locked out until an admin re-issues.`
      : `${hoursLeft} hour${hoursLeft === 1 ? "" : "s"} left. Change it now to avoid losing access.`
    : "Change it now to avoid losing access.";

  return (
    <div className={`relative overflow-hidden bg-gradient-to-r ${tone} text-white shadow`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_50%,rgba(255,255,255,0.18),transparent_40%)]" />
      <div className="relative mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="text-base">{isUrgent ? "🚨" : "🔔"}</span>
          <div className="min-w-0">
            <p className="text-[13px] font-bold leading-tight">{lead}</p>
            <p className="text-[11px] text-white/90">{detail}</p>
          </div>
        </div>
        <Link
          href="/auth/change-password?reason=temp"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 text-[12px] font-bold text-slate-900 shadow-sm transition-transform hover:-translate-y-0.5"
        >
          Change password
          <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}
