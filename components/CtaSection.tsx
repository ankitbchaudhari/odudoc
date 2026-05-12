import Link from "next/link";

export default function CtaSection() {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary-600 to-primary-800 px-8 py-16 text-center sm:px-16">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg className="h-full w-full" viewBox="0 0 600 300" fill="none">
              <circle cx="100" cy="100" r="150" stroke="white" strokeWidth="0.5" />
              <circle cx="500" cy="200" r="180" stroke="white" strokeWidth="0.5" />
              <circle cx="300" cy="50" r="100" stroke="white" strokeWidth="0.5" />
              <rect x="50" y="50" width="500" height="200" rx="20" stroke="white" strokeWidth="0.3" />
            </svg>
          </div>

          <div className="relative">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Ready to Take Control of Your Health?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-primary-100">
              Book an appointment with our expert doctors today and experience world-class
              healthcare tailored to your needs.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/doctors"
                className="inline-flex items-center rounded-xl bg-white dark:bg-slate-900 px-8 py-3.5 text-sm font-semibold text-primary-600 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                Book Appointment
              </Link>
              <Link
                href="/consult"
                className="inline-flex items-center rounded-xl border-2 border-white px-8 py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-white dark:bg-slate-900 hover:text-primary-600"
              >
                Consult Online
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
