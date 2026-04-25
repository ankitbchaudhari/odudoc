"use client";

// Google Translate widget.
//
// Loads google.translate.TranslateElement on first paint and exposes a
// hidden init <div> for it to attach to. The visible LanguageSwitcher
// dropdown writes the `googtrans` cookie + reloads, which is Google's
// canonical activation pattern (the widget reads that cookie on load
// and translates the page accordingly). The default Google "banner"
// at the top of the page is suppressed via CSS in globals.css so the
// site keeps its own chrome.
//
// Coverage: every static + dynamic string in the rendered DOM is
// machine-translated by Google for ~100 languages. For the 11 languages
// where we ship hand-translated copy (en/es/zh/fr/de/pt/ar/ru/sw/ha/am)
// the LanguageProvider's t() still applies first; Google then
// retranslates anything t() didn't cover.

import Script from "next/script";

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

export default function GoogleTranslate() {
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
