const stats = [
  {
    value: "100K+",
    label: "Doctors",
    icon: "🩺",
    gradient: "from-sky-400 to-indigo-500",
  },
  {
    value: "50K+",
    label: "Happy Patients",
    icon: "😊",
    gradient: "from-emerald-400 to-teal-500",
  },
  {
    value: "24/7",
    label: "Support",
    icon: "📞",
    gradient: "from-fuchsia-400 to-pink-500",
  },
  {
    value: "200+",
    label: "Cities",
    icon: "🏙️",
    gradient: "from-amber-400 to-orange-500",
  },
];

export default function StatsSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-teal-700 to-emerald-700 py-20">
      {/* Decorative glow */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-emerald-400/20 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.08),transparent_60%)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-white md:text-4xl">
            Trusted by Millions Worldwide
          </h2>
          <p className="mt-2 text-white/80">
            Join the largest community of healthcare seekers and providers
          </p>
        </div>

        <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="group relative overflow-hidden rounded-2xl border border-white/15 bg-white/10 p-6 text-center backdrop-blur-md transition-all hover:-translate-y-1 hover:bg-white/15 hover:shadow-2xl"
            >
              <div
                className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${s.gradient}`}
              />
              <div
                className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${s.gradient} text-2xl shadow-lg ring-4 ring-white/20 transition-transform group-hover:scale-110`}
              >
                {s.icon}
              </div>
              <p className="text-3xl font-extrabold text-white md:text-4xl">{s.value}</p>
              <p className="mt-1 text-sm font-medium text-white/80">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
