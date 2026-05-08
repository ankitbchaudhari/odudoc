"use client";

// Universal DICOM viewer — Cornerstone v2 + cornerstone-tools v6 loaded
// from a CDN at runtime so we don't have to grow package.json. Wires:
//   - single + multi-frame DICOM (W/L drag, scroll-to-zoom, pinch)
//   - frame slider for multi-frame studies (CT/MRI series)
//   - tools: pan, zoom, window/level, length measurement, angle,
//            elliptical ROI, rectangle ROI
//   - W/L preset buttons (Lung, Bone, Brain, Soft tissue)
//   - reset / invert / fit
//
// Usage: /dashboard/radiology/viewer?src=<dicom-url> for a single
// study, or ?src=<u1>&src=<u2>&...src=<un> for a stack.

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import MedicalFileViewer from "@/components/MedicalFileViewer";

const CDN = {
  cornerstone: "https://unpkg.com/cornerstone-core@2.6.1/dist/cornerstone.min.js",
  parser: "https://unpkg.com/dicom-parser@1.8.21/dist/dicomParser.min.js",
  loader: "https://unpkg.com/cornerstone-wado-image-loader@4.13.2/dist/cornerstoneWADOImageLoader.bundle.min.js",
  hammer: "https://unpkg.com/hammerjs@2.0.8/hammer.min.js",
  math: "https://unpkg.com/cornerstone-math@0.1.10/dist/cornerstoneMath.min.js",
  tools: "https://unpkg.com/cornerstone-tools@6.0.10/dist/cornerstoneTools.min.js",
};

type ImageId = string;

interface CsImage {
  windowCenter?: number;
  windowWidth?: number;
  numberOfFrames?: number;
}

type Cs = {
  enable: (el: HTMLElement) => void;
  disable: (el: HTMLElement) => void;
  loadAndCacheImage: (id: ImageId) => Promise<CsImage>;
  displayImage: (el: HTMLElement, image: CsImage, viewport?: unknown) => void;
  getViewport: (el: HTMLElement) => Record<string, unknown>;
  setViewport: (el: HTMLElement, vp: Record<string, unknown>) => void;
  reset: (el: HTMLElement) => void;
  resize: (el: HTMLElement) => void;
};

type CsTools = {
  external: Record<string, unknown>;
  init: (cfg?: unknown) => void;
  addTool: (tool: unknown) => void;
  setToolActive: (name: string, opts?: unknown) => void;
  PanTool: unknown;
  ZoomTool: unknown;
  WwwcTool: unknown;
  LengthTool: unknown;
  AngleTool: unknown;
  EllipticalRoiTool: unknown;
  RectangleRoiTool: unknown;
  StackScrollMouseWheelTool: unknown;
  StackScrollTool: unknown;
  clearToolState: (el: HTMLElement, toolName: string) => void;
};

