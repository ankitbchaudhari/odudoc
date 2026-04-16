"use client";

import AnimatedCounter from "@/components/AnimatedCounter";
import Link from "next/link";

const stats = [
  { end: 1000, suffix: "+", label: "Happy Patients" },
  { end: 200, suffix: "+", label: "Expert Doctors" },
  { end: 50, suffix: "+", label: "Departments" },
  { end: 24, suffix: "/7", label: "Support" },
];

export default function HeroWithStats() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 py-20 md:py-28">
      {/* Decorative shapes */}
      <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-primary-500/20 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-teal-500/15 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-primary-200 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
            Trusted Healthcare Provider
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
            Your Path to
            <br />
            Better <span className="text-primary-300">Health</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-primary-200/90">
            Experience world-class healthcare services with our team of expert doctors,
            state-of-the-art facilities, and patient-centered approach.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/contact"
              className="rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-primary-700 shadow-lg transition-all hover:shadow-xl hover:bg-gray-50"
            >
              Get Started
            </Link>
            <Link
              href="/about"
              className="rounded-xl border border-white/30 px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-white/10"
            >
              Learn More
            </Link>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl bg-white/10 px-6 py-6 text-center backdrop-blur-sm transition-all hover:bg-white/15"
            >
              <p className="text-3xl font-bold text-white md:text-4xl">
                <AnimatedCounter end={stat.end} suffix={stat.suffix} />
              </p>
              <p className="mt-1 text-sm font-medium text-primary-200">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
