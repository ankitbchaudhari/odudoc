import Link from "next/link";
import type { Metadata } from "next";
import { ServiceLd, BreadcrumbLd } from "@/components/StructuredData";

export const metadata: Metadata = {
  title: "Surgery Packages — Compare Prices & Book Online",
  description:
    "Compare transparent surgery packages across laparoscopic, cardiac, orthopaedic, bariatric and cosmetic procedures. Book with verified hospitals on OduDoc.",
  keywords: [
    "surgery packages",
    "laparoscopic surgery cost",
    "hernia repair price",
    "bariatric surgery",
    "orthopaedic surgery",
    "surgery booking",
  ],
  alternates: { canonical: "/surgeries" },
  openGraph: {
    title: "Surgery Packages — Compare Prices & Book Online | OduDoc",
    description:
      "Transparent surgery packages with verified hospitals — laparoscopic, cardiac, orthopaedic, bariatric, cosmetic.",
    url: "/surgeries",
    type: "website",
  },
};

const surgeryCategories = [
  {
    name: "Laparoscopic Surgery",
    icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
    procedures: ["Gallbladder Removal", "Appendectomy", "Hernia Repair", "Bariatric Surgery"],
    startingPrice: "$2,500",
    description: "Minimally invasive procedures with faster recovery and smaller scars.",
    gradient: "from-sky-500 to-indigo-600",
  },
  {
    name: "Orthopedic Surgery",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    procedures: ["Knee Replacement", "Hip Replacement", "ACL Reconstruction", "Spine Surgery"],
    startingPrice: "$4,000",
    description: "Joint replacements and bone surgeries by top orthopedic specialists.",
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    name: "Eye Surgery",
    icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
    procedures: ["LASIK", "Cataract Surgery", "Glaucoma Surgery", "Retinal Surgery"],
    startingPrice: "$1,200",
    description: "Advanced eye procedures with latest laser and microsurgery technology.",
    gradient: "from-fuchsia-500 to-pink-600",
  },
  {
    name: "Cardiac Surgery",
    icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
    procedures: ["Bypass Surgery (CABG)", "Valve Replacement", "Angioplasty", "Pacemaker Implant"],
    startingPrice: "$8,000",
    description: "Life-saving heart procedures performed by world-class cardiologists.",
    gradient: "from-rose-500 to-red-600",
  },
  {
    name: "Cosmetic Surgery",
    icon: "M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    procedures: ["Rhinoplasty", "Liposuction", "Hair Transplant", "Facelift"],
    startingPrice: "$1,500",
    description: "Board-certified plastic surgeons with natural-looking results.",
    gradient: "from-violet-500 to-purple-600",
  },
  {
    name: "Urology",
    icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",
    procedures: ["Kidney Stone Removal", "Prostate Surgery", "Circumcision", "Vasectomy"],
    startingPrice: "$1,000",
    description: "Advanced urological procedures with quick recovery protocols.",
    gradient: "from-amber-500 to-orange-600",
  },
];

const whyChoose = [
  { title: "Expert Surgeons", desc: "Board-certified specialists with 15+ years experience", gradient: "from-sky-500 to-indigo-600" },
  { title: "Transparent Pricing", desc: "No hidden costs — all-inclusive surgery packages", gradient: "from-emerald-500 to-teal-600" },
  { title: "Free Follow-ups", desc: "Post-surgery consultations included for 30 days", gradient: "from-fuchsia-500 to-pink-600" },
  { title: "Insurance Support", desc: "We handle insurance paperwork and cashless claims", gradient: "from-amber-500 to-orange-600" },
  { title: "EMI Options", desc: "0% EMI available on surgeries above $2,000", gradient: "from-rose-500 to-red-600" },
  { title: "Safe & Accredited", desc: "All partner hospitals are NABH/JCI accredited", gradient: "from-violet-500 to-purple-600" },
];

const safetyStats = [
  { label: "Accredited", value: "100%", gradient: "from-primary-500 to-teal-600" },
  { label: "ISO Certified", value: "ISO 9001", gradient: "from-emerald-500 to-teal-600" },
  { label: "Procedures", value: "1,000+", gradient: "from-rose-500 to-pink-600" },
  { label: "Support", value: "24/7", gradient: "from-indigo-500 to-purple-600" },
];

