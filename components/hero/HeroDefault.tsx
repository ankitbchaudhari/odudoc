"use client";

import { useState } from "react";
import VideoModal from "@/components/VideoModal";

const contactCards = [
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    ),
    title: "Emergency",
    detail: "+1 (800) 123-4567",
    subtext: "24/7 Available",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    title: "Email Us",
    detail: "contact@odudoc.com",
    subtext: "Online Support",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: "Visit Us",
    detail: "123 Health Avenue",
    subtext: "New York, NY 10001",
  },
];

export default function HeroDefault() {
  const [videoOpen, setVideoOpen] = useState(false);

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 py-20 md:py-32">
        {/* Background overlay pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: "radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)",
            backgroundSize: "40px 40px"
          }} />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-7xl">
            Providing Quality
            <br />
            <span className="text-primary-200">Healthcare</span> For You
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-primary-100">
            We are committed to providing exceptional medical care with compassion,
            advanced technology, and a patient-first approach.
          </p>

          {/* Video play button */}
          <div className="mt-10 flex items-center justify-center gap-6">
            <a
              href="/contact"
              className="rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-primary-700 shadow-lg transition-all hover:bg-gray-100 hover:shadow-xl"
            >
              Book Appointment
            </a>
            <button
              onClick={() => setVideoOpen(true)}
              className="group flex items-center gap-3"
            >
              <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-all group-hover:bg-white/30">
                <span className="absolute inset-0 animate-ping rounded-full bg-white/20" />
                <svg className="relative h-6 w-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
              <span className="text-sm font-medium text-white">Watch Video</span>
            </button>
          </div>
        </div>

        {/* Contact cards */}
        <div className="relative mx-auto mt-16 max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {contactCards.map((card) => (
              <div
                key={card.title}
                className="flex items-center gap-4 rounded-xl bg-white/10 px-6 py-5 backdrop-blur-sm transition-all hover:bg-white/20"
              >
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
                  {card.icon}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary-200">
                    {card.title}
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-white">{card.detail}</p>
                  <p className="text-xs text-primary-200">{card.subtext}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <VideoModal isOpen={videoOpen} onClose={() => setVideoOpen(false)} />
    </>
  );
}
