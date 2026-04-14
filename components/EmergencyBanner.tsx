"use client";

import { useState, useEffect } from "react";

export default function EmergencyBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const wasDismissed = sessionStorage.getItem("emergencyBannerDismissed");
    if (!wasDismissed) {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("emergencyBannerDismissed", "true");
  };

  if (dismissed) return null;

  return (
    <div className="relative z-[60] bg-gradient-to-r from-red-600 via-orange-500 to-red-600 px-4 py-2.5 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 text-center text-sm font-medium sm:text-base">
        <span className="animate-pulse text-lg">&#128680;</span>
        <span>
          Emergency? Call{" "}
          <a href="tel:911" className="font-bold underline">
            911
          </a>{" "}
          or our 24/7 helpline:{" "}
          <a
            href="tel:1-800-638-8362"
            className="inline-block animate-pulse font-bold underline"
          >
            1-800-ODUDOC
          </a>
        </span>
      </div>
      <button
        onClick={handleDismiss}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
        aria-label="Dismiss emergency banner"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
