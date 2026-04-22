"use client";

import TextRotator from "@/components/TextRotator";
import AnimatedCounter from "@/components/AnimatedCounter";
import Link from "next/link";

const rotatingWords = ["Health", "Wellness", "Care", "Life"];

const quickStats = [
  {
    end: 500,
    suffix: "+",
    label: "Doctors",
    gradient: "from-sky-500 to-indigo-500",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    end: 50,
    suffix: "K+",
    label: "Patients",
    gradient: "from-emerald-500 to-teal-500",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
  {
    end: 98,
    suffix: "%",
    label: "Satisfaction",
    gradient: "from-fuchsia-500 to-rose-500",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.098 10.1c-.783-.57-.38-1.81.588-1.81h4.915a1 1 0 00.95-.69l1.518-4.673z" />
      </svg>
    ),
  },
];

export default function HeroWithTextSlider() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-sky-50 via-primary-50 to-purple-100 py-20 md:py-28">
      {/* Decorative colorful blobs */}
      <div className="absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-gradient-to-br from-primary-300/60 via-teal-300/50 to-emerald-200/40 blur-3xl" />
      <div className="absolute -bottom-52 -left-44 h-[460px] w-[460px] rounded-full bg-gradient-to-tr from-fuchsia-300/50 via-rose-200/50 to-orange-200/40 blur-3xl" />
      <div className="absolute left-1/2 top-1/3 h-[320px] w-[320px] -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-200/40 via-sky-200/30 to-transparent blur-3xl" />

      {/* Floating medical icon accents */}
      <div className="pointer-events-none absolute left-[6%] top-[18%] hidden md:block">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 text-white shadow-xl shadow-emerald-500/30 ring-4 ring-white/60 animate-[pulse_3s_ease-in-out_infinite]">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
      </div>
      <div className="pointer-events-none absolute right-[8%] top-[22%] hidden md:block">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-400 to-rose-500 text-white shadow-xl shadow-rose-500/30 ring-4 ring-white/60 animate-[pulse_4s_ease-in-out_infinite]">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-[14%] left-[10%] hidden lg:block">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-xl shadow-orange-500/30 ring-4 ring-white/60 animate-[pulse_3.5s_ease-in-out_infinite]">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-[22%] right-[12%] hidden lg:block">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 text-white shadow-xl shadow-indigo-500/30 ring-4 ring-white/60 animate-[pulse_4.5s_ease-in-out_infinite]">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white/90 px-4 py-1.5 text-xs font-semibold text-primary-700 shadow-md backdrop-blur">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-500" />
            </span>
            Welcome to OduDoc Healthcare
          </span>

          <h1 className="mt-8 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl lg:text-7xl">
            Dedicated to Your
            <br />
            <TextRotator
              words={rotatingWords}
              className="bg-gradient-to-r from-primary-600 via-teal-500 to-emerald-500 bg-clip-text text-transparent"
              interval={2500}
            />
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
            Experience comprehensive healthcare services with{" "}
            <span className="font-semibold text-primary-700">cutting-edge technology</span>,{" "}
            <span className="font-semibold text-rose-600">compassionate care</span>, and a
            commitment to your{" "}
            <span className="font-semibold text-emerald-600">well-being</span>.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 via-teal-600 to-emerald-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary-600/30 transition-all hover:scale-105 hover:shadow-xl"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Book Appointment
            </Link>
            <Link
              href="/doctors"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-primary-600 bg-white/80 px-8 py-3.5 text-sm font-semibold text-primary-700 shadow-sm backdrop-blur transition-all hover:scale-105 hover:bg-white"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Our Doctors
            </Link>
          </div>

          {/* Quick stats — colorful cards */}
          <div className="mx-auto mt-14 grid max-w-3xl grid-cols-3 gap-3 sm:gap-5">
            {quickStats.map((stat) => (
              <div
                key={stat.label}
                className="group relative overflow-hidden rounded-2xl border border-white/60 bg-white/80 p-4 shadow-md backdrop-blur transition-all hover:-translate-y-1 hover:shadow-xl sm:p-5"
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${stat.gradient}`}
                />
                <div
                  className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${stat.gradient} text-white shadow-md`}
                >
                  {stat.icon}
                </div>
                <p
                  className={`bg-gradient-to-r ${stat.gradient} bg-clip-text text-2xl font-bold text-transparent md:text-3xl`}
                >
                  <AnimatedCounter end={stat.end} suffix={stat.suffix} />
                </p>
                <p className="mt-0.5 text-xs font-semibold text-gray-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