declare global {
  interface Window {
    cornerstone?: Cs;
    cornerstoneTools?: CsTools;
    cornerstoneWADOImageLoader?: {
      external: { cornerstone?: Cs; dicomParser?: unknown };
      configure?: (cfg: unknown) => void;
    };
    dicomParser?: unknown;
    cornerstoneMath?: unknown;
    Hammer?: unknown;
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

const TOOLS = [
  { id: "Wwwc", label: "W/L", emoji: "🌓", hint: "Drag to adjust window/level" },
  { id: "Pan", label: "Pan", emoji: "✋", hint: "Drag to pan" },
  { id: "Zoom", label: "Zoom", emoji: "🔍", hint: "Drag to zoom" },
  { id: "StackScroll", label: "Scroll", emoji: "📜", hint: "Drag/scroll to flip frames" },
  { id: "Length", label: "Length", emoji: "📏", hint: "Click two points" },
  { id: "Angle", label: "Angle", emoji: "📐", hint: "Click three points" },
  { id: "EllipticalRoi", label: "Ellipse", emoji: "⭕", hint: "Drag for ROI" },
  { id: "RectangleRoi", label: "Rect", emoji: "⬛", hint: "Drag for ROI" },
] as const;

const PRESETS: Array<{ name: string; ww: number; wc: number }> = [
  { name: "Lung",        ww: 1500, wc: -600 },
  { name: "Bone",        ww: 2500, wc:  480 },
  { name: "Brain",       ww:   80, wc:   40 },
  { name: "Soft tissue", ww:  400, wc:   40 },
  { name: "Liver",       ww:  150, wc:   60 },
];

// useSearchParams() requires a Suspense boundary for Next.js 14
// prerendering. We wrap the search-params reading body in
// DicomViewerInner and have the page export a thin <Suspense>
// shell so the build can prerender successfully without bailing
// the whole route to client-only.
export default function DicomViewerPage() {
  return (
    <Suspense fallback={<DicomViewerLoadingShell />}>
      <DicomViewerInner />
    </Suspense>
  );
}

function DicomViewerLoadingShell() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900 p-12 text-center text-violet-200">
      Loading DICOM viewer…
    </div>
  );
}

