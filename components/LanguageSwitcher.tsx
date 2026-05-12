"use client";

// Site-wide language switcher.
//
// Two layers cooperate:
//   1) The hand-translated dictionaries in lib/i18n.ts cover the 11
//      "first-class" languages and feed the t() helper that template
//      strings already use.
//   2) Google Translate (mounted via <GoogleTranslate />) covers the
//      remaining ~88 languages from the ALL_LANGUAGES catalogue. We
//      activate it by writing the `googtrans` cookie at both the host
//      and parent domain, then reloading — that's Google's canonical
//      trigger pattern and it picks up dynamic content too.
// On reload the widget reads `googtrans=/en/<lang>` and translates the
// rendered DOM into the chosen language.

import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/lib/language-context";
import { Language, languageNames, translations } from "@/lib/i18n";
import { ALL_LANGUAGES } from "@/lib/languages-catalogue";

const STORAGE_KEY = "odudoc.lang";

// Codes we ship hand-translated dictionaries for. Anything else flows
// through Google Translate only.
const NATIVE_CODES = Object.keys(translations) as Language[];

function setGoogTrans(code: string) {
  // Google's widget reads `googtrans=/en/<lang>`. Clearing it (or
  // setting it to /en/en) puts the page back into English. We write
  // the cookie at both the current host and the registrable domain so
  // it survives the www <-> apex redirect.
  const path = code === "en" ? "/auto/en" : `/en/${code}`;
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `googtrans=${path}; path=/; expires=${expires}`;
  // Drop the cookie on the parent domain too, e.g. ".odudoc.com".
  const host = window.location.hostname;
  const parts = host.split(".");
  if (parts.length >= 2) {
    const parent = "." + parts.slice(-2).join(".");
    document.cookie = `googtrans=${path}; path=/; domain=${parent}; expires=${expires}`;
  }
}

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCode, setActiveCode] = useState<string>(language);
  const ref = useRef<HTMLDivElement>(null);

  // On first paint, recover the persisted choice (which can be ANY of
  // the 99 catalogue codes, not just the typed Language union).
  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (saved) setActiveCode(saved);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePick = (code: string) => {
    setActiveCode(code);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, code);
    }
    // For first-class languages, drive the typed dictionary too — gives
    // an instant flip for the hand-translated strings before Google's
    // reload kicks in.
    if (NATIVE_CODES.includes(code as Language)) {
      setLanguage(code as Language);
    }
    setGoogTrans(code);
    setOpen(false);
    setQuery("");
    // Reload so Google Translate re-reads the cookie and re-paints the
    // entire page. This is the trade-off for whole-site MT; for the
    // 11 native languages it's a no-op the user barely notices.
    if (code !== "en") window.location.reload();
    else if (window.location.search.includes("googtrans") || document.documentElement.classList.contains("translated-ltr") || document.documentElement.classList.contains("translated-rtl")) {
      window.location.reload();
    }
  };

  const filtered = ALL_LANGUAGES.filter((l) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return l.code.includes(q) || l.name.toLowerCase().includes(q) || l.native.toLowerCase().includes(q);
  });

  // Resolve display name. If the active code is in the catalogue, use
  // its native name; otherwise fall back to the i18n names map.
  const activeDef = ALL_LANGUAGES.find((l) => l.code === activeCode);
  const activeLabel = activeDef?.code.toUpperCase() || (languageNames[activeCode as Language] ? activeCode.toUpperCase() : "EN");

  // Open handler — also pokes GoogleTranslate.tsx to lazy-load so the
  // translate.js download only happens when a real user is about to
  // pick a language (rather than on every cold page paint).
  const handleOpen = () => {
    if (!open && typeof window !== "undefined") {
      window.dispatchEvent(new Event("odudoc:request-translate"));
    }
    setOpen(!open);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-600 dark:text-slate-300 transition-colors hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        aria-label="Change language"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
        <span className="notranslate">{activeLabel}</span>
        <svg className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="notranslate absolute right-0 mt-2 w-72 rounded-xl bg-white dark:bg-slate-900 shadow-lg ring-1 ring-gray-100"
          translate="no"
        >
          <div className="p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search language…"
              className="w-full rounded-lg border border-gray-200 dark:border-slate-800 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <div className="max-h-80 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-center text-xs text-gray-400 dark:text-slate-500">No languages match.</p>
            ) : (
              filtered.map((l) => {
                const isActive = l.code === activeCode;
                return (
                  <button
                    key={l.code}
                    onClick={() => handlePick(l.code)}
                    className={`flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-slate-800 ${
                      isActive ? "bg-primary-50 font-semibold text-primary-600" : "text-gray-700 dark:text-slate-300"
                    }`}
                  >
                    <span className="w-7 text-[10px] font-bold text-gray-400 dark:text-slate-500">{l.code.toUpperCase()}</span>
                    <span className="flex-1 text-left">{l.native}</span>
                    <span className="text-[11px] text-gray-400 dark:text-slate-500">{l.name}</span>
                    {isActive && (
                      <svg className="h-4 w-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
