import Link from "next/link";

const sections = [
  {
    id: "introduction",
    icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    title: "Introduction",
    content: (
      <p>
        OduDoc (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website, mobile applications, and services (collectively, the &quot;Platform&quot;).
      </p>
    ),
  },
  {
    id: "info-collect",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    title: "Information We Collect",
    content: (
      <>
        <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-500">Personal Information</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: "Account Data", desc: "Name, email, phone, date of birth, and gender when you create an account.", color: "border-blue-200 bg-blue-50" },
            { label: "Medical Info", desc: "Health records, prescriptions, lab reports, symptoms, diagnoses, and treatment history.", color: "border-green-200 bg-green-50" },
            { label: "Payment Data", desc: "Card numbers, billing addresses, and transaction history. Processed by Stripe — we never store full card numbers.", color: "border-purple-200 bg-purple-50" },
            { label: "Doctor Info", desc: "Medical license, qualifications, clinic details, and professional experience for doctor profiles.", color: "border-amber-200 bg-amber-50" },
          ].map((item) => (
            <div key={item.label} className={`rounded-xl border p-4 ${item.color}`}>
              <h5 className="mb-1 text-sm font-bold text-gray-900">{item.label}</h5>
              <p className="text-xs leading-relaxed text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
        <h4 className="mb-3 mt-6 text-sm font-bold uppercase tracking-wider text-gray-500">Automatically Collected</h4>
        <div className="flex flex-wrap gap-2">
          {["IP address", "Browser type", "Device info", "Pages visited", "Time spent", "Referring URLs", "Cookies"].map((item) => (
            <span key={item} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">{item}</span>
          ))}
        </div>
      </>
    ),
  },
  {
    id: "how-use",
    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
    title: "How We Use Your Information",
    content: (
      <div className="space-y-2">
        {[
          "Facilitate appointment booking and teleconsultations",
          "Provide and improve our healthcare services",
          "Process payments and send transaction confirmations",
          "Verify doctor credentials and maintain quality standards",
          "Send appointment reminders and health tips (with consent)",
          "Comply with legal and regulatory requirements",
          "Analyze usage patterns to improve user experience",
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-3 rounded-lg bg-gray-50 px-4 py-3">
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm text-gray-700">{item}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "sharing",
    icon: "M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z",
    title: "Data Sharing & Disclosure",
    content: (
      <>
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span className="text-sm font-semibold text-green-800">We do not sell your personal data. Ever.</span>
        </div>
        <p className="mb-4 text-sm text-gray-600">We may share information with:</p>
        <div className="space-y-3">
          {[
            { who: "Healthcare Providers", why: "Doctors you consult with receive your relevant medical information." },
            { who: "Payment Processors", why: "Stripe processes payments on our behalf under their own privacy policy." },
            { who: "Lab Partners", why: "When you order lab tests, necessary details are shared with accredited labs." },
            { who: "Legal Requirements", why: "When required by law, subpoena, or government request." },
          ].map((item) => (
            <div key={item.who} className="flex gap-3 rounded-lg border border-gray-100 p-4">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-600">
                {item.who[0]}
              </div>
              <div>
                <h5 className="text-sm font-bold text-gray-900">{item.who}</h5>
                <p className="text-xs text-gray-600">{item.why}</p>
              </div>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: "security",
    icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
    title: "Data Security",
    content: (
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { label: "256-bit Encryption", desc: "SSL/TLS encryption for all data in transit", icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" },
          { label: "HIPAA Compliant", desc: "Medical records stored in compliant infrastructure", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
          { label: "Access Controls", desc: "Role-based access with strict permission management", icon: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" },
          { label: "Regular Audits", desc: "Ongoing security assessments and penetration testing", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
        ].map((item) => (
          <div key={item.label} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gradient-to-br from-white to-gray-50 p-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-50">
              <svg className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
              </svg>
            </div>
            <div>
              <h5 className="text-sm font-bold text-gray-900">{item.label}</h5>
              <p className="text-xs text-gray-500">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "retention",
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    title: "Data Retention",
    content: (
      <p>
        We retain your personal data for as long as your account is active or as needed to provide services. Medical records are retained per applicable healthcare regulations (typically 7-10 years). You may request deletion at any time.
      </p>
    ),
  },
  {
    id: "rights",
    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
    title: "Your Rights",
    content: (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { right: "Access", desc: "Request a copy of your personal data", icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" },
          { right: "Correction", desc: "Update inaccurate information", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
          { right: "Deletion", desc: "Request deletion of your account and data", icon: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" },
          { right: "Portability", desc: "Download your health records in standard formats", icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" },
          { right: "Opt-out", desc: "Unsubscribe from marketing communications", icon: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" },
        ].map((item) => (
          <div key={item.right} className="rounded-xl border border-gray-100 p-4 text-center transition-shadow hover:shadow-md">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary-50">
              <svg className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
              </svg>
            </div>
            <h5 className="mb-1 text-sm font-bold text-gray-900">{item.right}</h5>
            <p className="text-xs text-gray-500">{item.desc}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "cookies",
    icon: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9",
    title: "Cookies",
    content: (
      <p>
        We use essential cookies for authentication and session management. Analytics cookies (Google Analytics) help us understand usage patterns. You can disable non-essential cookies in your browser settings.
      </p>
    ),
  },
  {
    id: "children",
    icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
    title: "Children's Privacy",
    content: (
      <p>
        Our Platform is not intended for children under 13. We do not knowingly collect data from children. For pediatric consultations, a parent/guardian must create and manage the account.
      </p>
    ),
  },
  {
    id: "changes",
    icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
    title: "Changes to This Policy",
    content: (
      <p>
        We may update this Privacy Policy periodically. We will notify you of material changes via email or Platform notification. Continued use after changes constitutes acceptance.
      </p>
    ),
  },
  {
    id: "contact",
    icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    title: "Contact Us",
    content: (
      <div className="flex flex-col gap-3 sm:flex-row">
        <a href="mailto:privacy@odudoc.com" className="flex flex-1 items-center gap-3 rounded-xl border border-gray-200 p-4 transition-all hover:border-primary-300 hover:shadow-md">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50">
            <svg className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-gray-500">Email</p>
            <p className="text-sm font-semibold text-primary-600">privacy@odudoc.com</p>
          </div>
        </a>
        <div className="flex flex-1 items-center gap-3 rounded-xl border border-gray-200 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-gray-500">Address</p>
            <p className="text-sm font-medium text-gray-900">123 Medical Center Dr, New York, NY 10001</p>
          </div>
        </div>
      </div>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 py-20 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-48 w-48 rounded-full bg-white blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Your data is protected
          </div>
          <h1 className="text-4xl font-bold md:text-5xl">Privacy Policy</h1>
          <p className="mt-4 text-lg text-primary-100">
            We take your privacy seriously. Here&apos;s exactly how we handle your data.
          </p>
          <p className="mt-3 text-sm text-primary-200">Last updated: April 1, 2026</p>
        </div>
      </section>

      {/* Table of contents */}
      <div className="mx-auto -mt-8 max-w-4xl px-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-lg">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">Quick Navigation</h3>
          <div className="flex flex-wrap gap-2">
            {sections.map((s, i) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
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
            <section key={s.id} id={s.id} className="scroll-mt-24 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md sm:p-8">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
                  <svg className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={s.icon} />
                  </svg>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Section {i + 1}</span>
                  <h2 className="text-lg font-bold text-gray-900">{s.title}</h2>
                </div>
              </div>
              <div className="text-sm leading-relaxed text-gray-600">{s.content}</div>
            </section>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <section className="border-t border-gray-100 bg-gray-50 py-12">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h3 className="mb-2 text-lg font-bold text-gray-900">Have questions about your data?</h3>
          <p className="mb-5 text-sm text-gray-500">We&apos;re happy to help. Reach out any time.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/contact" className="btn-primary !text-sm">Contact Support</Link>
            <Link href="/terms" className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Read Terms & Conditions</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
