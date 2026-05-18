import Link from "next/link";

const sections = [
  {
    id: "acceptance",
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    title: "Acceptance of Terms",
    content: (
      <div className="space-y-3">
        <p>
          The Service is operated by <strong>Sarjudas Digital Trading and Escrow Services LLC</strong> (&quot;Sarjudas&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;), trading as <strong>OduDoc</strong>. OduDoc is a brand and product of Sarjudas Digital Trading and Escrow Services LLC.
        </p>
        <p>
          By accessing or using OduDoc&apos;s website, mobile applications, and services (the &quot;Platform&quot;), you agree to be bound by these Terms &amp; Conditions. If you do not agree, please do not use the Platform.
        </p>
      </div>
    ),
  },
  {
    id: "services",
    icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
    title: "Description of Services",
    content: (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { name: "Doctor Discovery", desc: "Find and book appointments online", icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z", color: "bg-blue-50 border-blue-200 text-blue-600" },
          { name: "Video Consults", desc: "Virtual medical consultations", icon: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z", color: "bg-green-50 border-green-200 text-green-600" },
          { name: "Prescriptions", desc: "Digital prescription management", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2", color: "bg-purple-50 border-purple-200 text-purple-600" },
          { name: "Online Pharmacy", desc: "Medicine ordering and delivery", icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z", color: "bg-amber-50 border-amber-200 text-amber-600" },
          { name: "Lab Tests", desc: "Book lab tests and get reports", icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z", color: "bg-rose-50 border-rose-200 text-rose-600" },
          { name: "Health Records", desc: "Secure medical records management", icon: "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4", color: "bg-cyan-50 border-cyan-200 text-cyan-600" },
        ].map((s) => (
          <div key={s.name} className={`flex items-start gap-3 rounded-xl border p-4 ${s.color}`}>
            <svg className="mt-0.5 h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={s.icon} />
            </svg>
            <div>
              <h5 className="text-sm font-bold text-gray-900 dark:text-slate-100">{s.name}</h5>
              <p className="text-xs text-gray-600 dark:text-slate-300">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "accounts",
    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
    title: "User Accounts",
    content: (
      <div className="space-y-2">
        {[
          "You must provide accurate, complete information during registration.",
          "You are responsible for maintaining the confidentiality of your account credentials.",
          "You must be at least 18 years old to create an account. Minors must have a parent/guardian manage their account.",
          "One person may not maintain multiple accounts.",
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-3 rounded-lg bg-gray-50 dark:bg-slate-900 px-4 py-3">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-700">{i + 1}</span>
            <span className="text-sm text-gray-700 dark:text-slate-300">{item}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "disclaimer",
    icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
    title: "Medical Disclaimer",
    content: (
      <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-5">
        <div className="mb-2 flex items-center gap-2">
          <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-sm font-bold text-amber-800">Important Notice</span>
        </div>
        <p className="text-sm leading-relaxed text-amber-900">
          <strong>OduDoc is a technology platform, not a healthcare provider.</strong> Medical advice is provided by independent, licensed healthcare professionals. We do not practice medicine, and the Platform does not replace emergency medical services. In case of a medical emergency, call your local emergency number immediately.
        </p>
      </div>
    ),
  },
  {
    id: "appointments",
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    title: "Appointment & Consultation Terms",
    content: (
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-800">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 dark:bg-slate-900">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-slate-300">Policy</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-slate-300">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {[
              ["Availability", "Subject to doctor schedules; may change without notice"],
              ["Early Cancellation", "4+ hours before = full refund"],
              ["Late Cancellation", "Under 4 hours = 25% cancellation fee"],
              ["No-shows", "Charged the full consultation fee"],
              ["Video Consults", "Require stable internet; OduDoc not liable for connectivity issues"],
            ].map(([policy, detail]) => (
              <tr key={policy}>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{policy}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
  },
  {
    id: "payments",
    icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
    title: "Payments & Refunds",
    content: (
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { label: "Transparent Pricing", desc: "All fees displayed before booking, including applicable taxes", icon: "text-green-600 bg-green-50" },
          { label: "Secure Payments", desc: "Processed securely via Razorpay (UPI/cards/netbanking in India), Cashfree, or Stripe with 256-bit encryption. Payments are subject to the respective processor's terms — see razorpay.com/terms, cashfree.com/policies/terms-and-conditions, stripe.com/legal.", icon: "text-blue-600 bg-blue-50" },
          { label: "Refund Timeline", desc: "Refunds processed within 5-7 business days to original method", icon: "text-purple-600 bg-purple-50" },
          { label: "Dispute Window", desc: "Disputes must be raised within 7 days of the transaction", icon: "text-amber-600 bg-amber-50" },
        ].map((item) => (
          <div key={item.label} className="flex items-start gap-3 rounded-xl border border-gray-100 p-4">
            <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${item.icon}`}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h5 className="text-sm font-bold text-gray-900 dark:text-slate-100">{item.label}</h5>
              <p className="text-xs text-gray-500 dark:text-slate-400">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "doctor-obligations",
    icon: "M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    title: "Doctor Obligations",
    content: (
      <div className="space-y-2">
        {[
          "Maintain valid medical licenses and registrations",
          "Provide services with professional care and ethical standards",
          "Maintain patient confidentiality",
          "Keep availability and fees up to date",
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-3 rounded-lg bg-gray-50 dark:bg-slate-900 px-4 py-3">
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm text-gray-700 dark:text-slate-300">{item}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "prohibited",
    icon: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636",
    title: "Prohibited Conduct",
    content: (
      <div className="grid gap-2 sm:grid-cols-2">
        {[
          "Provide false or misleading information",
          "Impersonate another person or entity",
          "Use the Platform for illegal purposes",
          "Attempt to reverse-engineer or hack",
          "Harass, abuse, or threaten others",
          "Post fake reviews or manipulate ratings",
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3">
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="text-sm text-red-800">{item}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "ip",
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    title: "Intellectual Property",
    content: (
      <p>
        All content on the Platform — including logos, text, graphics, software, and design — is owned by OduDoc and protected by intellectual property laws. You may not copy, modify, or distribute our content without written permission.
      </p>
    ),
  },
  {
    id: "liability",
    icon: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3",
    title: "Limitation of Liability",
    content: (
      <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 p-5">
        <p className="text-sm leading-relaxed text-gray-700 dark:text-slate-300">
          OduDoc shall not be liable for any indirect, incidental, or consequential damages arising from the use of the Platform. Our total liability shall not exceed the amount you paid to OduDoc in the <strong>12 months</strong> preceding the claim.
        </p>
      </div>
    ),
  },
  {
    id: "termination",
    icon: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
    title: "Termination",
    content: (
      <p>
        We reserve the right to suspend or terminate accounts that violate these Terms. You may delete your account at any time through Settings. Upon termination, your right to use the Platform ceases immediately.
      </p>
    ),
  },
  {
    id: "governing",
    icon: "M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9",
    title: "Governing Law &amp; Jurisdiction",
    content: (
      <div className="space-y-3">
        <p>
          These Terms are governed by the laws of the State of Delaware,
          United States, without regard to its conflict-of-laws principles.
          OduDoc Inc. is incorporated in Delaware with its principal office
          at 8 The Green, Suite A, Dover, Delaware 19901, United States.
        </p>
        <p>
          Subject to the consumer-rights carve-out below, any dispute
          arising out of or relating to these Terms or your use of the
          Platform shall be resolved exclusively in the state or federal
          courts located in New Castle County, Delaware, and you consent
          to personal jurisdiction in those courts.
        </p>
        <p className="font-semibold">Consumer-protection carve-out</p>
        <p>
          If you are a consumer accessing the Platform from the European
          Union, the United Kingdom, or any other jurisdiction whose
          consumer-protection laws grant you a non-waivable right to bring
          proceedings in your local courts under your local law, this
          governing-law and forum clause does not deprive you of that
          right.
        </p>
        <p className="font-semibold">No medical-emergency use</p>
        <p>
          The Platform is not for medical emergencies. If you or someone
          you are with is experiencing a medical emergency, call your
          local emergency services immediately (e.g. 911 in the US, 112
          in the EU, 999 in the UK, 102/108 in India).
        </p>
      </div>
    ),
  },
  {
    id: "changes",
    icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
    title: "Changes to Terms",
    content: (
      <p>
        We may update these Terms periodically. Material changes will be notified via email. Continued use of the Platform after changes constitutes acceptance.
      </p>
    ),
  },
  {
    id: "contact",
    icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    title: "Contact",
    content: (
      <div className="flex flex-col gap-3 sm:flex-row">
        <a href="mailto:legal@odudoc.com" className="flex flex-1 items-center gap-3 rounded-xl border border-gray-200 dark:border-slate-800 p-4 transition-all hover:border-primary-300 hover:shadow-md">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50">
            <svg className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-slate-400">Email</p>
            <p className="text-sm font-semibold text-primary-600">legal@odudoc.com</p>
          </div>
        </a>
        <div className="flex flex-1 items-center gap-3 rounded-xl border border-gray-200 dark:border-slate-800 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800">
            <svg className="h-5 w-5 text-gray-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-slate-400">Address</p>
            <p className="text-sm font-medium text-gray-900 dark:text-slate-100">8 The Green, Ste A, Dover, DE 19901</p>
          </div>
        </div>
      </div>
    ),
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 py-20 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute left-1/3 top-1/4 h-64 w-64 rounded-full bg-white dark:bg-slate-900 blur-3xl" />
          <div className="absolute bottom-0 right-1/3 h-48 w-48 rounded-full bg-cyan-400 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Legal Agreement
          </div>
          <h1 className="text-4xl font-bold md:text-5xl">Terms &amp; Conditions</h1>
          <p className="mt-4 text-lg text-slate-300">
            Please read these terms carefully before using our Platform.
          </p>
          <p className="mt-3 text-sm text-slate-400">Last updated: April 1, 2026</p>
        </div>
      </section>

      {/* Table of contents */}
      <div className="relative z-10 mx-auto -mt-12 max-w-4xl px-4 sm:-mt-16">
        <div className="rounded-2xl border border-gray-100 bg-white dark:bg-slate-900 p-6 shadow-xl">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-700 dark:text-slate-300">Quick Navigation</h3>
          <div className="flex flex-wrap gap-2">
            {sections.map((s, i) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-lg border border-gray-200 dark:border-slate-800 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-slate-300 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
              >
                {i + 1}. {s.title}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="space-y-8">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-24 rounded-2xl border border-gray-100 bg-white dark:bg-slate-900 p-6 shadow-sm transition-shadow hover:shadow-md sm:p-8">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                  <svg className="h-5 w-5 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={s.icon} />
                  </svg>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500">Section {i + 1}</span>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">{s.title}</h2>
                </div>
              </div>
              <div className="text-sm leading-relaxed text-gray-600 dark:text-slate-300">{s.content}</div>
            </section>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <section className="border-t border-gray-100 bg-gray-50 dark:bg-slate-900 py-12">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h3 className="mb-2 text-lg font-bold text-gray-900 dark:text-slate-100">Questions about our terms?</h3>
          <p className="mb-5 text-sm text-gray-500 dark:text-slate-400">Our legal team is happy to clarify anything.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/contact" className="btn-primary !text-sm">Contact Support</Link>
            <Link href="/privacy" className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-2.5 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800">Read Privacy Policy</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
