"use client";

import { useState, useEffect, useMemo } from "react";

// Edit this list to control the promo bar.
//
// If an item has `expires`, it's auto-hidden on/after that date (UTC).
// Format: YYYY-MM-DD. Dateless items are evergreen.
// The bar disappears entirely when every item has expired.
interface Announcement {
  text: string;
  expires?: string; // YYYY-MM-DD
}

const announcements: Announcement[] = [
  { text: "20% off on all supplements — use code HEALTH20" },
  { text: "New 24/7 telemedicine service now available" },
];

function isExpired(a: Announcement): boolean {
  if (!a.expires) return false;
  // Treat the expiry date as "end of that day UTC" so an event "on April 20th"
  // stays visible through 23:59:59 UTC on April 20th.
  const cutoff = new Date(`${a.expires}T23:59:59Z`).getTime();
  return Number.isFinite(cutoff) && Date.now() > cutoff;
}

export default function AnnouncementBar() {
  const live = useMemo(() => announcements.filter((a) => !isExpired(a)), []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (live.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % live.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [live.length]);

  if (dismissed || live.length === 0) return null;

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-primary-600 via-teal-600 to-emerald-600 py-2 text-center">
      {/* Subtle moving shine */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.18)_50%,transparent_70%)] bg-[length:250%_100%] animate-[shimmer_6s_linear_infinite]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="flex items-center justify-center gap-2 text-sm font-semibold text-white transition-opacity duration-500">
          <span className="text-base">✨</span>
          <span>{live[currentIndex]?.text}</span>
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-white/90 transition-colors hover:bg-white/15"
        aria-label="Close announcement"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
