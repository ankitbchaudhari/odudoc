"use client";

import { useState } from "react";
import Link from "next/link";

const categories = [
  {
    title: "Getting Started",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
    gradient: "from-sky-500 to-indigo-600",
    eyebrowBg: "from-sky-100 to-indigo-100",
    eyebrowText: "text-sky-700",
    articles: [
      { q: "How do I create an account?", a: "Click 'Sign Up' on the top-right corner. You can register with your email address or sign in with Google. Patients and doctors have separate registration flows." },
      { q: "How do I book an appointment?", a: "Search for a doctor by specialty or name, select a time slot, and confirm your booking. You'll receive a confirmation email and SMS with appointment details." },
      { q: "Is OduDoc available in my city?", a: "OduDoc is available across all major cities. For video consultations, there are no geographical restrictions — consult any doctor from anywhere." },
    ],
  },
  {
    title: "Appointments & Consultations",
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    gradient: "from-emerald-500 to-teal-600",
    eyebrowBg: "from-emerald-100 to-teal-100",
    eyebrowText: "text-emerald-700",
    articles: [
      { q: "How do video consultations work?", a: "After booking a video consultation, you'll receive a link. At the scheduled time, click the link to enter a secure video room. No app download needed." },
      { q: "Can I reschedule my appointment?", a: "Yes, you can reschedule up to 2 hours before your appointment. Go to Dashboard > My Appointments and click 'Reschedule'." },
      { q: "What is the cancellation policy?", a: "Cancellations made 4+ hours before the appointment are fully refundable. Late cancellations may incur a 25% fee." },
      { q: "How do I get a prescription after my visit?", a: "Your doctor will generate a digital prescription during or after your consultation. Access it from Dashboard > Health Records." },
    ],
  },
  {
    title: "Payments & Billing",
    icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
    gradient: "from-fuchsia-500 to-pink-600",
    eyebrowBg: "from-fuchsia-100 to-pink-100",
    eyebrowText: "text-fuchsia-700",
    articles: [
      { q: "What payment methods are accepted?", a: "We accept credit/debit cards (Visa, Mastercard, Amex), UPI, net banking, and popular digital wallets." },
      { q: "How do refunds work?", a: "Refunds are processed within 5-7 business days to the original payment method. For wallet payments, refunds are instant." },
      { q: "Can I get an invoice for my payment?", a: "Yes, invoices are automatically generated for every transaction. Download them from Dashboard > Payments." },
    ],
  },
  {
    title: "For Doctors",
    icon: "M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    gradient: "from-amber-500 to-orange-600",
    eyebrowBg: "from-amber-100 to-orange-100",
    eyebrowText: "text-amber-700",
    articles: [
      { q: "How do I register as a doctor?", a: "Visit the 'For Doctors' page and click 'Register'. You'll need to provide your medical license, qualifications, and clinic details for verification." },
      { q: "How long does doctor verification take?", a: "Verification typically takes 24-48 hours. We verify your medical registration number with the relevant medical council." },
      { q: "How do doctor payouts work?", a: "Consultation fees are settled weekly via bank transfer. You can track earnings and download reports from your Doctor Dashboard." },
    ],
  },
  {
    title: "Account & Security",
    icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
    gradient: "from-violet-500 to-purple-600",
    eyebrowBg: "from-violet-100 to-purple-100",
    eyebrowText: "text-violet-700",
    articles: [
      { q: "How do I reset my password?", a: "Click 'Forgot Password' on the login page. We'll send a reset link to your registered email address." },
      { q: "Is my data secure?", a: "Absolutely. We use 256-bit SSL encryption, are HIPAA-compliant, and never share your medical data with third parties without consent." },
      { q: "How do I delete my account?", a: "Go to Settings > Account > Delete Account. Note that this action is irreversible and all data will be permanently removed after 30 days." },
    ],
  },
];

