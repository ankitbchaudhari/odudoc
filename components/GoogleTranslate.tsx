"use client";

// Google Translate widget — lazy loader.
//
// Two-mode load to keep the cold-cache LCP clean:
//
//   1. If the user already has a `googtrans` cookie from a previous
//      visit (i.e. they picked a non-English language before), we load
//      the script immediately on mount so the translated DOM appears
//      without a flash of English.
//
//   2. Otherwise we wait for a `odudoc:request-translate` window event
//      and only then inject the script. The LanguageSwitcher dispatches
//      that event when the user actually opens the language dropdown.
//      Net result: English-only visitors (the vast majority on first
//      paint) never download Google's ~100 KB translate.js.
//
// The default Google "banner" at the top of the page is suppressed via
// CSS in globals.css so the site keeps its own chrome.
//
// Coverage: every static + dynamic string in the rendered DOM is
// machine-translated by Google for ~100 languages. For the 11 languages
// where we ship hand-translated copy (en/es/zh/fr/de/pt/ar/ru/sw/ha/am)
// the LanguageProvider's t() still applies first; Google then
// retranslates anything t() didn't cover.

import Script from "next/script";
import { useEffect, useState } from "react";

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate?: {
        TranslateElement: new (
          opts: {
            pageLanguage: string;
            includedLanguages?: string;
            autoDisplay?: boolean;
            layout?: number;
          },
          el: string,
        ) => unknown;
      };
    };
  }
}

const REQUEST_EVENT = "odudoc:request-translate";

export default function GoogleTranslate() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    // Mode 1 — cookie present, load eagerly.
    if (typeof document !== "undefined" && /(^|;)\s*googtrans=/.test(document.cookie)) {
      setShouldLoad(true);
      return;
    }
    // Mode 2 — wait for the switcher's request.
    const onRequest = () => setShouldLoad(true);
    window.addEventListener(REQUEST_EVENT, onRequest, { once: true });
    return () => window.removeEventListener(REQUEST_EVENT, onRequest);
  }, []);

  if (!shouldLoad) return null;

  return (
    <>
      <div id="google_translate_element" style={{ display: "none" }} />
      <Script id="google-translate-init" strategy="afterInteractive">
        {`
          window.googleTranslateElementInit = function() {
            if (!window.google || !window.google.translate) return;
            new window.google.translate.TranslateElement(
              { pageLanguage: 'en', autoDisplay: false },
              'google_translate_element'
            );
          };
        `}
      </Script>
      <Script
        src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        strategy="afterInteractive"
      />
    </>
  );
}