export default function SurgeriesPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <ServiceLd
        name="Surgery Packages"
        description="Transparent surgery packages with verified hospitals — laparoscopic, cardiac, orthopaedic, bariatric, cosmetic."
        url="/surgeries"
        serviceType="Surgical procedures"
      />
      <BreadcrumbLd
        items={[
          { name: "Home", url: "/" },
          { name: "Surgeries", url: "/surgeries" },
        ]}
      />
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-teal-50 to-rose-50 py-20">
        <div className="pointer-events-none absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-primary-200/40 to-teal-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-rose-200/40 to-purple-200/40 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-100 to-teal-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-700">
            <span>🩺</span> World-class surgical care
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-gray-900 dark:text-slate-100 md:text-6xl">
            Safe, affordable{" "}
            <span className="bg-gradient-to-r from-primary-600 via-teal-500 to-rose-500 bg-clip-text text-transparent">
              surgeries
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600 dark:text-slate-300">
            Top specialists. Transparent pricing. Zero surprises. Every procedure backed by our quality guarantee.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/consult/book"
              className="rounded-xl bg-gradient-to-r from-primary-600 via-teal-600 to-emerald-600 px-8 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
            >
              Book Free Consultation
            </Link>
            <a
              href="tel:+15550001234"
              className="rounded-xl border-2 border-primary-200 bg-white/80 px-8 py-3 text-sm font-semibold text-primary-700 backdrop-blur transition-all hover:bg-white dark:hover:bg-slate-800 hover:shadow-md"
            >
              Call: +1 (555) 000-1234
            </a>
          </div>
        </div>
      </section>

      {/* Safety Trust Bar */}
      <section className="bg-white dark:bg-slate-900 py-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-8 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
              <span>🛡️</span> Safety first
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {safetyStats.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-gray-100 bg-white dark:bg-slate-900 p-6 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <p className={`bg-gradient-to-r ${s.gradient} bg-clip-text text-3xl font-extrabold text-transparent`}>
                  {s.value}
                </p>
                <p className="mt-2 text-sm font-semibold text-gray-600 dark:text-slate-300">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Surgery Categories */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-primary-50/40 py-16">
        <div className="pointer-events-none absolute top-20 -right-32 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-primary-200/30 to-teal-200/30 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4">
          <h2 className="mb-3 text-center text-3xl font-bold text-gray-900 dark:text-slate-100 md:text-4xl">
            Our{" "}
            <span className="bg-gradient-to-r from-primary-600 via-teal-500 to-emerald-500 bg-clip-text text-transparent">
              surgery categories
            </span>
          </h2>
          <p className="mb-10 text-center text-gray-600 dark:text-slate-300">Expert care across every major specialty.</p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {surgeryCategories.map((cat) => (
              <div
                key={cat.name}
                className="group rounded-3xl border border-gray-100 bg-white dark:bg-slate-900 p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${cat.gradient} text-white shadow-lg ring-4 ring-white`}
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={cat.icon} />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-slate-100">{cat.name}</h3>
                    <p className="text-xs font-semibold text-primary-600">Starting {cat.startingPrice}</p>
                  </div>
                </div>
                <p className="mb-4 text-sm text-gray-600 dark:text-slate-300">{cat.description}</p>
                <ul className="space-y-1.5">
                  {cat.procedures.map((p) => (
                    <li key={p} className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                      <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {p}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/consult/book"
                  className={`mt-5 block rounded-xl bg-gradient-to-r ${cat.gradient} py-2.5 text-center text-sm font-semibold text-white shadow-md transition-all hover:scale-[1.02] hover:shadow-lg`}
                >
                  Book consultation
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-purple-50 py-16">
        <div className="pointer-events-none absolute -top-20 -left-20 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-teal-200/40 to-emerald-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-purple-200/40 to-rose-200/40 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4">
          <h2 className="mb-10 text-center text-3xl font-bold text-gray-900 dark:text-slate-100 md:text-4xl">
            Why choose{" "}
            <span className="bg-gradient-to-r from-primary-600 via-purple-500 to-rose-500 bg-clip-text text-transparent">
              OduDoc
            </span>{" "}
            for surgery?
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {whyChoose.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-gray-100 bg-white dark:bg-slate-900 p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${item.gradient} text-white shadow-lg ring-4 ring-white`}
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="mb-1 font-bold text-gray-900 dark:text-slate-100">{item.title}</h3>
                <p className="text-sm text-gray-600 dark:text-slate-300">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white dark:bg-slate-900 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-slate-100 md:text-4xl">
            Need a{" "}
            <span className="bg-gradient-to-r from-primary-600 via-teal-500 to-emerald-500 bg-clip-text text-transparent">
              surgery consultation?
            </span>
          </h2>
          <p className="mb-8 text-gray-600 dark:text-slate-300">
            Talk to our medical coordinators for free. We&apos;ll help you understand your options, compare costs, and connect you with the best surgeon.
          </p>
          <Link
            href="/consult/book"
            className="inline-block rounded-xl bg-gradient-to-r from-primary-600 via-teal-600 to-emerald-600 px-8 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
          >
            Book Free Consultation
          </Link>
        </div>
      </section>
    </div>
  );
}
