"use client";

// Shared renderer for the doctor guide. Handles the sticky sidebar,
// scroll-spy active highlighting, video slot per section, and body
// dispatch into SECTION_BODIES. Accepts the audience so prose CTAs
// adapt to signed-in vs. public visitors.

import { useEffect, useState } from "react";
import {
  GUIDE_SECTIONS,
  GUIDE_VIDEO_IDS,
  type GuideAudience,
} from "@/lib/doctor-guide-content";
import { Section } from "./Primitives";
import GuideVideo from "./GuideVideo";
import { SECTION_BODIES } from "./SectionBodies";

export default function GuideRenderer({
  audience,
}: {
  audience: GuideAudience;
}) {
  const [activeId, setActiveId] = useState<string>(GUIDE_SECTIONS[0].id);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          )[0];
        if (visible?.target.id) setActiveId(visible.target.id);
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0.1 },
    );
    GUIDE_SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <nav className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            On this page
          </p>
          <ul className="space-y-0.5">
            {GUIDE_SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                    activeId === s.id
                      ? "bg-primary-50 font-semibold text-primary-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span aria-hidden className="text-base">
                    {s.icon}
                  </span>
                  <span>{s.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <main className="space-y-12">
        {GUIDE_SECTIONS.map((s) => {
          const renderBody = SECTION_BODIES[s.id];
          return (
            <Section key={s.id} id={s.id} title={s.title} tagline={s.tagline}>
              <GuideVideo
                videoId={GUIDE_VIDEO_IDS[s.id] || ""}
                title={s.label}
              />
              {renderBody ? renderBody(audience) : null}
            </Section>
          );
        })}
      </main>
    </div>
  );
}
