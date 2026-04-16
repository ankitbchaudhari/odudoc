import Link from "next/link";
import DoctorPlanComparison from "@/components/DoctorPlanComparison";

export const metadata = {
  title: "For Doctors - Grow Your Practice with OduDoc",
  description:
    "Join 1000+ doctors on OduDoc. Reach more patients, manage your schedule, and grow your practice with our simple subscription plans.",
};

const stats = [
  { value: "1000+", label: "Doctors Joined" },
  { value: "50K+", label: "Patients Monthly" },
  { value: "4.9", label: "Average Rating" },
  { value: "98%", label: "Doctor Satisfaction" },
];

const steps = [
  {
    num: 1,
    title: "Register & Submit Documents",
    desc: "Fill out the application form and upload your medical license, ID proof, and qualifications.",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
  {
    num: 2,
    title: "Get Verified (24-48 hours)",
    desc: "Our team reviews your documents. You'll get a verification badge once approved.",
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  },
  {
    num: 3,
    title: "Set Your Schedule & Fees",
    desc: "Configure your availability, consultation duration, and set your per-visit fee.",
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    num: 4,
    title: "Start Consulting",
    desc: "Receive patient bookings and start video or in-person consultations right away.",
    icon: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
  },
];

const testimonials = [
  {
    name: "Dr. Emily Rodriguez",
    specialty: "Pediatrician",
    quote:
      "OduDoc has transformed my practice. I now see 40% more patients without the admin headache.",
    initials: "ER",
  },
  {
    name: "Dr. James Kumar",
    specialty: "Cardiologist",
    quote:
      "The Premium plan paid for itself in the first week. Featured listing brought me so many new patients.",
    initials: "JK",
  },
  {
    name: "Dr. Linda Park",
    specialty: "Dermatologist",
    quote:
      "Setup was so smooth. Got verified within 24 hours and started earning the very next day.",
    initials: "LP",
  },
];

const faqs = [
  {
    q: "How long does verification take?",
    a: "Most applications are reviewed within 24-48 hours. You'll receive an email once verified.",
  },
  {
    q: "Can I switch plans later?",
    a: "Yes! You can upgrade from Free to Premium anytime from your dashboard. Downgrades take effect next billing cycle.",
  },
  {
    q: "How do I get paid?",
    a: "Earnings are paid out weekly to your connected bank account or PayPal. OduDoc keeps a small service fee.",
  },
  {
    q: "What happens if I hit the 25-consultation limit on Free?",
    a: "You'll need to upgrade to Premium to continue accepting new patients that month, or they'll be queued for next month.",
  },
  {
    q: "Is there a contract or lock-in?",
    a: "No contracts. You can cancel your Premium subscription anytime.",
  },
];

export default function ForDoctorsPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 to-primary-800 py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-block rounded-full bg-white/15 px-4 py-1 text-xs font-semibold uppercase tracking-wider">
              For Medical Professionals
            </span>
            <h1 className="mt-4 text-4xl font-bold md:text-6xl">
              Grow Your Practice with OduDoc
            </h1>
            <p className="mt-6 text-lg text-white/90 md:text-xl">
              Reach thousands of patients, manage appointments effortlessly, and
              earn more with the #1 telemedicine platform for doctors.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/for-doctors/register"
                className="rounded-lg bg-white px-8 py-3 font-semibold text-primary-700 hover:bg-gray-100"
              >
                Join as a Doctor
              </Link>
              <a
                href="#pricing"
                className="rounded-lg border-2 border-white px-8 py-3 font-semibold text-white hover:bg-white/10"
              >
                See Pricing
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-gray-100 bg-gray-50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-bold text-primary-600 md:text-4xl">
                  {s.value}
                </div>
                <div className="mt-1 text-sm text-gray-600">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Start free, upgrade when you&apos;re ready. No hidden fees.
            </p>
          </div>
          <div className="mx-auto mt-12 max-w-5xl">
            <DoctorPlanComparison />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Get up and running in 4 simple steps
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div
                key={s.num}
                className="relative rounded-xl bg-white p-6 shadow-sm"
              >
                <div className="absolute -top-4 left-6 flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">
                  {s.num}
                </div>
                <div className="mb-3 mt-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={s.icon}
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{s.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">
              Doctors Love OduDoc
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Here&apos;s what our medical community says
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="rounded-xl border border-gray-200 bg-white p-6"
              >
                <div className="mb-4 flex text-yellow-400">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <svg key={i} className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.922-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.196-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm text-gray-700">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 font-bold text-primary-700">
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {t.name}
                    </div>
                    <div className="text-xs text-gray-500">{t.specialty}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">
              Frequently Asked Questions
            </h2>
          </div>
          <div className="mt-10 space-y-4">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-xl border border-gray-200 bg-white p-5"
              >
                <summary className="flex cursor-pointer items-center justify-between font-semibold text-gray-900">
                  {f.q}
                  <svg
                    className="h-5 w-5 text-gray-400 transition-transform group-open:rotate-180"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                <p className="mt-3 text-sm text-gray-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-primary-700 py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold md:text-4xl">
            Join 1000+ Doctors on OduDoc
          </h2>
          <p className="mt-4 text-white/90">
            Start growing your practice today. It takes less than 10 minutes to apply.
          </p>
          <Link
            href="/for-doctors/register"
            className="mt-8 inline-block rounded-lg bg-white px-8 py-3 font-semibold text-primary-700 hover:bg-gray-100"
          >
            Start Your Application
          </Link>
        </div>
      </section>
    </div>
  );
}
