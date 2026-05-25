"use client";

// Pricing-page country switcher.
//
// Writes the visitor's choice to the odudoc-country cookie so future
// requests (including the next pricing API call + any other
// region-aware route) honor it. Defaults to the country resolved by
// /api/pricing (which already runs the cookie > geo > "US" cascade).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ISO_COUNTRIES } from "@/lib/iso-countries";

interface Props {
  current: string;
  onChange?: (country: string) => void;
}

export default function CountrySwitcher({ current, onChange }: Props) {
  const [country, setCountry] = useState(current.toUpperCase());
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const currentLabel =
    ISO_COUNTRIES.find((c) => c.iso === country)?.name || country;

  function pick(next: string) {
    setCountry(next);
    setOpen(false);
    // Cookie is read by lib/resolve-visitor-country.ts; max-age = 1 year.
    // Path "/" so every region-aware route sees it.
    document.cookie = `odudoc-country=${next}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    if (onChange) {
      onChange(next);
    } else {
      // No handler supplied → bounce the page so server-rendered
      // content also picks up the new country.
      router.refresh();
    }
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM3.6 9h16.8M3.6 15h16.8M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
        </svg>
        <span>Prices in: <span className="font-bold">{currentLabel}</span></span>
        <svg className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <>
          {/* click-outside scrim */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close country picker"
          />
          <ul
            role="listbox"
            className="absolute left-1/2 z-50 mt-1 max-h-72 w-64 -translate-x-1/2 overflow-auto rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            {ISO_COUNTRIES.map((c) => (
              <li key={c.iso}>
                <button
                  type="button"
                  onClick={() => pick(c.iso)}
                  className={`flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 ${
                    c.iso === country
                      ? "font-bold text-primary-700 dark:text-primary-300"
                      : "text-slate-700 dark:text-slate-200"
                  }`}
                  role="option"
                  aria-selected={c.iso === country}
                >
                  <span>{c.name}</span>
                  <span className="ml-2 font-mono text-xs text-slate-400 dark:text-slate-500">
                    {c.iso}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
