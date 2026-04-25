"use client";

// Live relative-time renderer.
//
// Takes any date input (ISO string, Date, or human "Apr 24, 2026"),
// renders it as "just now" / "5 min ago" / "3 hours ago" / "2 days
// ago", and re-renders on a self-tuning interval so the label stays
// fresh without having to reload the page:
//   - under a minute old → tick every 10s ("45s ago" → "55s ago")
//   - under an hour      → tick every 30s
//   - under a day        → tick every 5min
//   - older              → tick every hour
// For anything older than ~30 days the component bails out to an
// absolute date ("Apr 24, 2026"), since "97 days ago" is rarely what
// a reader wants.
//
// SSR-safe: server renders a stable absolute fallback (locked to the
// `date` prop) so hydration doesn't flicker; first client paint then
// swaps in the live relative label.

import { useEffect, useMemo, useState } from "react";

interface Props {
  /** ISO timestamp (preferred) or any string Date can parse. */
  date?: string | Date | null;
  /** Fallback to show before hydration / when `date` is unparseable. */
  fallback?: string;
  /** Render as <time dateTime="..."> for SEO + a11y. */
  asTime?: boolean;
  className?: string;
}

function toMs(date: string | Date | null | undefined): number | null {
  if (!date) return null;
  const t = date instanceof Date ? date.getTime() : Date.parse(date);
  return Number.isFinite(t) ? t : null;
}

function format(diffMs: number, abs: number): string {
  const sec = Math.max(1, Math.round(diffMs / 1000));
  if (sec < 30) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
  if (day < 30) {
    const w = Math.round(day / 7);
    return `${w} week${w === 1 ? "" : "s"} ago`;
  }
  // Bail out to an absolute date for anything older than ~a month.
  return new Date(abs).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function pickInterval(diffMs: number): number {
  const min = 60 * 1000;
  if (diffMs < min) return 10 * 1000;
  if (diffMs < 60 * min) return 30 * 1000;
  if (diffMs < 24 * 60 * min) return 5 * min;
  return 60 * min;
}

export default function RelativeTime({ date, fallback, asTime = true, className }: Props) {
  const ms = useMemo(() => toMs(date ?? null), [date]);
  const [now, setNow] = useState<number | null>(null); // null on SSR

  useEffect(() => {
    if (ms === null) return;
    setNow(Date.now());
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const t = Date.now();
      setNow(t);
      const next = pickInterval(Math.max(0, t - ms));
      timer = window.setTimeout(tick, next);
    };
    let timer = window.setTimeout(tick, pickInterval(Math.max(0, Date.now() - ms)));
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [ms]);

  // Pre-hydration / unparseable date: keep the original label so the
  // server-rendered HTML doesn't mismatch.
  if (ms === null || now === null) {
    const text = fallback ?? (typeof date === "string" ? date : "");
    if (asTime && ms !== null) {
      return (
        <time dateTime={new Date(ms).toISOString()} className={className}>
          {text}
        </time>
      );
    }
    return <span className={className}>{text}</span>;
  }

  const label = format(Math.max(0, now - ms), ms);
  if (asTime) {
    return (
      <time
        dateTime={new Date(ms).toISOString()}
        title={new Date(ms).toLocaleString()}
        className={className}
      >
        {label}
      </time>
    );
  }
  return (
    <span title={new Date(ms).toLocaleString()} className={className}>
      {label}
    </span>
  );
}
