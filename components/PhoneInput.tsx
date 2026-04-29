"use client";

// International phone-number input with searchable country dropdown.
//
// Behaviour:
//   - The component value is a single E.164-ish string like "+919876543210"
//     so consumers can pass it through to the existing form.phone field.
//   - User picks the country from a flag/dial-code dropdown; the national
//     portion is typed in the adjacent input. We auto-prefix the dial code
//     when the consumer reads `value`.
//   - The dropdown is searchable by country name or dial code. Defaults to
//     India because OduDoc's primary market is Indian doctors and patients —
//     change `defaultIso` to override on a per-form basis.
//
// We use Unicode regional-indicator flag emoji rather than image sprites,
// so there's no asset bundle and the component works offline.

import { useEffect, useMemo, useRef, useState } from "react";

interface Country {
  iso: string;   // ISO 3166-1 alpha-2
  name: string;
  dial: string;  // e.g. "+91"
}

// Curated list — the long tail of micro-states is omitted to keep the
// dropdown short. Add what you need; the order here is the dropdown order
// (alphabetical except for the four pinned at the top).
const COUNTRIES: Country[] = [
  { iso: "IN", name: "India",          dial: "+91" },
  { iso: "US", name: "United States",  dial: "+1"  },
  { iso: "GB", name: "United Kingdom", dial: "+44" },
  { iso: "AE", name: "UAE",            dial: "+971" },
  // --- alphabetical ---
  { iso: "AF", name: "Afghanistan",    dial: "+93"  },
  { iso: "AL", name: "Albania",        dial: "+355" },
  { iso: "DZ", name: "Algeria",        dial: "+213" },
  { iso: "AR", name: "Argentina",      dial: "+54"  },
  { iso: "AU", name: "Australia",      dial: "+61"  },
  { iso: "AT", name: "Austria",        dial: "+43"  },
  { iso: "BD", name: "Bangladesh",     dial: "+880" },
  { iso: "BE", name: "Belgium",        dial: "+32"  },
  { iso: "BR", name: "Brazil",         dial: "+55"  },
  { iso: "BG", name: "Bulgaria",       dial: "+359" },
  { iso: "KH", name: "Cambodia",       dial: "+855" },
  { iso: "CA", name: "Canada",         dial: "+1"   },
  { iso: "CL", name: "Chile",          dial: "+56"  },
  { iso: "CN", name: "China",          dial: "+86"  },
  { iso: "CO", name: "Colombia",       dial: "+57"  },
  { iso: "CZ", name: "Czechia",        dial: "+420" },
  { iso: "DK", name: "Denmark",        dial: "+45"  },
  { iso: "EG", name: "Egypt",          dial: "+20"  },
  { iso: "ET", name: "Ethiopia",       dial: "+251" },
  { iso: "FI", name: "Finland",        dial: "+358" },
  { iso: "FR", name: "France",         dial: "+33"  },
  { iso: "DE", name: "Germany",        dial: "+49"  },
  { iso: "GH", name: "Ghana",          dial: "+233" },
  { iso: "GR", name: "Greece",         dial: "+30"  },
  { iso: "HK", name: "Hong Kong",      dial: "+852" },
  { iso: "HU", name: "Hungary",        dial: "+36"  },
  { iso: "IS", name: "Iceland",        dial: "+354" },
  { iso: "ID", name: "Indonesia",      dial: "+62"  },
  { iso: "IR", name: "Iran",           dial: "+98"  },
  { iso: "IQ", name: "Iraq",           dial: "+964" },
  { iso: "IE", name: "Ireland",        dial: "+353" },
  { iso: "IL", name: "Israel",         dial: "+972" },
  { iso: "IT", name: "Italy",          dial: "+39"  },
  { iso: "JP", name: "Japan",          dial: "+81"  },
  { iso: "JO", name: "Jordan",         dial: "+962" },
  { iso: "KE", name: "Kenya",          dial: "+254" },
  { iso: "KW", name: "Kuwait",         dial: "+965" },
  { iso: "MY", name: "Malaysia",       dial: "+60"  },
  { iso: "MX", name: "Mexico",         dial: "+52"  },
  { iso: "MA", name: "Morocco",        dial: "+212" },
  { iso: "NP", name: "Nepal",          dial: "+977" },
  { iso: "NL", name: "Netherlands",    dial: "+31"  },
  { iso: "NZ", name: "New Zealand",    dial: "+64"  },
  { iso: "NG", name: "Nigeria",        dial: "+234" },
  { iso: "NO", name: "Norway",         dial: "+47"  },
  { iso: "OM", name: "Oman",           dial: "+968" },
  { iso: "PK", name: "Pakistan",       dial: "+92"  },
  { iso: "PH", name: "Philippines",    dial: "+63"  },
  { iso: "PL", name: "Poland",         dial: "+48"  },
  { iso: "PT", name: "Portugal",       dial: "+351" },
  { iso: "QA", name: "Qatar",          dial: "+974" },
  { iso: "RO", name: "Romania",        dial: "+40"  },
  { iso: "RU", name: "Russia",         dial: "+7"   },
  { iso: "SA", name: "Saudi Arabia",   dial: "+966" },
  { iso: "SG", name: "Singapore",      dial: "+65"  },
  { iso: "ZA", name: "South Africa",   dial: "+27"  },
  { iso: "KR", name: "South Korea",    dial: "+82"  },
  { iso: "ES", name: "Spain",          dial: "+34"  },
  { iso: "LK", name: "Sri Lanka",      dial: "+94"  },
  { iso: "SE", name: "Sweden",         dial: "+46"  },
  { iso: "CH", name: "Switzerland",    dial: "+41"  },
  { iso: "TW", name: "Taiwan",         dial: "+886" },
  { iso: "TZ", name: "Tanzania",       dial: "+255" },
  { iso: "TH", name: "Thailand",       dial: "+66"  },
  { iso: "TR", name: "Turkey",         dial: "+90"  },
  { iso: "UG", name: "Uganda",         dial: "+256" },
  { iso: "UA", name: "Ukraine",        dial: "+380" },
  { iso: "VN", name: "Vietnam",        dial: "+84"  },
];

