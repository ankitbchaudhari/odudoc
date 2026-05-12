"use client";

// Minimal locale switcher. Persists to localStorage; emits a custom
// event so other components subscribed to `useLocale` re-render.
//
// We keep the i18n stack deliberately small — no SSR locale routing,
// no auto-redirect, no big runtime. Every patient surface that wants
// translation imports useLocale + translate.

import { useEffect, useState } from "react";
import { LOCALES, DEFAULT_LOCALE, type Locale, translate } from "@/lib/i18n/dictionaries";

const STORAGE_KEY = "od_locale_v1";
const EVENT = "od:locale_changed";

export function getStoredLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  const v = window.localStorage.getItem(STORAGE_KEY);
  if (LOCALES.find((l) => l.id === v)) return v as Locale;
  return DEFAULT_LOCALE;
}

export function setStoredLocale(locale: Locale): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, locale);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: locale }));
}

export function useLocale(): { locale: Locale; t: (key: string, fallback?: string) => string } {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  useEffect(() => {
    setLocale(getStoredLocale());
    const onChange = (e: Event) => setLocale((e as CustomEvent<Locale>).detail);
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);
  return {
    locale,
    t: (key, fallback) => translate(locale, key, fallback),
  };
}

export default function LocaleSwitcher({ className = "" }: { className?: string }) {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  useEffect(() => { setLocale(getStoredLocale()); }, []);
  const change = (l: Locale) => {
    setLocale(l);
    setStoredLocale(l);
  };
  return (
    <select
      value={locale}
      onChange={(e) => change(e.target.value as Locale)}
      className={`rounded-lg border border-slate-300 bg-white dark:bg-slate-900 px-2 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 ${className}`}
    >
      {LOCALES.map((l) => (
        <option key={l.id} value={l.id}>{l.nativeLabel}</option>
      ))}
    </select>
  );
}
