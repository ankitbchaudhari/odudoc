import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OduDoc Reach — Marketing tools for doctors",
  description:
    "Grow your practice with OduDoc Reach: verified reviews, sponsored listings, profile analytics, online appointments, and content marketing designed for clinicians.",
  alternates: { canonical: "/reach" },
  openGraph: {
    title: "OduDoc Reach — Marketing tools for doctors",
    description:
      "Get discovered by patients searching in your specialty and city. Book more appointments with verified reviews and sponsored listings.",
    url: "/reach",
    type: "website",
  },
};

const benefits = [
  { title: "Grow Your Patient Base", desc: "Get discovered by thousands of patients searching for doctors in your specialty and location.", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
  { title: "Verified Reviews", desc: "Showcase genuine patient reviews. Build trust and credibility with your online reputation.", icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" },
  { title: "Sponsored Listings", desc: "Appear at the top of search results in your city. Pay only for patient clicks.", icon: "M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" },
  { title: "Profile Analytics", desc: "Track who views your profile, where patients come from, and which services get the most interest.", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { title: "Online Appointments", desc: "Let patients book directly from your OduDoc profile. Sync with your calendar in real-time.", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { title: "Content Marketing", desc: "Publish health tips and articles. Position yourself as a thought leader in your field.", icon: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" },
];

export default function ReachPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Hero */}
      <section className="bg-gradient-to-br from-emerald-700 to-teal-800 py-20 text-white">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-emerald-200">Marketing for Doctors</p>
          <h1 className="text-4xl font-bold md:text-5xl">OduDoc Reach</h1>
          <p className="mt-4 text-lg text-emerald-100">
            Grow your practice online. Get more patients through your digital presence.
          </p>
          <Link href="/for-doctors/register" className="mt-8 inline-block rounded-xl bg-white dark:bg-slate-900 px-8 py-3 text-sm font-semibold text-emerald-700 shadow-lg hover:bg-gray-50 dark:hover:bg-slate-800">
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-10 text-center text-2xl font-bold text-gray-900 dark:text-slate-100">Grow Your Practice with OduDoc Reach</h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map((b) => (
              <div key={b.title} className="rounded-2xl border border-gray-100 p-6 transition-shadow hover:shadow-md">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
                  <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={b.icon} />
                  </svg>
                </div>
                <h3 className="mb-2 font-bold text-gray-900 dark:text-slate-100">{b.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600 dark:text-slate-300">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-emerald-50 py-16">
        <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-16 px-4">
          {[
            { value: "50K+", label: "Doctors on OduDoc" },
            { value: "2M+", label: "Monthly Patient Searches" },
            { value: "85%", label: "Profile View to Booking Rate" },
            { value: "4.8/5", label: "Average Doctor Rating" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-bold text-emerald-700">{s.value}</p>
              <p className="text-sm text-gray-600 dark:text-slate-300">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-slate-100">Ready to Reach More Patients?</h2>
          <p className="mb-6 text-gray-600 dark:text-slate-300">Join thousands of doctors growing their practice with OduDoc Reach. Free to start.</p>
          <Link href="/for-doctors/register" className="btn-primary">Create Your Profile</Link>
        </div>
      </section>
    </div>
  );
}