function flagEmoji(iso: string): string {
  // Regional Indicator Symbol Letter A starts at U+1F1E6.
  return iso
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

/** Best-effort parse of a stored E.164 string back into (country, national).
 *  Picks the longest matching dial code so "+1" doesn't shadow "+1684". */
function splitValue(value: string): { country: Country; national: string } {
  const clean = value.replace(/[^\d+]/g, "");
  if (clean.startsWith("+")) {
    const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
    for (const c of sorted) {
      if (clean.startsWith(c.dial)) {
        return { country: c, national: clean.slice(c.dial.length) };
      }
    }
  }
  // No recognisable prefix — return the configured default + raw input
  // (without leading + so the consumer doesn't end up with "++91...").
  const fallback = COUNTRIES.find((c) => c.iso === "IN") || COUNTRIES[0];
  return { country: fallback, national: clean.replace(/^\+/, "") };
}

export interface PhoneInputProps {
  value: string;                      // E.164 stored string, e.g. "+919876543210"
  onChange: (next: string) => void;   // called with the combined E.164 string
  defaultIso?: string;                // ISO code for the dropdown when value is empty
  placeholder?: string;
  className?: string;                 // applied to the wrapper
  disabled?: boolean;
}

export default function PhoneInput({
  value,
  onChange,
  defaultIso = "IN",
  placeholder = "98765 43210",
  className = "",
  disabled = false,
}: PhoneInputProps) {
  const initial = useMemo(() => {
    if (value) return splitValue(value);
    const c = COUNTRIES.find((x) => x.iso === defaultIso) || COUNTRIES[0];
    return { country: c, national: "" };
  }, [value, defaultIso]);

  const [country, setCountry] = useState<Country>(initial.country);
  const [national, setNational] = useState<string>(initial.national);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  // Keep local state in sync if the parent resets `value` (e.g. on submit).
  useEffect(() => {
    const next = splitValue(value || "");
    if (!value) {
      const c = COUNTRIES.find((x) => x.iso === defaultIso) || COUNTRIES[0];
      setCountry(c);
      setNational("");
      return;
    }
    setCountry(next.country);
    setNational(next.national);
  }, [value, defaultIso]);

  // Click-outside closes the dropdown.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function emit(nextCountry: Country, nextNational: string): void {
    setCountry(nextCountry);
    setNational(nextNational);
    const digits = nextNational.replace(/\D/g, "");
    onChange(digits ? `${nextCountry.dial}${digits}` : "");
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dial.includes(q.startsWith("+") ? q : `+${q}`) ||
        c.iso.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div ref={wrapRef} className={`relative flex w-full ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex shrink-0 items-center gap-1 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 disabled:opacity-60"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-base leading-none">{flagEmoji(country.iso)}</span>
        <span className="font-medium">{country.dial}</span>
        <svg className="h-3 w-3 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        disabled={disabled}
        value={national}
        onChange={(e) => emit(country, e.target.value.replace(/[^\d\s-]/g, ""))}
        placeholder={placeholder}
        className="block w-full min-w-0 rounded-r-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 disabled:opacity-60"
      />

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 max-h-72 w-72 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="p-2">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country or +code"
              className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-primary-500"
            />
          </div>
          <ul role="listbox" className="max-h-56 overflow-y-auto pb-1">
            {filtered.length === 0 && (
              <li className="px-3 py-3 text-center text-xs text-gray-400">No countries match.</li>
            )}
            {filtered.map((c) => (
              <li key={c.iso}>
                <button
                  type="button"
                  onClick={() => {
                    emit(c, national);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                    c.iso === country.iso ? "bg-primary-50/60" : ""
                  }`}
                >
                  <span className="text-base leading-none">{flagEmoji(c.iso)}</span>
                  <span className="flex-1 truncate text-gray-800">{c.name}</span>
                  <span className="text-xs text-gray-500">{c.dial}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
