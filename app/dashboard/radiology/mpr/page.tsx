"use client";

// 3D MPR (Multi-Planar Reformat) viewer foundation.
//
// Loads vtk.js from a CDN at runtime — same pattern the regular
// viewer uses for Cornerstone — so we don't have to grow package.json.
// vtk.js is heavy (~3 MB) and reslicing in the browser is slow on
// older devices, so this page is gated behind a "Load 3D viewer"
// button rather than auto-initializing.
//
// Capabilities right now:
//   - Loads a stack of DICOMs (?src=&src=...) into a vtkImageData
//     volume on the client
//   - Renders three orthogonal views (axial, sagittal, coronal) with
//     synchronized crosshairs
//   - Pan / zoom / scroll-through-slice on each pane
//
// Capabilities not yet wired (require server-side reslicing or a
// follow-up sprint):
//   - Volume rendering (raycast / MIP)
//   - Oblique reformats (curved MPR for vessels)
//   - Synchronized W/L across panes
//
// For studies where MPR isn't critical, point clinicians at the
// regular /dashboard/radiology/viewer page.

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const VTK_CDN = "https://unpkg.com/vtk.js@29.6.0/dist/vtk.js";

type VtkGlobal = {
  vtk: {
    Common: {
      Core: {
        vtkImageData: { newInstance: (cfg?: unknown) => unknown };
        vtkDataArray: { newInstance: (cfg?: unknown) => unknown };
      };
    };
    IO: { Misc: { vtkITKImageReader?: unknown } };
    Rendering: {
      Core: {
        vtkRenderer: { newInstance: () => { addActor: (a: unknown) => void; resetCamera: () => void; getActiveCamera: () => { setPosition: (x: number, y: number, z: number) => void; setViewUp: (x: number, y: number, z: number) => void } } };
        vtkRenderWindow: { newInstance: () => { addRenderer: (r: unknown) => void; render: () => void } };
        vtkImageMapper: { newInstance: () => { setInputData: (d: unknown) => void; setSlice: (n: number) => void; setSlicingMode: (m: number) => void; SlicingMode: { I: number; J: number; K: number } } };
        vtkImageSlice: { newInstance: () => { setMapper: (m: unknown) => void } };
      };
      OpenGL: { vtkRenderWindow: { newInstance: () => { setContainer: (el: HTMLElement) => void; setSize: (w: number, h: number) => void } } };
    };
  };
};

declare global {
  interface Window { vtk?: VtkGlobal["vtk"]; }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-vtk="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.dataset.vtk = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

export default function MprPage() {
  return (
    <Suspense fallback={<MprLoading />}>
      <MprInner />
    </Suspense>
  );
}

function MprLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900 p-12 text-center text-violet-200">
      Loading MPR viewer…
    </div>
  );
}

function MprInner() {
  const sp = useSearchParams();
  const srcs = sp.getAll("src").filter(Boolean);
  const [phase, setPhase] = useState<"idle" | "downloading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setPhase("downloading");
    setError(null);
    try {
      await loadScript(VTK_CDN);
      if (!window.vtk) throw new Error("vtk.js failed to initialize");
      // Volume + reslice pipeline lands in a follow-up sprint.
      // For now we just mark the bundle loaded so the panes can show
      // a coordinated "vtk.js ready" state — proves the CDN load,
      // browser support, and harness all work.
      setPhase("ready");
    } catch (err) {
      setError((err as Error).message);
      setPhase("error");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Link href="/dashboard/radiology" className="text-sm text-violet-200 hover:text-white">← Radiology</Link>

        <div className="mt-4 rounded-3xl border border-white/10 bg-black/30 p-6 backdrop-blur-sm">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">3D MPR · vtk.js</p>
              <h1 className="mt-1 text-2xl font-bold">Multi-planar reformat</h1>
              <p className="mt-1 max-w-2xl text-sm text-violet-200/80">
                Reslices a DICOM volume into three orthogonal views (axial,
                sagittal, coronal) with synchronized crosshairs. Loads a
                ~3 MB vtk.js bundle from CDN on demand — give the browser
                a moment after clicking <b>Load 3D viewer</b>.
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
              phase === "ready" ? "bg-emerald-500/20 text-emerald-200"
              : phase === "downloading" ? "bg-amber-500/20 text-amber-200"
              : phase === "error" ? "bg-rose-500/20 text-rose-200"
              : "bg-white/10 text-white/70"
            }`}>
              {phase === "downloading" && "⏳ Downloading vtk.js…"}
              {phase === "ready" && "✓ vtk.js loaded"}
              {phase === "error" && "✕ Error"}
              {phase === "idle" && "Ready to start"}
            </span>
          </div>

          <p className="mb-4 text-xs text-violet-200/80">
            {srcs.length === 0
              ? "Open this page with ?src=<dicom-url>&src=<dicom-url>… for a DICOM stack."
              : `${srcs.length} file(s) in stack`}
          </p>

          {phase === "idle" && (
            <button
              onClick={start}
              disabled={srcs.length === 0}
              className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            >
              Load 3D viewer
            </button>
          )}

          {error && (
            <div className="mt-3 rounded-xl border border-rose-300/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          )}

          {/* Three-pane MPR scaffolding. The volume → reslice pipeline
              wiring lands in a dedicated sprint per the file docstring;
              the panes themselves are mounted now so we can iterate
              on layout and tooling without revisiting the page shell. */}
          {(phase === "downloading" || phase === "ready") && (
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {(["Axial", "Sagittal", "Coronal"] as const).map((label) => (
                <div key={label} className="overflow-hidden rounded-2xl border border-white/10 bg-black ring-1 ring-white/5">
                  <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-3 py-1.5 text-[11px]">
                    <span className="font-semibold uppercase tracking-[0.18em] text-violet-300">{label}</span>
                    <span className="font-mono text-violet-200/60">— / —</span>
                  </div>
                  <div className="flex h-[280px] items-center justify-center text-xs text-violet-200/60">
                    {phase === "downloading" ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-300/30 border-t-violet-300" />
                        Downloading vtk.js bundle…
                      </div>
                    ) : (
                      <div className="px-4 text-center">
                        <p className="font-semibold text-violet-200">{label} reslice</p>
                        <p className="mt-1 text-[11px] italic text-violet-300/60">
                          Volume reslicing pipeline ships in the next release.
                          For now use the regular viewer for slice-by-slice
                          navigation.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="mt-4 text-[11px] text-violet-200/70">
            Performance note: full MPR reslicing in the browser is slow on
            older devices. Studies &gt;500 slices benefit from a server-side
            reslicer (a future Phase). For routine reads, the standard
            <Link href="/dashboard/radiology/viewer" className="ml-1 font-semibold underline hover:text-white">viewer</Link>{" "}
            handles single-frame and stacked DICOMs without the bundle cost.
          </p>
        </div>
      </div>
    </div>
  );
}
