import Link from "next/link";
import FAQAccordion from "@/components/FAQAccordion";
import DoctorCard from "@/components/DoctorCard";
import { faqs } from "@/lib/data";
import { getPublicDoctorsFresh } from "@/lib/public-doctors";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listDepartments } from "@/lib/departments-store";
import { toDisplayDepartments } from "@/lib/specialty-display";
import type { Metadata } from "next";
import { ServiceLd, BreadcrumbLd } from "@/components/StructuredData";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Video Consultation",
  description:
    "Consult top doctors online for any health concern. Private & confidential video / audio consultations, available 24x7.",
};

// Concern-first nav — each tile points a patient at the right specialist pool
// without asking them to know specialty names (Practo-style).
const concerns = [
  {
    title: "Cold, cough or fever",
    icon: "🤒",
    bg: "bg-orange-50",
    from: "from-orange-100",
    specialty: "General Physician",
  },
  {
    title: "Period or pregnancy doubts",
    icon: "🤰",
    bg: "bg-pink-50",
    from: "from-pink-100",
    specialty: "Gynecologist",
  },
  {
    title: "Acne, pimple or skin issues",
    icon: "🧴",
    bg: "bg-rose-50",
    from: "from-rose-100",
    specialty: "Dermatologist",
  },
  {
    title: "Child not feeling well",
    icon: "👶",
    bg: "bg-sky-50",
    from: "from-sky-100",
    specialty: "Pediatrician",
  },
  {
    title: "Depression or anxiety",
    icon: "🧠",
    bg: "bg-indigo-50",
    from: "from-indigo-100",
    specialty: "Psychiatrist",
  },
  {
    title: "Performance or stamina issues",
    icon: "💪",
    bg: "bg-amber-50",
    from: "from-amber-100",
    specialty: "Sexologist",
  },
  {
    title: "Joint pain or back ache",
    icon: "🦴",
    bg: "bg-teal-50",
    from: "from-teal-100",
    specialty: "Orthopedist",
  },
  {
    title: "Stomach or digestion",
    icon: "🫄",
    bg: "bg-lime-50",
    from: "from-lime-100",
    specialty: "Gastroenterologist",
  },
];

// 24x7 specialist strip — Practo-style "Book appointment with experts"
// row. Populated from the admin-managed Departments store at render
// time (see default export below) so add/remove/toggle in
// /admin/departments shows up here immediately.

const heroBullets = [
  { text: "Private consultation", icon: "🔒" },
  { text: "100% privacy protection", icon: "🛡️" },
  { text: "Audio & video call options", icon: "📞" },
  { text: "Free follow-up within 7 days", icon: "🔄" },
];

const steps = [
  { num: "1", title: "Select a concern", desc: "Pick a health concern or specialty", icon: "🔍" },
  { num: "2", title: "Consult online", desc: "Connect with a verified doctor over secure video or audio", icon: "📹" },
  { num: "3", title: "Get prescription", desc: "Receive a digital prescription instantly on your phone", icon: "📋" },
];

const whyUs = [
  { title: "24/7 availability", desc: "Doctors online round the clock", icon: "🕐" },
  { title: "Verified specialists", desc: "Every doctor is credential-checked", icon: "✅" },
  { title: "Digital prescription", desc: "Sent to your phone within minutes", icon: "📱" },
  { title: "Free follow-up", desc: "Up to 7 days after your consult", icon: "🔄" },
];

const stats = [
  { value: "5M+", label: "Happy patients" },
  { value: "500+", label: "Verified doctors" },
  { value: "30+", label: "Specialties" },
  { value: "93%", label: "Recommend us" },
];

