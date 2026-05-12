// Refund & Cancellation Policy — public legal page.
// URL: /refund-policy  (short, used on payment-gateway merchant
// onboarding forms that ask for "Refund and Cancellation Policy URL").

import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy — OduDoc",
  description:
    "How OduDoc handles refunds for consultations, pharmacy orders, and subscription cancellations. Eligibility, timelines, and how to request a refund.",
  alternates: { canonical: "/refund-policy" },
  openGraph: {
    title: "Refund & Cancellation Policy — OduDoc",
    description: "Refund eligibility, timelines, and how to request a refund.",
    url: "/refund-policy",
    type: "article",
  },
};

const LAST_UPDATED = "9 May 2026";
const SUPPORT_EMAIL = "support@odudoc.com";

const sections = [
  {
    id: "overview",
    icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    title: "Overview",
    content: (
      <p>
        OduDoc (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) wants every
        patient and clinic on the platform to feel confident transacting with
        us. This Refund &amp; Cancellation Policy explains when refunds are
        available, how long they take, and how to request one. The policy
        covers consultations, pharmacy orders, and subscription payments.
      </p>
    ),
  },
  {
    id: "consultations",
    icon: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
    title: "Video / Online Consultations",
    content: (
      <>
        <p className="mb-4">
          We offer a generous, patient-first cancellation policy for
          consultations because we believe nobody should be charged for a
          service they didn&apos;t receive.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              label: "100 % refund",
              when: "Cancelled by the patient at least 30 minutes before the scheduled slot.",
              color: "border-emerald-200 bg-emerald-50 text-emerald-900",
            },
            {
              label: "100 % refund",
              when: "The doctor no-shows or fails to start the consultation within 15 minutes of the scheduled time.",
              color: "border-emerald-200 bg-emerald-50 text-emerald-900",
            },
            {
              label: "100 % refund",
              when: "Technical failure (video could not connect, prescription not delivered, etc.) — verified by our support team.",
              color: "border-emerald-200 bg-emerald-50 text-emerald-900",
            },
            {
              label: "50 % refund",
              when: "Patient cancels within 30 minutes of the scheduled slot. The remaining 50 % is paid to the doctor for the time blocked.",
              color: "border-amber-200 bg-amber-50 text-amber-900",
            },
            {
              label: "No refund",
              when: "Patient no-shows for the consultation without prior cancellation.",
              color: "border-rose-200 bg-rose-50 text-rose-900",
            },
            {
              label: "Reschedule",
              when: "Free of charge up to 1 hour before the scheduled slot. Use the booking detail page to pick a new time.",
              color: "border-sky-200 bg-sky-50 text-sky-900",
            },
          ].map((item) => (
            <div key={item.label} className={`rounded-xl border p-4 ${item.color}`}>
              <h5 className="mb-1 text-sm font-bold">{item.label}</h5>
              <p className="text-xs leading-relaxed">{item.when}</p>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: "pharmacy",
    icon: "M19 14l-7 7m0 0l-7-7m7 7V3",
    title: "Pharmacy Orders (Medicines)",
    content: (
      <>
        <p className="mb-4">
          Medicines dispensed against a valid prescription generally cannot be
          returned for safety and regulatory reasons (Drug &amp; Cosmetics Act,
          1940). Refunds are available in the following situations:
        </p>
        <ul className="space-y-2">
          {[
            "Wrong medicine dispatched — full refund or free replacement, your choice.",
            "Damaged or expired packaging on arrival — full refund + complimentary re-delivery.",
            "Order cancelled by the patient before the pharmacy marks it 'Preparing' — full refund.",
            "Pharmacy could not fulfil the order (drug unavailable) — full refund within 24 hours.",
            "Patient cancels after the order is dispatched — only the un-dispensed portion is refundable; dispensed medicines are non-returnable.",
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3 rounded-lg bg-gray-50 dark:bg-slate-900 px-4 py-3">
              <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm text-gray-700 dark:text-slate-300">{item}</span>
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    id: "subscriptions",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    title: "Clinic / Hospital Subscriptions",
    content: (
      <>
        <p className="mb-4">
          OduDoc offers Clinic and Hospital plans on a monthly subscription
          basis after a free 30-day trial.
        </p>
        <div className="space-y-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <h5 className="mb-1 text-sm font-bold text-emerald-900">7-day money-back guarantee</h5>
            <p className="text-xs leading-relaxed text-emerald-900">
              If you cancel within 7 days of your first paid month, you get a
              full refund — no questions asked.
            </p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h5 className="mb-1 text-sm font-bold text-amber-900">After 7 days</h5>
            <p className="text-xs leading-relaxed text-amber-900">
              Subscriptions cancel at the end of the current billing period.
              You retain full access until the period ends. We do not
              pro-rate partial months.
            </p>
          </div>
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
            <h5 className="mb-1 text-sm font-bold text-sky-900">Annual / multi-month plans</h5>
            <p className="text-xs leading-relaxed text-sky-900">
              Cancellable at any time. Refunds are pro-rated on a per-month
              basis (used months are non-refundable; remaining months are
              refunded in full to the original payment method).
            </p>
          </div>
        </div>
      </>
    ),
  },
  {
    id: "failed",
    icon: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    title: "Failed or Duplicate Transactions",
    content: (
      <p>
        If your card was charged but no booking / prescription / order was
        created on OduDoc — or the same payment was deducted twice — the
        amount is automatically refunded to the original payment method
        within <strong>5–7 business days</strong>. No request needed.
        Verify by checking your payment-method statement; if you don&apos;t
        see the refund after 7 business days, email{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-primary-600 hover:underline">
          {SUPPORT_EMAIL}
        </a>{" "}
        with the transaction id and we&apos;ll trace it.
      </p>
    ),
  },
  {
    id: "timeline",
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    title: "Refund Timeline",
    content: (
      <>
        <p className="mb-4">
          Once a refund is approved, the time it takes to land back in your
          account depends on your payment method:
        </p>
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-900 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2">Payment method</th>
                <th className="px-4 py-2">Typical refund time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {[
                ["UPI / Wallet", "1–3 business days"],
                ["Credit / Debit card", "5–7 business days"],
                ["Net banking", "5–7 business days"],
                ["International card (Cashfree / Stripe)", "7–10 business days"],
                ["Cash on delivery (pharmacy)", "Immediate (refund processed at pickup or via bank transfer within 3 days)"],
              ].map(([method, time]) => (
                <tr key={method}>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{method}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-slate-300">{time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-gray-500 dark:text-slate-400">
          Refunds are issued only to the original payment instrument used at
          checkout. We are unable to redirect a refund to a different card,
          UPI id, or bank account.
        </p>
      </>
    ),
  },
  {
    id: "how-to",
    icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    title: "How to Request a Refund",
    content: (
      <>
        <p className="mb-4">There are three easy ways:</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <span className="text-lg">📱</span>
            </div>
            <h5 className="mb-1 text-sm font-bold text-blue-900">From your dashboard</h5>
            <p className="text-xs leading-relaxed text-blue-900">
              Open the order / consultation in your patient dashboard, click{" "}
              <strong>Cancel</strong> or <strong>Request refund</strong>.
              Eligible refunds are auto-approved instantly.
            </p>
          </div>
          <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <span className="text-lg">✉</span>
            </div>
            <h5 className="mb-1 text-sm font-bold text-purple-900">Email support</h5>
            <p className="text-xs leading-relaxed text-purple-900">
              Email{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold underline">
                {SUPPORT_EMAIL}
              </a>{" "}
              with your order id and reason. We respond within 24 hours.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <span className="text-lg">💬</span>
            </div>
            <h5 className="mb-1 text-sm font-bold text-emerald-900">In-app chat</h5>
            <p className="text-xs leading-relaxed text-emerald-900">
              Open <Link href="/help" className="font-semibold underline">/help</Link> →{" "}
              Talk to support. The widget is available 9 AM – 9 PM IST,
              7 days a week.
            </p>
          </div>
        </div>
      </>
    ),
  },
  {
    id: "non-refundable",
    icon: "M6 18L18 6M6 6l12 12",
    title: "Non-Refundable Items",
    content: (
      <ul className="space-y-2">
        {[
          "Consultations the patient attended in full and accepted the prescription for.",
          "Medicines that have been dispensed and physically delivered, except in the cases listed under \"Pharmacy Orders\" above.",
          "Already-used months of a clinic / hospital subscription (current month is always served to its end).",
          "Service fees, taxes (GST), and platform charges that have been remitted to government authorities.",
          "Promotional credits and referral bonuses (these can only be redeemed against future bookings, never withdrawn as cash).",
        ].map((item, i) => (
          <li key={i} className="flex items-start gap-3 rounded-lg bg-rose-50 px-4 py-3">
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="text-sm text-gray-700 dark:text-slate-300">{item}</span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    id: "disputes",
    icon: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3",
    title: "Disputes &amp; Chargebacks",
    content: (
      <>
        <p className="mb-3">
          We hope to resolve every concern directly via support. If you
          remain unsatisfied with our refund decision, you can:
        </p>
        <ol className="list-inside list-decimal space-y-2 text-sm text-gray-700 dark:text-slate-300">
          <li>
            Escalate by emailing{" "}
            <a href="mailto:grievance@odudoc.com" className="font-semibold text-primary-600 hover:underline">
              grievance@odudoc.com
            </a>{" "}
            — our Grievance Officer responds within 7 working days.
          </li>
          <li>
            Lodge a complaint with your card issuer or bank (chargeback
            mechanism). We co-operate with all chargeback investigations.
          </li>
          <li>
            For Indian customers: file a complaint via the{" "}
            <a
              href="https://consumerhelpline.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary-600 hover:underline"
            >
              National Consumer Helpline
            </a>{" "}
            (1915) or the relevant state consumer forum.
          </li>
        </ol>
      </>
    ),
  },
  {
    id: "changes",
    icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
    title: "Changes to This Policy",
    content: (
      <p>
        We may update this policy from time to time to reflect new product
        capabilities or regulatory requirements. The &quot;Last updated&quot;
        date at the top of this page always reflects the current version.
        Material changes are announced via email to registered users at
        least 7 days before they take effect.
      </p>
    ),
  },
];

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-indigo-800 py-16 text-white sm:py-20">
        <div aria-hidden="true" className="pointer-events-none absolute -top-20 right-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 left-0 h-72 w-72 rounded-full bg-fuchsia-300/20 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
            Legal · Last updated {LAST_UPDATED}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Refund &amp; Cancellation Policy
          </h1>
          <p className="mt-4 max-w-2xl text-base text-white/90">
            Clear, plain-English rules on when refunds are available, how
            long they take, and how to request one. We aim to make this
            painless — most refunds are auto-approved from your dashboard
            in seconds.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="inline-flex items-center gap-2 rounded-full bg-white dark:bg-slate-900 px-5 py-2 text-sm font-semibold text-primary-700 shadow-md transition hover:-translate-y-0.5"
            >
              ✉ Contact support
            </a>
            <Link
              href="/help"
              className="inline-flex items-center gap-2 rounded-full bg-white/15 px-5 py-2 text-sm font-semibold text-white backdrop-blur-sm ring-1 ring-white/30 transition hover:bg-white/25"
            >
              💬 Open help centre
            </Link>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Table of contents */}
        <nav className="mb-10 rounded-2xl border border-gray-100 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500 dark:text-slate-400">
            On this page
          </p>
          <ul className="grid gap-1 sm:grid-cols-2">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="block rounded-lg px-2 py-1 text-sm text-gray-700 dark:text-slate-300 transition hover:bg-primary-50 hover:text-primary-700"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-12">
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white shadow-md">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 sm:text-2xl">{s.title}</h2>
              </div>
              <div className="ml-13 text-sm leading-relaxed text-gray-700 dark:text-slate-300 sm:ml-13">
                {s.content}
              </div>
            </section>
          ))}
        </div>

        {/* Closing card */}
        <div className="mt-12 overflow-hidden rounded-3xl border border-primary-100 bg-gradient-to-br from-primary-50 via-indigo-50/60 to-fuchsia-50/40 p-8 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">Still have questions?</h3>
          <p className="mt-2 max-w-xl text-sm text-gray-700 dark:text-slate-300">
            Our support team is real humans, not chatbots, and we genuinely
            want every refund situation to end in a satisfied user. Reach
            out and we&apos;ll figure it out together.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="rounded-full bg-gradient-to-r from-primary-600 to-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5"
            >
              ✉ Email support
            </a>
            <Link
              href="/contact"
              className="rounded-full border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-2 text-sm font-semibold text-gray-700 dark:text-slate-300 transition hover:bg-gray-50 dark:bg-slate-900"
            >
              Contact form
            </Link>
            <Link
              href="/legal"
              className="rounded-full border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-2 text-sm font-semibold text-gray-700 dark:text-slate-300 transition hover:bg-gray-50 dark:bg-slate-900"
            >
              All legal pages
            </Link>
          </div>
        </div>

        {/* Cross-links */}
        <p className="mt-8 text-center text-xs text-gray-500 dark:text-slate-400">
          See also:{" "}
          <Link href="/privacy" className="font-semibold text-primary-600 hover:underline">
            Privacy Policy
          </Link>{" "}
          ·{" "}
          <Link href="/terms" className="font-semibold text-primary-600 hover:underline">
            Terms of Service
          </Link>{" "}
          ·{" "}
          <Link href="/legal" className="font-semibold text-primary-600 hover:underline">
            Legal &amp; Compliance
          </Link>
        </p>
      </section>
    </div>
  );
}
