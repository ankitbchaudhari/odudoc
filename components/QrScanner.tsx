"use client";

// In-browser QR scanner. Wraps html5-qrcode in a modal overlay so any
// page can spin up a camera scan with a single component + onScan
// callback. Tested on iOS Safari, Android Chrome, and desktop webcams.
//
// Used by the clinic reception page so staff can scan the patient's
// confirmation QR with the front-desk laptop/tablet camera instead of
// typing the booking ID by hand.
//
// The decoded payload is whatever the QR encodes — for OduDoc bookings
// that's a URL like `https://odudoc.com/b/BK-1234`. The caller is
// responsible for extracting the booking ID from the result.

import { useEffect, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";

interface QrScannerProps {
  open: boolean;
  onClose: () => void;
  /** Fired once per successful decode. The scanner auto-stops after this. */
  onScan: (decoded: string) => void;
}

export default function QrScanner({ open, onClose, onScan }: QrScannerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setErr(null);
    setStarting(true);

    // Dynamic import — html5-qrcode pulls in DOM-touching code that
    // can't run during SSR. The module also adds ~180KB so deferring
    // until the modal opens keeps the main bundle small.
    (async () => {
      try {
        const mod = await import("html5-qrcode");
        if (cancelled) return;
        const { Html5Qrcode } = mod;
        if (!containerRef.current) return;

        // Each instance needs a unique element id; the container div
        // already has one. html5-qrcode mounts its <video> inside.
        const scanner = new Html5Qrcode(containerRef.current.id);
        scannerRef.current = scanner;

        await scanner.start(
          // Prefer the rear camera on phones (environment-facing).
          { facingMode: "environment" },
          {
            fps: 10,
            // Roughly 70% of the smaller container dimension. The
            // library expects a number OR a function — function lets
            // it adapt to the actual rendered size.
            qrbox: (w: number, h: number) => {
              const min = Math.min(w, h);
              const side = Math.max(160, Math.floor(min * 0.7));
              return { width: side, height: side };
            },
            // We only care about QR; ignore other 1D/2D codes to cut
            // false positives on busy backgrounds.
            aspectRatio: 1,
          },
          (decoded) => {
            // Successful read — stop the camera and bubble up.
            // Wrap in try/catch so a failure to stop (e.g. another
            // pending stop already in flight) doesn't crash the
            // onScan handler.
            try {
              scanner.stop().catch(() => {});
            } catch {
              /* noop */
            }
            onScan(decoded);
          },
          () => {
            // Per-frame "no match" callback — fires constantly while
            // the camera is running. We don't care; suppress.
          },
        );
        if (cancelled) {
          try { await scanner.stop(); } catch { /* noop */ }
          return;
        }
        setStarting(false);
      } catch (e) {
        if (cancelled) return;
        const msg =
          e instanceof Error
            ? e.name === "NotAllowedError"
              ? "Camera access denied. Allow camera in your browser settings and try again."
              : e.name === "NotFoundError"
              ? "No camera found on this device."
              : e.message
            : "Could not start camera.";
        setErr(msg);
        setStarting(false);
      }
    })();

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        s.stop().catch(() => {}).finally(() => {
          try { s.clear(); } catch { /* noop */ }
        });
      }
    };
  }, [open, onScan]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
          aria-label="Close scanner"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">Scan booking QR</h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
          Hold the patient&apos;s QR code in front of the camera. Detection is automatic.
        </p>

        <div
          id="odudoc-qr-scanner-region"
          ref={containerRef}
          className="mt-4 aspect-square w-full overflow-hidden rounded-lg border border-gray-200 dark:border-slate-800 bg-black"
        />

        {starting && !err && (
          <p className="mt-3 text-center text-xs text-gray-500 dark:text-slate-400">Starting camera…</p>
        )}

        {err && (
          <div className="mt-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700">
            {err}
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-lg border border-gray-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/** Extract a booking id (BK-XXXX) from anything the scanner returns —
 *  works whether the QR encoded a full URL (https://odudoc.com/b/BK-1234),
 *  just the path (/b/BK-1234), or the bare booking id. */
export function extractBookingId(payload: string): string | null {
  if (!payload) return null;
  const m = payload.match(/BK-\d+/i);
  return m ? m[0].toUpperCase() : null;
}
