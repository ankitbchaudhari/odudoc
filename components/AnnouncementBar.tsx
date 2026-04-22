"use client";

import { useState, useEffect } from "react";

const announcements = [
  "Free health checkup camp - April 20th",
  "20% off on all supplements - Use code HEALTH20",
  "New 24/7 telemedicine service now available",
];

export default function AnnouncementBar() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % announcements.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  if (dismissed) return null;

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-primary-600 via-teal-600 to-emerald-600 py-2 text-center">
      {/* Subtle moving shine */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.18)_50%,transparent_70%)] bg-[length:250%_100%] animate-[shimmer_6s_linear_infinite]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="flex items-center justify-center gap-2 text-sm font-semibold text-white transition-opacity duration-500">
          <span className="text-base">✨</span>
          <span>{announcements[currentIndex]}</span>
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
