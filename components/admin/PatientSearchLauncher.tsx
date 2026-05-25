"use client";

// Global "Find patient" launcher — sits in the admin header and opens
// the PatientSearch widget in a modal so any admin / pro user can
// look up a patient from any /admin page without navigating away.
//
// Keyboard shortcut: Ctrl/Cmd + K (when no input is focused). Falls
// back to a plain button click.

import { useEffect, useState } from "react";
import PatientSearch from "./PatientSearch";

export default function PatientSearchLauncher() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const k = e.key?.toLowerCase();
      const target = e.target as HTMLElement | null;
      const inField =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && k === "k" && !inField) {
        e.preventDefault();
        setOpen(true);
      }
      if (k === "escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Find patient (Ctrl/Cmd + K)"
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:border-primary-300 hover:bg-primary-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 110-16 8 8 0 010 16z" />
        </svg>
        Find patient
        <kbd className="hidden rounded border border-gray-200 px-1.5 py-0.5 text-[10px] font-mono text-gray-500 sm:inline-block dark:border-slate-700 dark:text-slate-400">
          Ctrl K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 p-4 sm:items-center"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Find patient"
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">
                Find a patient
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-slate-500 dark:hover:bg-slate-800"
                aria-label="Close"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <PatientSearch compact />
            <p className="mt-3 text-[11px] text-gray-500 dark:text-slate-400">
              Scoped to your organization. Fields you can&apos;t see are
              hidden by your role&apos;s privacy policy.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
