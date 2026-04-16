"use client";

import { useState } from "react";
import Link from "next/link";

const categories = [
  {
    title: "Getting Started",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
    articles: [
      { q: "How do I create an account?", a: "Click 'Sign Up' on the top-right corner. You can register with your email address or sign in with Google. Patients and doctors have separate registration flows." },
      { q: "How do I book an appointment?", a: "Search for a doctor by specialty or name, select a time slot, and confirm your booking. You'll receive a confirmation email and SMS with appointment details." },
      { q: "Is OduDoc available in my city?", a: "OduDoc is available across all major cities. For video consultations, there are no geographical restrictions — consult any doctor from anywhere." },
    ],
  },
  {
    title: "Appointments & Consultations",
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
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
    articles: [
      { q: "What payment methods are accepted?", a: "We accept credit/debit cards (Visa, Mastercard, Amex), UPI, net banking, and popular digital wallets." },
      { q: "How do refunds work?", a: "Refunds are processed within 5-7 business days to the original payment method. For wallet payments, refunds are instant." },
      { q: "Can I get an invoice for my payment?", a: "Yes, invoices are automatically generated for every transaction. Download them from Dashboard > Payments." },
    ],
  },
  {
    title: "For Doctors",
    icon: "M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    articles: [
      { q: "How do I register as a doctor?", a: "Visit the 'For Doctors' page and click 'Register'. You'll need to provide your medical license, qualifications, and clinic details for verification." },
      { q: "How long does doctor verification take?", a: "Verification typically takes 24-48 hours. We verify your medical registration number with the relevant medical council." },
      { q: "How do doctor payouts work?", a: "Consultation fees are settled weekly via bank transfer. You can track earnings and download reports from your Doctor Dashboard." },
    ],
  },
  {
    title: "Account & Security",
    icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
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
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-700 to-primary-900 py-16 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h1 className="text-4xl font-bold">How can we help?</h1>
          <div className="relative mt-8">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for answers..."
              className="w-full rounded-xl border-0 bg-white/10 px-5 py-4 text-white placeholder-white/60 backdrop-blur-sm outline-none focus:ring-2 focus:ring-white/30"
            />
            <svg className="absolute right-4 top-4 h-5 w-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </section>

      {/* Search results */}
      {search.trim() && (
        <section className="border-b border-gray-100 py-8">
          <div className="mx-auto max-w-3xl px-4">
            <p className="mb-4 text-sm text-gray-500">{filtered.length} result(s) for "{search}"</p>
            {filtered.map((a, i) => (
              <div key={i} className="mb-3 rounded-xl border border-gray-100 p-4">
                <p className="text-xs font-medium text-primary-600 mb-1">{a.category}</p>
                <h3 className="font-semibold text-gray-900">{a.q}</h3>
                <p className="mt-1 text-sm text-gray-600">{a.a}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-4">
          <div className="space-y-10">
            {categories.map((cat) => (
              <div key={cat.title}>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
                    <svg className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={cat.icon} />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">{cat.title}</h2>
                </div>
                <div className="space-y-2">
                  {cat.articles.map((a, i) => {
                    const key = `${cat.title}-${i}`;
                    const open = openIdx === key;
                    return (
                      <div key={i} className="rounded-xl border border-gray-100">
                        <button
                          onClick={() => setOpenIdx(open ? null : key)}
                          className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-gray-900 hover:bg-gray-50"
                        >
                          {a.q}
                          <svg className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {open && (
                          <div className="border-t border-gray-100 px-5 py-4 text-sm leading-relaxed text-gray-600">
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

      {/* Contact */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">Still need help?</h2>
          <p className="mb-6 text-gray-600">Our support team is available 24/7 to assist you.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/contact" className="btn-primary">Contact Support</Link>
            <a href="mailto:support@odudoc.com" className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              Email Us
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
