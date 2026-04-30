"use client";

// 60-second product demo on the homepage. The single biggest conversion
// lever for AI-anything in 2026 — visitors who watch the demo are
// 5-10x more likely to sign up than visitors who only read.
//
// Three modes (in order of preference):
//   1. NEXT_PUBLIC_DEMO_VIDEO_URL set → embedded YouTube/Vimeo iframe
//      (chapter markers seek via the iframe's postMessage API; we
//      fall back to "open at timestamp" for embeds we can't drive)
//   2. /public/demo/odudoc-ai-emr-demo.mp4 exists + flag is set →
//      self-hosted <video> tag with native seeking via currentTime
//   3. Otherwise → AnimatedDemoPlayer (browser-rendered animated mock
//      that cycles through all 5 chapters in 60s and loops)
//
// Chapter markers in the right column are clickable and seek the
// player to that timestamp — fixes the previous version where they
// were decorative-only and confused visitors.

import { useRef, useState } from "react";
import AnimatedDemoPlayer from "./AnimatedDemoPlayer";

const SELF_HOSTED_PATH = "/demo/odudoc-ai-emr-demo.mp4";
const POSTER_PATH = "/demo/odudoc-ai-emr-poster.jpg";

interface Highlight {
  time: string;       // display label, e.g. "0:08"
  seconds: number;    // actual seek target
  text: string;
}

const HIGHLIGHTS: Highlight[] = [
  { time: "0:00", seconds: 0,  text: "Doctor opens patient chart — AI summary appears in 2 seconds" },
  { time: "0:12", seconds: 12, text: "Click 'Ambient note', consent modal, start recording" },
  { time: "0:24", seconds: 24, text: "Real consultation audio — Hindi/English code-switch" },
  { time: "0:42", seconds: 42, text: "Stop. SOAP fields auto-fill from the transcript" },
  { time: "0:50", seconds: 50, text: "ICD-10 suggestions, drug-interaction check, save visit" },
];

