"use client";

import { useEffect, useState } from "react";
import { ISO_COUNTRIES } from "@/lib/iso-countries";

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

// localStorage keys — picked across all sessions on this device.
const LS_COUNTRY = "odudoc:emergency-country";
const LS_COUNTRY_SOURCE = "odudoc:emergency-country-source"; // "gps" | "ip" | "manual"
const LS_GPS_ATTEMPTED = "odudoc:emergency-gps-attempted";

function setCookie(name: string, value: string, days = 365) {
  document.cookie = `${name}=${value}; path=/; max-age=${days * 24 * 60 * 60}; SameSite=Lax`;
}

// Strip everything except `+` and digits so we can build a clean tel:
// URI no matter what the admin typed.
function toTelHref(raw: string): string {
  const cleaned = raw.replace(/[^\d+]/g, "");
  return `tel:${cleaned}`;
}

// Reverse-geocode coordinates → ISO-2 country via the free
// bigdatacloud.net endpoint (no API key required). Falls back to
// returning null if the request fails so the caller can route to the
// IP-based path instead.
async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    const j = (await r.json()) as { countryCode?: string };
    const code = j.countryCode?.toUpperCase();
    return code && /^[A-Z]{2}$/.test(code) ? code : null;
  } catch {
    return null;
  }
}

export default function EmergencyBanner() {
  const [dismissed, setDismissed] = useState(true);
  const [numbers, setNumbers] = useState<EmergencyNumbers | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);

  // Fetch the emergency numbers for whatever country the user has
  // resolved to. Same endpoint as before, but we now drive the
  // ?country= override from client-side state instead of relying
  // solely on the request cookie / Vercel header.
  async function fetchForCountry(c: string | null) {
    try {
      const url = c ? `/api/emergency-numbers?country=${c}` : "/api/emergency-numbers";
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) {
        setNumbers(FALLBACK);
        return;
      }
      const data = (await r.json()) as EmergencyNumbers & { country?: string };
      setNumbers({
        localEmergency: data.localEmergency || FALLBACK.localEmergency,
        helpline: data.helpline || FALLBACK.helpline,
      });
      if (data.country) setCountry(data.country);
    } catch {
      setNumbers(FALLBACK);
    }
  }

  useEffect(() => {
    const wasDismissed = sessionStorage.getItem("emergencyBannerDismissed");
    let cancelled = false;

    (async () => {
      // 1. Did we already resolve a country on this device? Use it
      //    silently — no GPS prompt, no IP lookup.
      const stored = localStorage.getItem(LS_COUNTRY);
      if (stored && /^[A-Z]{2}$/.test(stored)) {
        setCountry(stored);
        setCookie("odudoc-country", stored);
        await fetchForCountry(stored);
        if (!wasDismissed && !cancelled) setDismissed(false);
        return;
      }

      // 2. First-visit path. Try GPS (with consent) — most accurate.
      //    Only ask once per device; if the user denied, remember and
      //    skip the prompt next time.
      const gpsAttempted = localStorage.getItem(LS_GPS_ATTEMPTED);
      const canTryGps =
        typeof navigator !== "undefined" &&
        navigator.geolocation &&
        !gpsAttempted;

      let resolved: string | null = null;
      if (canTryGps) {
        localStorage.setItem(LS_GPS_ATTEMPTED, "1");
        resolved = await new Promise<string | null>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              const code = await reverseGeocode(
                pos.coords.latitude,
                pos.coords.longitude,
              );
              resolve(code);
            },
            () => resolve(null),
            { timeout: 6000, enableHighAccuracy: false, maximumAge: 60 * 60 * 1000 },
          );
        });
      }

      if (cancelled) return;

      if (resolved) {
        localStorage.setItem(LS_COUNTRY, resolved);
        localStorage.setItem(LS_COUNTRY_SOURCE, "gps");
        setCookie("odudoc-country", resolved);
        setCountry(resolved);
        await fetchForCountry(resolved);
      } else {
        // 3. GPS denied / failed → fall back to IP via the endpoint.
        //    The route reads x-vercel-ip-country in prod. We persist
        //    the result so we don't re-IP-lookup next visit.
        await fetchForCountry(null);
        const c = (window as { __resolvedEmergencyCountry?: string })
          .__resolvedEmergencyCountry;
        if (c) {
          localStorage.setItem(LS_COUNTRY, c);
          localStorage.setItem(LS_COUNTRY_SOURCE, "ip");
        }
      }
      if (!wasDismissed && !cancelled) setDismissed(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("emergencyBannerDismissed", "true");
  };

  async function pickCountry(c: string) {
    localStorage.setItem(LS_COUNTRY, c);
    localStorage.setItem(LS_COUNTRY_SOURCE, "manual");
    setCookie("odudoc-country", c);
    setCountry(c);
    setPicker(false);
    await fetchForCountry(c);
  }

  if (dismissed || !numbers) return null;

  const countryLabel = country
    ? ISO_COUNTRIES.find((c) => c.iso === country)?.name || country
    : "your region";

  return (
    <div className="relative z-[60] bg-gradient-to-r from-red-600 via-orange-500 to-red-600 px-4 py-2.5 text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-sm font-medium sm:text-base">
        <span className="animate-pulse text-lg">&#128680;</span>
        <span>
          Emergency in {countryLabel}? Call{" "}
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
        <button
          type="button"
          onClick={() => setPicker(true)}
          className="ml-1 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold hover:bg-white/25"
          aria-label="Change country"
          title="Travelling? Change country"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM3.6 9h16.8M3.6 15h16.8M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
          </svg>
          Change
        </button>
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

      {picker && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 p-4 sm:items-center"
          onClick={() => setPicker(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 text-slate-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-bold">Set your country</h2>
            <p className="mt-1 text-xs text-slate-500">
              We&apos;ll show the right local emergency number. Stored on this
              device — change again if you travel.
            </p>
            <select
              className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
              value={country || ""}
              onChange={(e) => {
                if (e.target.value) void pickCountry(e.target.value);
              }}
            >
              <option value="">Select country…</option>
              {ISO_COUNTRIES.map((c) => (
                <option key={c.iso} value={c.iso}>
                  {c.name} ({c.iso})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setPicker(false)}
              className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
