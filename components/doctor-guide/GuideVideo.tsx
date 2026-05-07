"use client";

// Per-section video slot for the doctor onboarding guide.
//
// Behaviour:
//   - When videoId is a real YouTube ID, lazy-loads a privacy-mode
//     iframe (youtube-nocookie.com) inside a 16:9 frame.
//   - When videoId is empty, shows a polished placeholder so the
//     page still looks complete while we're producing the real
//     videos. Placeholder mentions the section title so it doesn't
//     read as a generic empty state.
//
// Lazy load: the iframe only mounts after the user clicks the
// poster — saves ~400 KB of YouTube JS on initial paint, which
// matters when we have 14 of these on one page.

import { useState } from "react";

interface Props {
  videoId: string;
  title: string;
}

export default function GuideVideo({ videoId, title }: Props) {
  const [playing, setPlaying] = useState(false);

  if (!videoId) {
    return (
      <div className="mb-5 overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-200/70 text-2xl">
          🎬
        </div>
        <p className="mt-3 text-sm font-semibold text-slate-700">
          Walkthrough video coming soon
        </p>
        <p className="mt-1 text-xs text-slate-500">
          We&apos;re recording a 60–90 second screen-share of {title.toLowerCase()}.
          The written guide below covers everything you need today.
        </p>
      </div>
    );
  }

  if (!playing) {
    return (
      <button
        type="button"
        onClick={() => setPlaying(true)}
        className="group relative mb-5 block w-full overflow-hidden rounded-2xl bg-slate-900 shadow-md"
        style={{ aspectRatio: "16 / 9" }}
        aria-label={`Play video: ${title}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
          loading="lazy"
        />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-primary-700 shadow-lg transition-transform group-hover:scale-110">
            <svg
              className="h-7 w-7 translate-x-0.5"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </span>
        <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3 text-left">
          <span className="text-xs font-semibold uppercase tracking-widest text-white/80">
            Walkthrough
          </span>
          <span className="block text-sm font-bold text-white">{title}</span>
        </span>
      </button>
    );
  }

  return (
    <div
      className="mb-5 overflow-hidden rounded-2xl bg-slate-900 shadow-md"
      style={{ aspectRatio: "16 / 9" }}
    >
      <iframe
        title={title}
        src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}