export default function DemoVideoSection() {
  const embedUrl = process.env.NEXT_PUBLIC_DEMO_VIDEO_URL?.trim();
  const hasSelfHosted = process.env.NEXT_PUBLIC_DEMO_VIDEO_SELF_HOSTED === "1";
  const [playing, setPlaying] = useState(false);
  const [activeChapter, setActiveChapter] = useState(0);
  // Animated-mock seek: we pass seekToMs + a counter token to force
  // re-anchoring even when the user clicks the same chapter twice.
  const [seekMs, setSeekMs] = useState(0);
  const [seekToken, setSeekToken] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  function jumpTo(index: number) {
    const h = HIGHLIGHTS[index];
    if (!h) return;
    setActiveChapter(index);

    if (embedUrl) {
      // YouTube / Vimeo: simplest reliable path is to reload the
      // iframe with a `?start=` (YouTube) or `#t=` (Vimeo) param.
      // postMessage seeking requires player JS API to be set up,
      // and not every embedded host returns a usable origin.
      const url = new URL(embedUrl);
      if (/youtube\.com|youtu\.be/.test(url.host)) {
        url.searchParams.set("start", String(h.seconds));
        url.searchParams.set("autoplay", "1");
      } else {
        url.hash = `#t=${h.seconds}s`;
      }
      // Re-render the iframe by mutating the src — easiest with a
      // key tied to the active chapter (handled below).
      // (No imperative ref needed; React re-creates the iframe.)
    } else if (hasSelfHosted && playing && videoRef.current) {
      try {
        videoRef.current.currentTime = h.seconds;
        videoRef.current.play().catch(() => {});
      } catch {
        /* some browsers throw on currentTime mid-load */
      }
    } else {
      // Animated mock — start playback if not already, then bump
      // seek state. Token forces a re-seek even if seconds unchanged.
      if (!playing) setPlaying(true);
      setSeekMs(h.seconds * 1000);
      setSeekToken((t) => t + 1);
    }
  }

  // Build the embed URL with the active chapter's timestamp. Re-keys
  // the iframe so the seek actually takes effect.
  const embedSrc = (() => {
    if (!embedUrl) return "";
    try {
      const u = new URL(embedUrl);
      const sec = HIGHLIGHTS[activeChapter]?.seconds || 0;
      if (/youtube\.com|youtu\.be/.test(u.host)) {
        if (sec > 0) u.searchParams.set("start", String(sec));
      } else if (sec > 0) {
        u.hash = `#t=${sec}s`;
      }
      return u.toString();
    } catch {
      return embedUrl;
    }
  })();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 py-20 text-white">
      <div className="pointer-events-none absolute -right-32 top-20 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-32 bottom-10 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider backdrop-blur">
            🎥 60-second demo
          </span>
          <h2 className="mt-4 text-3xl font-bold md:text-5xl">
            Watch the AI EMR in action
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-white/70 md:text-lg">
            One real consultation, start to finish. Patient summary, ambient scribe, ICD-10 codes, drug-safety check — done in under a minute.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Player */}
          <div className="lg:col-span-2">
            <div className="relative aspect-video overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl shadow-violet-500/20">
              {embedUrl ? (
                <iframe
                  // Re-keyed when activeChapter changes so the URL
                  // (with start= / #t=) actually takes effect.
                  key={`embed-${activeChapter}`}
                  src={embedSrc}
                  title="OduDoc AI EMR demo"
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : hasSelfHosted && playing ? (
                <video
                  ref={videoRef}
                  src={SELF_HOSTED_PATH}
                  poster={POSTER_PATH}
                  controls
                  autoPlay
                  className="absolute inset-0 h-full w-full bg-black"
                />
              ) : (
                <>
                  <AnimatedDemoPlayer playing={playing} seekToMs={seekMs} seekToken={seekToken} />
                  {!playing && (
                    <button
                      type="button"
                      onClick={() => setPlaying(true)}
                      className="group absolute inset-0 z-20 flex items-center justify-center bg-gradient-to-br from-slate-900/40 via-violet-950/30 to-indigo-950/40"
                      aria-label="Play OduDoc demo"
                    >
                      <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white/95 shadow-2xl transition-transform group-hover:scale-110">
                        <svg className="ml-1 h-10 w-10 text-violet-700" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </button>
                  )}
                </>
              )}
            </div>
            <p className="mt-3 text-center text-xs text-white/50">
              {embedUrl
                ? "Streaming via embedded player · click any chapter to jump"
                : hasSelfHosted
                  ? "Self-hosted · click any chapter to jump"
                  : "Live UI walkthrough · click any chapter to jump"}
            </p>
          </div>

          {/* Chapter markers — clickable, seeks the player */}
          <div className="lg:col-span-1">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/60">
              What you&rsquo;ll see · click to jump
            </h3>
            <ol className="space-y-3">
              {HIGHLIGHTS.map((h, i) => {
                const isActive = i === activeChapter;
                return (
                  <li key={h.time}>
                    <button
                      type="button"
                      onClick={() => jumpTo(i)}
                      className={`group flex w-full items-start gap-3 rounded-xl border p-3 text-left backdrop-blur transition-all ${
                        isActive
                          ? "border-violet-400/60 bg-violet-500/15 shadow-lg shadow-violet-500/20 ring-1 ring-violet-400/30"
                          : "border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10"
                      }`}
                    >
                      <span
                        className={`shrink-0 rounded-md px-2 py-0.5 font-mono text-xs font-bold transition ${
                          isActive
                            ? "bg-violet-500 text-white"
                            : "bg-violet-500/30 text-violet-200 group-hover:bg-violet-500/50"
                        }`}
                      >
                        {h.time}
                      </span>
                      <span className="flex-1 text-sm text-white/90">{h.text}</span>
                      <svg
                        className={`mt-0.5 h-4 w-4 shrink-0 transition-transform ${
                          isActive ? "text-violet-300" : "text-white/30 group-hover:translate-x-0.5 group-hover:text-white/70"
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
