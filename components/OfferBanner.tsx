"use client";

// Thin promotional banner that shows the current primary offer to every
// visitor. Reads /api/offers/active so edits in the admin panel reflect
// within ~30s (no rebuild). Dismissible — the close state persists in
// localStorage per offer-id, so once a doctor clicks X they don't see
// that same offer again; a new offer id re-shows.

import { useEffect, useState } from "react";
import type { Offer } from "@/lib/offers-store";

const STORAGE_KEY = "odudoc.offer.dismissed";

export default function OfferBanner() {
  const [offer, setOffer] = useState<Offer | null>(null);
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      setDismissedId(localStorage.getItem(STORAGE_KEY));
    } catch {
      /* SSR / privacy mode */
    }
    let cancelled = false;
    void fetch("/api/offers/active", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        setOffer(d?.primary || null);
      })
      .catch(() => {
        /* silent — banner is non-critical */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!offer) return null;
  if (dismissedId === offer.id) return null;

  return (
    <div className="relative z-30 bg-gradient-to-r from-fuchsia-600 via-rose-600 to-amber-500 text-white">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 text-center text-sm font-semibold">
        <span className="hidden rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider sm:inline">
          🎁 Offer
        </span>
        <p className="flex-1 truncate">{offer.bannerText}</p>
        <button
          aria-label="Dismiss offer"
          onClick={() => {
            try {
              localStorage.setItem(STORAGE_KEY, offer.id);
            } catch {
              /* ignore */
            }
            setDismissedId(offer.id);
          }}
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full hover:bg-white/20"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
