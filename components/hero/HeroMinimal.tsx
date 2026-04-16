"use client";

import Link from "next/link";

export default function HeroMinimal() {
  return (
    <section className="relative overflow-hidden bg-white py-24 md:py-36">
      {/* Floating decorative shapes */}
      <div className="absolute left-10 top-20 h-16 w-16 rounded-full border-2 border-primary-200 opacity-40 animate-bounce" style={{ animationDuration: "3s" }} />
      <div className="absolute right-20 top-32 h-10 w-10 rounded-lg bg-teal-100 opacity-50 animate-bounce" style={{ animationDuration: "4s", animationDelay: "1s" }} />
      <div className="absolute bottom-20 left-1/4 h-12 w-12 rounded-full bg-primary-100 opacity-40 animate-bounce" style={{ animationDuration: "3.5s", animationDelay: "0.5s" }} />
      <div className="absolute right-1/3 top-16 opacity-30">
        <svg className="h-20 w-20 text-primary-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </div>
      <div className="absolute bottom-24 right-16 opacity-20">
        <svg className="h-16 w-16 text-teal-300" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
        </svg>
      </div>

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl lg:text-7xl">
          Simple. Trusted.
          <br />
          <span className="bg-gradient-to-r from-primary-600 to-teal-500 bg-clip-text text-transparent">
            Healthcare.
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg text-gray-500 leading-relaxed">
          Access quality medical care without the complexity. Book appointments,
          consult doctors, and manage your health -- all in one place.
        </p>

        <div className="mt-10">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-10 py-4 text-sm font-semibold text-white shadow-xl shadow-primary-600/20 transition-all hover:bg-primary-700 hover:shadow-2xl hover:shadow-primary-600/30"
          >
            Get Started Today
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