function DicomViewerInner() {
  const sp = useSearchParams();
  // Support stacks via ?src=...&src=... .
  const srcs: string[] = sp.getAll("src").filter(Boolean);
  const elRef = useRef<HTMLDivElement | null>(null);
  const stackRef = useRef<{ ids: ImageId[]; idx: number; numFrames: number } | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<typeof TOOLS[number]["id"]>("Wwwc");
  const [frame, setFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(1);
  const [inverted, setInverted] = useState(false);

  const allDicom = srcs.length > 0 && srcs.every(isDicomUrl);

  // Lazy script load + cornerstone setup.
  useEffect(() => {
    if (!allDicom) return;
    let disposed = false;
    setStatus("loading");
    setError(null);

    (async () => {
      try {
        // Load order matters: cornerstone first, then dicomParser,
        // then the loader (which references the first two), then
        // cornerstoneMath + Hammer for tools, then tools last.
        await loadScript(CDN.cornerstone);
        await loadScript(CDN.parser);
        await loadScript(CDN.loader);
        await loadScript(CDN.math);
        await loadScript(CDN.hammer);
        await loadScript(CDN.tools);
        if (disposed) return;
        const cs = window.cornerstone;
        const ct = window.cornerstoneTools;
        const cwil = window.cornerstoneWADOImageLoader;
        const dp = window.dicomParser;
        const cm = window.cornerstoneMath;
        const hm = window.Hammer;
        if (!cs || !ct || !cwil || !dp || !cm || !hm || !elRef.current) {
          throw new Error("Cornerstone failed to initialize");
        }
        cwil.external.cornerstone = cs;
        cwil.external.dicomParser = dp;
        ct.external.cornerstone = cs;
        ct.external.cornerstoneMath = cm;
        ct.external.Hammer = hm;
        ct.init({ globalToolSyncEnabled: true });

        cs.enable(elRef.current);

        // Register tools — adding all so the toolbar can switch
        // between them without re-init.
        ct.addTool(ct.WwwcTool);
        ct.addTool(ct.PanTool);
        ct.addTool(ct.ZoomTool);
        ct.addTool(ct.StackScrollTool);
        ct.addTool(ct.StackScrollMouseWheelTool);
        ct.addTool(ct.LengthTool);
        ct.addTool(ct.AngleTool);
        ct.addTool(ct.EllipticalRoiTool);
        ct.addTool(ct.RectangleRoiTool);
        ct.setToolActive("StackScrollMouseWheel", {});

        // Build stack: each src becomes a wadouri image id. For a
        // single-src multi-frame DICOM, cornerstone exposes
        // numberOfFrames on the loaded image; we replicate the id
        // per frame so StackScrollTool can navigate between them.
        const baseIds: ImageId[] = srcs.map((s) => "wadouri:" + s);
        const firstImage = await cs.loadAndCacheImage(baseIds[0]);
        if (disposed) return;
        let imageIds: ImageId[];
        const nf = firstImage.numberOfFrames || 1;
        if (baseIds.length === 1 && nf > 1) {
          imageIds = Array.from({ length: nf }, (_, i) => `${baseIds[0]}?frame=${i}`);
        } else {
          imageIds = baseIds;
        }
        stackRef.current = { ids: imageIds, idx: 0, numFrames: imageIds.length };
        setTotalFrames(imageIds.length);

        cs.displayImage(elRef.current, firstImage);
        // Wire up the tool state with the stack so StackScroll works.
        // cornerstone-tools' StackScrollTool reads "stack" toolState.
        type StateMgr = { addToolState: (el: HTMLElement, name: string, data: unknown) => void };
        const stateMgr = (ct as unknown as { addToolState?: StateMgr["addToolState"] });
        if (typeof stateMgr.addToolState === "function") {
          stateMgr.addToolState(elRef.current, "stack", { currentImageIdIndex: 0, imageIds });
        }
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
  }, [allDicom, srcs]);

  // Tool switcher.
  useEffect(() => {
    const ct = window.cornerstoneTools;
    if (!ct || status !== "ready") return;
    try {
      ct.setToolActive(activeTool, { mouseButtonMask: 1 });
    } catch (err) {
      // setToolActive is forgiving; log only.
      // eslint-disable-next-line no-console
      console.warn("[DICOM] setToolActive", activeTool, err);
    }
  }, [activeTool, status]);

  // Frame navigation for multi-frame stacks.
  const setFrameIdx = useCallback(async (idx: number) => {
    const cs = window.cornerstone;
    const stack = stackRef.current;
    if (!cs || !stack || !elRef.current) return;
    const clamped = Math.max(0, Math.min(stack.numFrames - 1, idx));
    stack.idx = clamped;
    setFrame(clamped);
    try {
      const image = await cs.loadAndCacheImage(stack.ids[clamped]);
      const vp = cs.getViewport(elRef.current);
      cs.displayImage(elRef.current, image, vp);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  // Window/level preset.
  const applyPreset = useCallback((ww: number, wc: number) => {
    const cs = window.cornerstone;
    if (!cs || !elRef.current) return;
    const vp = cs.getViewport(elRef.current);
    cs.setViewport(elRef.current, { ...vp, voi: { windowWidth: ww, windowCenter: wc } });
  }, []);

  const reset = useCallback(() => {
    if (window.cornerstone && elRef.current) window.cornerstone.reset(elRef.current);
    setInverted(false);
  }, []);

  const toggleInvert = useCallback(() => {
    const cs = window.cornerstone;
    if (!cs || !elRef.current) return;
    const vp = cs.getViewport(elRef.current);
    cs.setViewport(elRef.current, { ...vp, invert: !inverted });
    setInverted(!inverted);
  }, [inverted]);

  const clearMeasurements = useCallback(() => {
    const ct = window.cornerstoneTools;
    if (!ct || !elRef.current) return;
    try {
      ct.clearToolState(elRef.current, "Length");
      ct.clearToolState(elRef.current, "Angle");
      ct.clearToolState(elRef.current, "EllipticalRoi");
      ct.clearToolState(elRef.current, "RectangleRoi");
      if (window.cornerstone) window.cornerstone.resize(elRef.current);
    } catch { /* noop */ }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Link href="/dashboard/radiology" className="text-sm text-violet-200 hover:text-white">← Radiology</Link>

        <div className="mt-4 rounded-3xl border border-white/10 bg-black/30 p-6 backdrop-blur-sm">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">DICOM viewer · Cornerstone v2</p>
              <h1 className="mt-1 text-2xl font-bold">Imaging study</h1>
              <p className="mt-1 text-xs text-violet-200/80">
                {srcs.length > 1 ? `${srcs.length} files in stack` : srcs[0] ? <code className="rounded bg-white/10 px-1.5 py-0.5">{srcs[0]}</code> : "No source provided"}
                {totalFrames > 1 && <> · frame {frame + 1}/{totalFrames}</>}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`rounded-full px-3 py-1 font-semibold ${
                status === "ready" ? "bg-emerald-500/20 text-emerald-200"
                : status === "loading" ? "bg-amber-500/20 text-amber-200"
                : status === "error" ? "bg-rose-500/20 text-rose-200"
                : "bg-white/10 text-white/70"
              }`}>
                {status === "loading" && "⏳ Loading…"}
                {status === "ready" && "✓ Ready"}
                {status === "error" && "✕ Error"}
                {status === "idle" && "Awaiting source"}
              </span>
            </div>
          </div>

          {!srcs.length && (
            <div className="rounded-2xl border border-dashed border-white/20 p-16 text-center">
              <p className="text-violet-200">Open this page with <code className="rounded bg-white/10 px-1.5 py-0.5">?src=&lt;dicom-url&gt;</code> to view a study. Pass <code>?src=&hellip;&src=&hellip;</code> for a multi-image stack.</p>
            </div>
          )}

          {srcs.length > 0 && !allDicom && (
            <div className="rounded-2xl bg-white p-2 text-slate-900">
              <MedicalFileViewer url={srcs[0]} filename={srcs[0].split("/").pop() || "file"} />
            </div>
          )}

          {srcs.length > 0 && allDicom && (
            <>
              {/* Tool toolbar */}
              <div className="mb-3 flex flex-wrap gap-1.5">
                {TOOLS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTool(t.id)}
                    title={t.hint}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      activeTool === t.id
                        ? "bg-violet-500 text-white shadow-lg"
                        : "border border-white/15 bg-white/5 text-violet-100 hover:bg-white/10"
                    }`}
                  >
                    <span className="mr-1">{t.emoji}</span>{t.label}
                  </button>
                ))}
                <span className="mx-2 self-center text-xs text-white/30">|</span>
                <button onClick={toggleInvert} className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-violet-100 hover:bg-white/10">
                  🔃 Invert
                </button>
                <button onClick={clearMeasurements} className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-violet-100 hover:bg-white/10">
                  🧹 Clear
                </button>
                <button onClick={reset} className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-violet-100 hover:bg-white/10">
                  ↺ Reset
                </button>
              </div>

              {/* W/L presets */}
              <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[10px] uppercase tracking-[0.18em] text-violet-300">W/L preset:</span>
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => applyPreset(p.ww, p.wc)}
                    className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-semibold text-violet-100 hover:bg-white/15"
                  >
                    {p.name}
                  </button>
                ))}
              </div>

              <div
                ref={elRef}
                className="relative h-[600px] w-full overflow-hidden rounded-2xl bg-black ring-1 ring-white/10"
                style={{ touchAction: "none" }}
              />

              {/* Frame slider */}
              {totalFrames > 1 && (
                <div className="mt-3 flex items-center gap-3 rounded-xl bg-white/5 px-4 py-2">
                  <span className="text-xs text-violet-200">Frame</span>
                  <input
                    type="range"
                    min={0}
                    max={totalFrames - 1}
                    value={frame}
                    onChange={(e) => setFrameIdx(Number(e.target.value))}
                    className="flex-1 accent-violet-400"
                  />
                  <span className="font-mono text-xs text-white">{frame + 1} / {totalFrames}</span>
                </div>
              )}

              {error && (
                <div className="mt-3 rounded-xl border border-rose-300/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {error}
                </div>
              )}
              <p className="mt-3 text-[11px] text-violet-200/70">
                Cornerstone v2.6 + cornerstone-tools v6 · loaded from CDN · scroll
                wheel flips frames · drag with the active tool to operate.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
