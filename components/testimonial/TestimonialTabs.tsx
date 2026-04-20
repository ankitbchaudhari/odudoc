"use client";

import { useEffect, useState } from "react";
import type { Testimonial } from "@/lib/data";

export default function TestimonialTabs() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  useEffect(() => {
    fetch("/api/testimonials", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && Array.isArray(d.testimonials)) setTestimonials(d.testimonials);
      })
      .catch(() => {});
  }, []);
  const items = testimonials.slice(0, 6);
  const active = items[activeIndex];
  if (items.length === 0) return null;

  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary-600">
            Testimonials
          </p>
          <h2 className="mt-2 text-4xl font-bold text-gray-900">What Our Patients Say</h2>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-5">
          {/* Left: Avatar Tabs */}
          <div className="space-y-3 lg:col-span-2">
            {items.map((t, i) => (
              <button
                key={t.id}
                onClick={() => setActiveIndex(i)}
                className={`flex w-full items-center gap-4 rounded-xl p-4 text-left transition-all duration-300 ${
                  activeIndex === i
                    ? "scale-[1.02] border-2 border-primary-600 bg-primary-50 shadow-md"
                    : "border-2 border-transparent bg-white shadow-sm hover:bg-gray-50"
                }`}
              >
                <div
                  className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    activeIndex === i
                      ? "bg-primary-600 text-white"
                      : "bg-primary-100 text-primary-700"
                  }`}
                >
                  {t.initials}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{t.name}</p>
                  <p className="text-sm text-gray-400">{t.location}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Right: Active Testimonial */}
          <div className="flex flex-col justify-center lg:col-span-3">
            <div className="rounded-2xl bg-white p-8 shadow-lg transition-all duration-500 lg:p-10">
              {/* Quote Icon */}
              <svg className="mb-6 h-12 w-12 text-primary-200" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
              </svg>

              <p className="text-lg italic leading-relaxed text-gray-600">
                &ldquo;{active.text}&rdquo;
              </p>

              {/* Star Rating */}
              <div className="mt-6 flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg
                    key={i}
                    className={`h-5 w-5 ${i < active.rating ? "text-yellow-400" : "text-gray-200"}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              <div className="mt-6 border-t border-gray-100 pt-5">
                <p className="font-semibold text-gray-900">{active.name}</p>
                <p className="text-sm text-gray-400">{active.location} &middot; {active.doctor}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