export default async function ConsultPage() {
  const [doctors, session] = await Promise.all([
    getPublicDoctorsFresh(),
    getServerSession(authOptions),
  ]);
  // Admin-managed specialty list. `.slice(0, 8)` keeps the strip a
  // neat 4-column x 2-row grid on desktop even when the admin adds
  // 20+ departments; the rest remain reachable from /doctors.
  const specialists = toDisplayDepartments(listDepartments()).slice(0, 8);
  return (
    <>
      <ServiceLd
        name="Online Doctor Video Consultation"
        description="Private, secure video consultations with verified doctors for common health concerns — consultation, dermatology, mental health, paediatrics, and more."
        url="/consult"
        serviceType="Telemedicine"
      />
      <BreadcrumbLd
        items={[
          { name: "Home", url: "/" },
          { name: "Online Consultation", url: "/consult" },
        ]}
      />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-teal-700 text-white">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:px-8 lg:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
              </span>
              Doctors available now · Avg. wait 5 min
            </span>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl md:text-5xl">
              Consult top doctors online for any health concern
            </h1>
            <p className="mt-4 max-w-xl text-base text-primary-100 sm:text-lg">
              Private & confidential consultations with verified specialists — video or audio
              call from the comfort of your home.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/consult/book"
                className="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900 px-6 py-3 text-sm font-bold text-primary-700 shadow-lg transition-transform hover:scale-[1.02]"
              >
                Consult now
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href="/doctors"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/15"
              >
                Browse doctors
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 text-sm sm:max-w-md">
              {heroBullets.map((b) => (
                <div key={b.text} className="flex items-center gap-2 text-primary-50">
                  <span className="text-base">{b.icon}</span>
                  <span>{b.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: illustrative "card stack" */}
          <div className="relative hidden lg:block">
            <div className="relative mx-auto h-[420px] w-[420px]">
              {/* Background circle */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-white/0 blur-xl" />
              {/* Doctor illustration card */}
              <div className="absolute left-1/2 top-1/2 h-[360px] w-[260px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=600&q=80&auto=format&fit=crop"
                  alt="Doctor consulting online"
                  className="h-full w-full object-cover"
                />
              </div>
              {/* Floating "ready to join" card */}
              <div className="absolute -left-4 top-10 flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-xs font-semibold text-gray-800 dark:text-slate-200 shadow-lg backdrop-blur-sm">
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                Dr. Johnson is online
              </div>
              {/* Floating rating card */}
              <div className="absolute -right-4 bottom-14 rounded-xl bg-white/95 px-3 py-2 text-xs text-gray-700 dark:text-slate-300 shadow-lg backdrop-blur-sm">
                <div className="flex items-center gap-1">
                  <span className="text-yellow-500">★</span>
                  <span className="font-bold">4.9</span>
                  <span className="text-gray-400 dark:text-slate-500">(5M+ ratings)</span>
                </div>
              </div>
              {/* Floating prescription icon */}
              <div className="absolute -bottom-4 left-6 flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-xs font-semibold text-gray-800 dark:text-slate-200 shadow-lg backdrop-blur-sm">
                <span className="text-base">📋</span>
                Instant prescription
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Concern Cards (Practo-style) ── */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900 dark:text-slate-100 sm:text-3xl">
                Consult top doctors online for any health concern
              </h2>
              <p className="mt-2 text-gray-500 dark:text-slate-400">Private · Confidential · Doctors available 24x7</p>
            </div>
            <Link
              href="/doctors"
              className="text-sm font-semibold text-primary-600 hover:text-primary-700"
            >
              View all specialties →
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {concerns.map((c) => (
              <Link
                key={c.title}
                href="/consult/book"
                className={`group relative flex h-40 flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br ${c.from} to-white p-4 transition-all hover:-translate-y-1 hover:shadow-lg`}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/70 text-3xl shadow-sm">
                  {c.icon}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{c.title}</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary-700">
                    Consult now
                    <svg className="h-3 w-3 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 24x7 Specialist Strip ── */}
      <section className="bg-gray-50 dark:bg-slate-900 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900 dark:text-slate-100 sm:text-3xl">
                Book appointment with experts
              </h2>
              <p className="mt-2 text-gray-500 dark:text-slate-400">24x7 specialists available — no waiting rooms</p>
            </div>
          </div>

          {specialists.length === 0 ? (
            <p className="mt-8 text-sm text-gray-500 dark:text-slate-400">
              No specialties are active right now. Please check back soon.
            </p>
          ) : (
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {specialists.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-col rounded-2xl border border-gray-100 bg-white dark:bg-slate-900 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-2xl">
                      {s.emoji}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      {s.waitLabel}
                    </span>
                  </div>
                  <h3 className="mt-3 font-semibold text-gray-900 dark:text-slate-100">{s.name}</h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                    Starts at{" "}
                    <span className="font-bold text-gray-900 dark:text-slate-100">${s.consultFee}</span>
                  </p>
                  <Link
                    href="/consult/book"
                    className="mt-4 inline-flex items-center justify-center rounded-lg bg-primary-600 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-700"
                  >
                    Consult Now
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Available Doctors (admin-managed, signed-in only) ── */}
      {session && doctors.length > 0 && (
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-slate-100 sm:text-3xl">
                  Doctors available for consultation
                </h2>
                <p className="mt-2 text-gray-500 dark:text-slate-400">
                  Verified specialists ready to consult with you online
                </p>
              </div>
              <Link
                href="/doctors"
                className="text-sm font-semibold text-primary-600 hover:text-primary-700"
              >
                View all doctors →
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {doctors.slice(0, 8).map((doc) => (
                <DoctorCard key={doc.id} doctor={doc} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── How it works ── */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="section-title text-center">How online consult works</h2>
          <p className="section-subtitle text-center">3 simple steps — from sign in to prescription</p>
          <div className="relative mt-12 grid grid-cols-1 gap-10 md:grid-cols-3">
            {/* connector line */}
            <div className="absolute left-1/2 top-10 hidden h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-primary-200 to-transparent md:block" />
            {steps.map((s) => (
              <div key={s.num} className="relative text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-50 text-4xl">
                  {s.icon}
                </div>
                <div className="absolute -top-2 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
                  {s.num}
                </div>
                <h3 className="mt-2 text-lg font-bold text-gray-900 dark:text-slate-100">{s.title}</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section className="bg-primary-600 py-12 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-extrabold sm:text-4xl">{s.value}</p>
                <p className="mt-1 text-sm text-primary-100">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why OduDoc ── */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="section-title text-center">Why patients choose OduDoc</h2>
          <p className="section-subtitle text-center">
            Fast, private and trusted by millions — every step of the way
          </p>
          <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {whyUs.map((b) => (
              <div
                key={b.title}
                className="rounded-2xl border border-gray-100 bg-white dark:bg-slate-900 p-5 text-center shadow-sm"
              >
                <span className="mb-3 block text-4xl">{b.icon}</span>
                <h3 className="font-semibold text-gray-900 dark:text-slate-100">{b.title}</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-gray-50 dark:bg-slate-900 py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="section-title text-center">Frequently asked questions</h2>
          <p className="section-subtitle mb-10 text-center">Got questions? We have answers</p>
          <FAQAccordion items={faqs} />
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-gradient-to-r from-primary-600 to-teal-600 py-12 text-white">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 text-center sm:px-6 md:flex-row md:justify-between md:text-left lg:px-8">
          <div>
            <h3 className="text-2xl font-extrabold">Ready to talk to a doctor?</h3>
            <p className="mt-1 text-primary-100">Most patients connect in under 5 minutes.</p>
          </div>
          <Link
            href="/consult/book"
            className="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900 px-6 py-3 text-sm font-bold text-primary-700 shadow-lg transition-transform hover:scale-[1.02]"
          >
            Consult now
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>
    </>
  );
}
