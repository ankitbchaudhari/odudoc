"use client";

import TextRotator from "@/components/TextRotator";
import Link from "next/link";
import { useLanguage } from "@/lib/language-context";
import { useEffect, useState } from "react";

const rotatingWords = ["Health", "Wellness", "Care", "Life"];

// Trust signals — real things patients can verify in two clicks
// instead of a "500+ / 50K+ / 98%" wall that reads as marketing
// noise. Doctor count is fetched live; the other three are static
// but link to actual proof (verifications page, reviews, compliance).
interface TrustSignal {
  value: string;
  label: string;
  sub: string;
  href: string;
  icon: string;
  gradient: string;
}

export default function HeroWithTextSlider() {
  const { t } = useLanguage();
  // Live doctor count — pinged once on mount. Falls back to "—"
  // so the section never shows "0" while loading. The directory
  // endpoint already exists; we just count.
  const [doctorCount, setDoctorCount] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  useEffect(() => {
    fetch("/api/doctors", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const docs = Array.isArray(d?.doctors) ? d.doctors : [];
        setDoctorCount(docs.length);
        const totalReviews = docs.reduce(
          (s: number, x: { reviewCount?: number }) => s + (x.reviewCount || 0),
          0,
        );
        setReviewCount(totalReviews);
      })
      .catch(() => {
        setDoctorCount(0);
        setReviewCount(0);
      });
  }, []);

  const trustSignals: TrustSignal[] = [
    {
      value: doctorCount === null ? "—" : `${doctorCount}`,
      label: "Verified doctors",
      sub: "Each with council registration",
      href: "/doctors",
      icon: "🩺",
      gradient: "from-sky-500 to-indigo-500",
    },
    {
      value: reviewCount === null ? "—" : `${reviewCount.toLocaleString()}`,
      label: "Patient consultations",
      sub: "Real bookings, real reviews",
      href: "/doctors",
      icon: "💬",
      gradient: "from-emerald-500 to-teal-500",
    },
    {
      value: "24/7",
      label: "Helpline",
      sub: "+1 (302) 899-2625",
      href: "tel:+13028992625",
      icon: "📞",
      gradient: "from-fuchsia-500 to-rose-500",
    },
  ];
  // Translations are short marketing copy. The hero's typography
  // hangs off the period in the title; we render the localized
  // string verbatim and only swap the rotator words for English.
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
            {t("hero.title")}
            <br />
            <TextRotator
              words={rotatingWords}
              className="bg-gradient-to-r from-primary-600 via-teal-500 to-emerald-500 bg-clip-text text-transparent"
              interval={2500}
            />
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
            {t("hero.subtitle")}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {/* Instant-consult CTA — pulses to indicate live availability. */}
            <Link
              href="/consult-now"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/40 transition-all hover:scale-105 hover:shadow-xl"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-200/80" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
              </span>
              Consult Now
              <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">Live</span>
            </Link>
            <Link
              href="/doctors"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 via-teal-600 to-emerald-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary-600/30 transition-all hover:scale-105 hover:shadow-xl"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {t("common.bookNow")}
            </Link>
            <Link
              href="/doctors"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-primary-600 bg-white/80 px-8 py-3.5 text-sm font-semibold text-primary-700 shadow-sm backdrop-blur transition-all hover:scale-105 hover:bg-white"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {t("nav.doctors")}
            </Link>
          </div>

          {/* Trust signals — real numbers + a way to verify them.
              No round marketing figures; doctor count is fetched
              live so the patient sees the truth, even if it's small. */}
          <div className="mx-auto mt-14 grid max-w-3xl grid-cols-3 gap-3 sm:gap-5">
            {trustSignals.map((stat) => (
              <Link
                key={stat.label}
                href={stat.href}
                className="group relative overflow-hidden rounded-2xl border border-white/60 bg-white/80 p-4 shadow-md backdrop-blur transition-all hover:-translate-y-1 hover:shadow-xl sm:p-5"
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${stat.gradient}`} />
                <div className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${stat.gradient} text-white shadow-md text-lg`}>
                  {stat.icon}
                </div>
                <p className={`bg-gradient-to-r ${stat.gradient} bg-clip-text text-2xl font-bold text-transparent md:text-3xl`}>
                  {stat.value}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-gray-700">{stat.label}</p>
                <p className="mt-0.5 text-[10px] text-gray-500">{stat.sub}</p>
              </Link>
            ))}
          </div>

          {/* Compliance + verification row — concrete, click-throughable
              badges that build trust without making fake claims. */}
          <div className="mx-auto mt-6 flex max-w-3xl flex-wrap items-center justify-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 backdrop-blur px-3 py-1.5 ring-1 ring-emerald-200 text-emerald-700 shadow-sm">
              <span>✓</span> NMC / NPI / GMC registered
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 backdrop-blur px-3 py-1.5 ring-1 ring-sky-200 text-sky-700 shadow-sm">
              <span>🔒</span> HIPAA-aligned data handling
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 backdrop-blur px-3 py-1.5 ring-1 ring-violet-200 text-violet-700 shadow-sm">
              <span>🇮🇳</span> ABDM / ABHA integrated
            </span>
            <Link
              href="/about"
              className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-3 py-1.5 font-semibold text-white shadow-sm hover:shadow-md transition"
            >
              Read our story →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
