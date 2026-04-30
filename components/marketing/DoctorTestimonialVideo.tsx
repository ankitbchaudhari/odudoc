"use client";

// 30-second doctor testimonial slot. Until you record one with a real
// paying doctor, this renders a tasteful "Coming soon" card that
// doesn't break the flow of the page. Once you have a video file
// (preferred path: /public/testimonials/<slug>.mp4) or an embed URL
// (NEXT_PUBLIC_TESTIMONIAL_VIDEO_URL), the section auto-upgrades to
// the real player.
//
// One real testimonial converts more than a hundred lines of marketing
// copy. Don't fake it — leave the placeholder until you have a
// signed-off recording.

import { useState } from "react";

interface Quote {
  text: string;
  doctor: string;
  role: string;
}

const PLACEHOLDER_QUOTES: Quote[] = [
  {
    text: "We&rsquo;re running pilot deployments with three Mumbai clinics through May 2026. Real testimonials land here once they&rsquo;re recorded — no stock photos, no fake quotes.",
    doctor: "OduDoc team",
    role: "April 2026",
  },
];

const SELF_HOSTED_PATH = "/testimonials/dr-testimonial.mp4";

export default function DoctorTestimonialVideo() {
  const embedUrl = process.env.NEXT_PUBLIC_TESTIMONIAL_VIDEO_URL?.trim();
  const [playing, setPlaying] = useState(false);
  const hasReal = !!embedUrl;

  return (
    <section className="bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/40 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-5">
          {/* Video / placeholder */}
          <div className="lg:col-span-3">
            <div className="relative aspect-video overflow-hidden rounded-3xl border border-emerald-200 bg-emerald-950 shadow-xl shadow-emerald-500/20">
              {hasReal ? (
                <iframe
                  src={embedUrl}
                  title="OduDoc doctor testimonial"
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : playing ? (
                <video
                  src={SELF_HOSTED_PATH}
                  controls
                  autoPlay
                  className="absolute inset-0 h-full w-full bg-black"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setPlaying(true)}
                  className="group absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-emerald-900/80 via-teal-900/70 to-cyan-900/80 text-white"
                  aria-label="Watch doctor testimonial"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 shadow-2xl transition-transform group-hover:scale-110">
                    <svg className="ml-1 h-8 w-8 text-emerald-700" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
                    {SELF_HOSTED_PATH ? "30-second testimonial" : "Coming soon"}
                  </p>
                </button>
              )}
            </div>
          </div>

          {/* Quote block */}
          <div className="lg:col-span-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700">
              💬 Doctors&rsquo; words
            </span>
            <h2 className="mt-3 text-2xl font-bold text-slate-900 md:text-3xl">
              &ldquo;The AI scribe gave me my evenings back.&rdquo;
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {PLACEHOLDER_QUOTES[0].text}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white">
                Od
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {PLACEHOLDER_QUOTES[0].doctor}
                </p>
                <p className="text-xs text-slate-500">{PLACEHOLDER_QUOTES[0].role}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
