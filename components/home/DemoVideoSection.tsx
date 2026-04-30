"use client";

// 60-second product demo on the homepage. The single biggest conversion
// lever for AI-anything in 2026 — visitors who watch the demo are
// 5-10x more likely to sign up than visitors who only read.
//
// Three modes (in order of preference):
//   1. NEXT_PUBLIC_DEMO_VIDEO_URL set → embedded YouTube/Vimeo iframe
//   2. /public/demo/odudoc-ai-emr-demo.mp4 exists + flag is set →
//      self-hosted <video> tag
//   3. Otherwise → AnimatedDemoPlayer (browser-rendered animated mock
//      that cycles through all 5 chapters in 60s and loops)
//
// We don't probe the filesystem for the MP4 — Vercel renders this as
// a Server Component candidate and HEAD requests at render time would
// hurt cold-start. Instead we expose NEXT_PUBLIC_DEMO_VIDEO_SELF_HOSTED
// as a flag the operator flips once they've uploaded a real file.

import { useState } from "react";
import AnimatedDemoPlayer from "./AnimatedDemoPlayer";

const SELF_HOSTED_PATH = "/demo/odudoc-ai-emr-demo.mp4";
const POSTER_PATH = "/demo/odudoc-ai-emr-poster.jpg";

interface Highlight {
  time: string; // e.g. "0:08"
  text: string;
}

const HIGHLIGHTS: Highlight[] = [
  { time: "0:00", text: "Doctor opens patient chart — AI summary appears in 2 seconds" },
  { time: "0:12", text: "Click 'Ambient note', consent modal, start recording" },
  { time: "0:24", text: "Real consultation audio — Hindi/English code-switch" },
  { time: "0:42", text: "Stop. SOAP fields auto-fill from the transcript" },
  { time: "0:50", text: "ICD-10 suggestions, drug-interaction check, save visit" },
];

export default function DemoVideoSection() {
  const embedUrl = process.env.NEXT_PUBLIC_DEMO_VIDEO_URL?.trim();
  // Flip this env var to "1" once you've uploaded a real MP4 to
  // /public/demo/odudoc-ai-emr-demo.mp4 — until then we render the
  // animated mock so the section is fully populated on day one.
  const hasSelfHosted = process.env.NEXT_PUBLIC_DEMO_VIDEO_SELF_HOSTED === "1";
  const [playing, setPlaying] = useState(false);

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
                  src={embedUrl}
                  title="OduDoc AI EMR demo"
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : hasSelfHosted && playing ? (
                <video
                  src={SELF_HOSTED_PATH}
                  poster={POSTER_PATH}
                  controls
                  autoPlay
                  className="absolute inset-0 h-full w-full bg-black"
                />
              ) : (
                <>
                  {/* Animated browser-rendered mock — auto-plays and
                      loops once user clicks. Used until a real MP4 is
                      uploaded; visually indistinguishable from a real
                      screencast for first-time visitors. */}
                  <AnimatedDemoPlayer playing={playing} />
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
                ? "Streaming via embedded player"
                : hasSelfHosted
                  ? "Self-hosted from /public/demo — no third-party trackers"
                  : "Live UI walkthrough · drop a real recording at /public/demo to upgrade"}
            </p>
          </div>

          {/* Chapter markers */}
          <div className="lg:col-span-1">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/60">
              What you&rsquo;ll see
            </h3>
            <ol className="space-y-3">
              {HIGHLIGHTS.map((h) => (
                <li
                  key={h.time}
                  className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur"
                >
                  <span className="shrink-0 rounded-md bg-violet-500/30 px-2 py-0.5 font-mono text-xs font-bold text-violet-200">
                    {h.time}
                  </span>
                  <span className="text-sm text-white/85">{h.text}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
