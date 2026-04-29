"use client";

import { useState, useEffect, useMemo } from "react";

// The promo bar is now driven entirely by /api/offers/active. To run an
// announcement, create an offer in /admin/special-offers with the banner
// text — and stop it by toggling the offer off or letting its endsAt
// pass. When no offers are active, the bar disappears completely.

interface ActiveOffer {
  id: string;
  bannerText: string;
}

export default function AnnouncementBar() {
  const [offers, setOffers] = useState<ActiveOffer[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/offers/active", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const active = Array.isArray(data?.active)
          ? (data.active as Array<{ id: string; bannerText: string }>).filter((o) => o.bannerText)
          : [];
        setOffers(active);
      })
      .catch(() => {
        if (!cancelled) setOffers([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const live = useMemo(() => offers || [], [offers]);

  useEffect(() => {
    if (live.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % live.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [live.length]);

  // While we're fetching, render nothing (avoids a flash of stale content
  // for repeat visitors). Once loaded with no active offers, also nothing.
  if (offers === null || dismissed || live.length === 0) return null;

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-primary-600 via-teal-600 to-emerald-600 py-2 text-center">
      {/* Subtle moving shine */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.18)_50%,transparent_70%)] bg-[length:250%_100%] animate-[shimmer_6s_linear_infinite]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="flex items-center justify-center gap-2 text-sm font-semibold text-white transition-opacity duration-500">
          <span className="text-base">✨</span>
          <span>{live[currentIndex]?.bannerText}</span>
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
