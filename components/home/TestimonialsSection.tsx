// Colorful patient testimonials to build trust on the homepage.

const testimonials = [
  {
    name: "Priya Sharma",
    role: "Patient, Mumbai",
    quote:
      "The video consult was seamless — my doctor was compassionate and the prescription arrived in my inbox within minutes.",
    rating: 5,
    avatar: "PS",
    gradient: "from-rose-400 to-pink-500",
  },
  {
    name: "Marcus Johnson",
    role: "Patient, New York",
    quote:
      "OduDoc made finding a specialist unbelievably easy. Booked, consulted, and got my meds delivered — all in one day.",
    rating: 5,
    avatar: "MJ",
    gradient: "from-sky-400 to-indigo-500",
  },
  {
    name: "Aisha Patel",
    role: "Patient, Dubai",
    quote:
      "I love that all my prescriptions and reports are in one place. The dashboard is beautiful and the support is 24/7.",
    rating: 5,
    avatar: "AP",
    gradient: "from-emerald-400 to-teal-500",
  },
];

function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`h-4 w-4 ${i < n ? "text-amber-400" : "text-gray-200"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.163c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.922-.755 1.688-1.54 1.118L10 15.347l-3.37 2.448c-.784.57-1.838-.196-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.644 9.384c-.783-.57-.38-1.81.588-1.81h4.163a1 1 0 00.95-.69l1.286-3.957z" />
        </svg>
      ))}
    </div>
  );
}

export default function TestimonialsSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-purple-50 py-20">
      <div className="pointer-events-none absolute -left-32 top-24 h-80 w-80 rounded-full bg-gradient-to-br from-rose-200/40 to-pink-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-24 h-80 w-80 rounded-full bg-gradient-to-br from-indigo-200/40 to-purple-200/40 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-100 to-pink-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-rose-700">
            ❤️ Loved by Patients
          </span>
          <h2 className="mt-4 text-3xl font-bold text-gray-900 md:text-5xl">
            What Our{" "}
            <span className="bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500 bg-clip-text text-transparent">
              Patients Say
            </span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-gray-500">
            Real stories from real people who found better health through OduDoc.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="group relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-7 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              {/* Accent top bar */}
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${t.gradient}`} />

              {/* Quote mark */}
              <svg
                className="absolute right-5 top-5 h-10 w-10 text-gray-100"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M7.17 17.17c1.93 0 3.5-1.57 3.5-3.5s-1.57-3.5-3.5-3.5c-.76 0-1.47.24-2.05.65C5.28 8.68 6.8 7 9 7V5c-3.31 0-6 2.69-6 6 0 3.41 1.87 6.17 4.17 6.17zm9 0c1.93 0 3.5-1.57 3.5-3.5s-1.57-3.5-3.5-3.5c-.76 0-1.47.24-2.05.65C14.28 8.68 15.8 7 18 7V5c-3.31 0-6 2.69-6 6 0 3.41 1.87 6.17 4.17 6.17z" />
              </svg>

              <Stars n={t.rating} />

              <p className="mt-4 text-sm leading-relaxed text-gray-700">“{t.quote}”</p>

              <div className="mt-6 flex items-center gap-3 border-t border-gray-100 pt-5">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${t.gradient} text-sm font-bold text-white shadow-md ring-2 ring-white`}
                >
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