export default function HelpPage() {
  const [search, setSearch] = useState("");
  const [openIdx, setOpenIdx] = useState<string | null>(null);

  const allArticles = categories.flatMap((c) =>
    c.articles.map((a) => ({ ...a, category: c.title }))
  );

  const filtered = search.trim()
    ? allArticles.filter(
        (a) =>
          a.q.toLowerCase().includes(search.toLowerCase()) ||
          a.a.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-sky-50 to-purple-50 py-24">
        <div className="pointer-events-none absolute -top-32 -left-24 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-indigo-200/40 to-sky-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-24 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-purple-200/40 to-fuchsia-200/40 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-100 to-sky-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-700">
            <span>💡</span> Help Center
          </span>
          <h1 className="mt-6 text-4xl font-bold text-gray-900 dark:text-slate-100 md:text-6xl">
            How can we{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-sky-500 to-purple-500 bg-clip-text text-transparent">
              help?
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-gray-600 dark:text-slate-300">
            Search our knowledge base or browse topics below. We're here 24/7.
          </p>
          <div className="relative mt-10">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for answers..."
              className="w-full rounded-2xl border-2 border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4 text-gray-900 dark:text-slate-100 shadow-lg outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10"
            />
            <svg className="pointer-events-none absolute right-5 top-5 h-5 w-5 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </section>

      {/* Search results */}
      {search.trim() && (
        <section className="border-b border-gray-100 bg-white dark:bg-slate-900 py-10">
          <div className="mx-auto max-w-3xl px-4">
            <p className="mb-4 text-sm font-medium text-gray-500 dark:text-slate-400">{filtered.length} result(s) for "{search}"</p>
            <div className="space-y-3">
              {filtered.map((a, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-gray-100 bg-white dark:bg-slate-900 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-xl"
                >
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-indigo-600">{a.category}</p>
                  <h3 className="font-semibold text-gray-900 dark:text-slate-100">{a.q}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-slate-300">{a.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-primary-50/40 py-20">
        <div className="pointer-events-none absolute -top-24 right-0 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-sky-200/30 to-indigo-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-0 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-fuchsia-200/30 to-purple-200/30 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4">
          <div className="mb-12 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-100 to-indigo-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-sky-700">
              <span>📚</span> Browse Topics
            </span>
            <h2 className="mt-4 text-3xl font-bold text-gray-900 dark:text-slate-100 md:text-4xl">
              Popular{" "}
              <span className="bg-gradient-to-r from-indigo-600 via-sky-500 to-purple-500 bg-clip-text text-transparent">
                Categories
              </span>
            </h2>
          </div>
          <div className="space-y-8">
            {categories.map((cat) => (
              <div
                key={cat.title}
                className="rounded-3xl border border-gray-100 bg-white dark:bg-slate-900 p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="mb-6 flex items-center gap-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${cat.gradient} text-white shadow-lg ring-4 ring-white`}
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={cat.icon} />
                    </svg>
                  </div>
                  <div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${cat.eyebrowBg} px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cat.eyebrowText}`}
                    >
                      {cat.articles.length} articles
                    </span>
                    <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-slate-100">{cat.title}</h2>
                  </div>
                </div>
                <div className="space-y-2">
                  {cat.articles.map((a, i) => {
                    const key = `${cat.title}-${i}`;
                    const open = openIdx === key;
                    return (
                      <div key={i} className="rounded-xl border border-gray-100 bg-gray-50/50 transition hover:border-gray-200 dark:border-slate-800">
                        <button
                          onClick={() => setOpenIdx(open ? null : key)}
                          className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold text-gray-900 dark:text-slate-100 hover:text-indigo-700"
                        >
                          {a.q}
                          <svg className={`h-4 w-4 flex-shrink-0 text-gray-400 dark:text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {open && (
                          <div className="border-t border-gray-100 bg-white dark:bg-slate-900 px-5 py-4 text-sm leading-relaxed text-gray-600 dark:text-slate-300">
                            {a.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Still need help CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-purple-50 py-20">
        <div className="pointer-events-none absolute -top-32 -right-24 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-indigo-200/40 to-purple-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-sky-200/40 to-teal-200/40 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-4">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-700 via-indigo-700 to-purple-700 p-10 text-center text-white shadow-xl">
            <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <span className="relative inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white dark:bg-slate-900 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white dark:bg-slate-900" />
              </span>
              Support online 24/7
            </span>
            <h2 className="relative mt-5 text-3xl font-bold md:text-4xl">Still need help?</h2>
            <p className="relative mx-auto mt-3 max-w-lg text-white/80">
              Our support team is standing by, ready to help with anything you need.
            </p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900 px-8 py-3.5 text-sm font-semibold text-indigo-700 shadow-lg transition-all hover:scale-105"
              >
                Contact Support →
              </Link>
              <a
                href="mailto:support@odudoc.com"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-white/40 bg-white/10 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur transition-all hover:bg-white/20"
              >
                Email Us
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
