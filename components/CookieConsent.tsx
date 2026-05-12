"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem("cookie-consent");
    if (!accepted) {
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 translate-y-0 bg-white dark:bg-slate-900 shadow-2xl transition-transform duration-500"
      style={{ animation: "slideUp 0.5s ease-out" }}
    >
      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-4 sm:flex-row sm:px-6 lg:px-8">
        <p className="flex-1 text-sm text-gray-600 dark:text-slate-300">
          We use cookies to improve your experience on our website. By continuing to browse, you
          agree to our use of cookies.{" "}
          <Link href="/privacy" className="font-medium text-primary-600 underline hover:text-primary-700">
            Privacy Policy
          </Link>
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            onClick={() => setVisible(false)}
            className="rounded-lg border border-primary-600 px-5 py-2 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50"
          >
            Manage Preferences
          </button>
          <button
            onClick={handleAccept}
            className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
