"use client";

import { useState, useEffect } from "react";

interface EmergencyNumbers {
  localEmergency: string;
  helpline: string;
}

// Fallback used if the lookup endpoint can't be reached (offline,
// first paint before fetch resolves, etc.). Matches the seed "*" row
// in lib/settings-store.ts so the banner never goes blank.
const FALLBACK: EmergencyNumbers = {
  localEmergency: "911",
  helpline: "+1 (302) 899-2625",
};

// Strip everything except `+` and digits so we can build a clean tel:
// URI no matter what the admin typed (spaces / parens / dashes are all
// fine in the display string but break the dialer if passed through).
function toTelHref(raw: string): string {
  const cleaned = raw.replace(/[^\d+]/g, "");
  return `tel:${cleaned}`;
}

export default function EmergencyBanner() {
  const [dismissed, setDismissed] = useState(true);
  const [numbers, setNumbers] = useState<EmergencyNumbers | null>(null);

  useEffect(() => {
    const wasDismissed = sessionStorage.getItem("emergencyBannerDismissed");
    // Fetch first, then reveal — avoids a flash of the wrong number for
    // visitors whose detected country differs from the fallback "*" row.
    let cancelled = false;
    fetch("/api/emergency-numbers", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: EmergencyNumbers | null) => {
        if (cancelled) return;
        setNumbers(
          data && data.localEmergency && data.helpline ? data : FALLBACK
        );
        if (!wasDismissed) setDismissed(false);
      })
      .catch(() => {
        if (cancelled) return;
        setNumbers(FALLBACK);
        if (!wasDismissed) setDismissed(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("emergencyBannerDismissed", "true");
  };

  if (dismissed || !numbers) return null;

  return (
    <div className="relative z-[60] bg-gradient-to-r from-red-600 via-orange-500 to-red-600 px-4 py-2.5 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 text-center text-sm font-medium sm:text-base">
        <span className="animate-pulse text-lg">&#128680;</span>
        <span>
          Emergency? Call{" "}
          <a
            href={toTelHref(numbers.localEmergency)}
            className="font-bold underline"
          >
            {numbers.localEmergency}
          </a>{" "}
          or our 24/7 helpline:{" "}
          <a
            href={toTelHref(numbers.helpline)}
            className="inline-block animate-pulse font-bold underline"
          >
            {numbers.helpline}
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
