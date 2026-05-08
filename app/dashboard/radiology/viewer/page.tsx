"use client";

// Universal DICOM viewer.
//
// Loads Cornerstone.js lazily from a CDN at runtime — no package.json
// changes required. Works for the common cases (single-frame DICOM
// over HTTPS) and degrades gracefully for unsupported files. Pass the
// DICOM URL via ?src=<url>.
//
// For non-DICOM files, this page redirects them to the universal
// MedicalFileViewer which handles PDF / image / etc. natively.

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import MedicalFileViewer from "@/components/MedicalFileViewer";

// Cornerstone CDN bundle. We pin to a known-stable major to avoid
// surprise breakage; bump deliberately when upgrading.
const CDN = {
  cornerstone: "https://unpkg.com/cornerstone-core@2.6.1/dist/cornerstone.min.js",
  parser: "https://unpkg.com/dicom-parser@1.8.21/dist/dicomParser.min.js",
  loader: "https://unpkg.com/cornerstone-wado-image-loader@4.13.2/dist/cornerstoneWADOImageLoader.bundle.min.js",
};

type Cs = {
  enable: (el: HTMLElement) => void;
  disable: (el: HTMLElement) => void;
  loadAndCacheImage: (id: string) => Promise<unknown>;
  displayImage: (el: HTMLElement, image: unknown) => void;
  registerImageLoader?: (scheme: string, fn: unknown) => void;
};

declare global {
  interface Window {
    cornerstone?: Cs;
    cornerstoneWADOImageLoader?: {
      external: { cornerstone?: Cs; dicomParser?: unknown };
      configure?: (cfg: unknown) => void;
      wadouri?: { loadImage?: unknown };
    };
    dicomParser?: unknown;
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-cs="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.dataset.cs = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

function isDicomUrl(url: string): boolean {
  return /\.dcm(\?|$)/i.test(url) || /content-type=application\/dicom/i.test(url);
}

export default function DicomViewer() {
  const sp = useSearchParams();
  const src = sp.get("src") || "";
  const elRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!src || !isDicomUrl(src)) return;
    let disposed = false;
    setStatus("loading");
    setError(null);

    (async () => {
      try {
        // Load all three CDN scripts in order so the loader can wire
        // itself up to cornerstone + dicom-parser.
        await loadScript(CDN.cornerstone);
        await loadScript(CDN.parser);
        await loadScript(CDN.loader);
        if (disposed) return;
        const cs = window.cornerstone;
        const cwil = window.cornerstoneWADOImageLoader;
        const dp = window.dicomParser;
        if (!cs || !cwil || !dp || !elRef.current) {
          throw new Error("Cornerstone failed to initialize");
        }
        cwil.external.cornerstone = cs;
        cwil.external.dicomParser = dp;
        cs.enable(elRef.current);
        // wadouri: scheme — load remote DICOM directly over HTTPS.
        const imageId = "wadouri:" + src;
        const image = await cs.loadAndCacheImage(imageId);
        if (disposed) return;
        cs.displayImage(elRef.current, image);
        setStatus("ready");
      } catch (err) {
        setError((err as Error).message);
        setStatus("error");
      }
    })();

    return () => {
      disposed = true;
      if (elRef.current && window.cornerstone) {
        try { window.cornerstone.disable(elRef.current); } catch { /* noop */ }
      }
    };
  }, [src]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900 text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Link href="/dashboard/radiology" className="text-sm text-violet-200 hover:text-white">← Radiology</Link>

        <div className="mt-4 rounded-3xl border border-white/10 bg-black/30 p-8 backdrop-blur-sm">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">DICOM viewer</p>
              <h1 className="mt-1 text-2xl font-bold">Imaging study</h1>
              <p className="mt-1 text-xs text-violet-200/80">
                {src ? <>Source: <code className="rounded bg-white/10 px-1.5 py-0.5">{src}</code></> : "No source provided"}
              </p>
            </div>
            <div className="flex gap-2 text-xs">
              <span className={`rounded-full px-3 py-1 font-semibold ${status === "ready" ? "bg-emerald-500/20 text-emerald-200" : status === "loading" ? "bg-amber-500/20 text-amber-200" : status === "error" ? "bg-rose-500/20 text-rose-200" : "bg-white/10 text-white/70"}`}>
                {status === "loading" && "⏳ Loading…"}
                {status === "ready" && "✓ Ready"}
                {status === "error" && "✕ Error"}
                {status === "idle" && "Awaiting source"}
              </span>
            </div>
          </div>

          {!src && (
            <div className="rounded-2xl border border-dashed border-white/20 p-16 text-center">
              <p className="text-violet-200">Open this page with <code className="rounded bg-white/10 px-1.5 py-0.5">?src=&lt;dicom-url&gt;</code> to view a study.</p>
            </div>
          )}

          {src && !isDicomUrl(src) && (
            <div className="rounded-2xl bg-white p-2 text-slate-900">
              <MedicalFileViewer url={src} filename={src.split("/").pop() || "file"} />
            </div>
          )}

          {src && isDicomUrl(src) && (
            <>
              <div
                ref={elRef}
                className="relative h-[600px] w-full overflow-hidden rounded-2xl bg-black ring-1 ring-white/10"
                style={{ touchAction: "none" }}
              />
              {error && (
                <div className="mt-3 rounded-xl border border-rose-300/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {error}
                </div>
              )}
              <p className="mt-3 text-[11px] text-violet-200/70">
                Cornerstone v2.6 · loaded from CDN · scroll to zoom (browser default), drag to pan in supported builds.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
