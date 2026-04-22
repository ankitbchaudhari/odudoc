"use client";

const awards = [
  { name: "Best Healthcare Provider 2025", year: "2025", body: "National Health Council", icon: "🏆", gradient: "from-amber-400 to-orange-500" },
  { name: "JCI Accreditation", year: "2024", body: "Joint Commission International", icon: "🏅", gradient: "from-yellow-400 to-amber-500" },
  { name: "Patient Safety Excellence Award", year: "2025", body: "Healthcare Safety Board", icon: "🛡️", gradient: "from-emerald-400 to-teal-500" },
  { name: "Top Digital Health Platform", year: "2024", body: "Digital Health Awards", icon: "💻", gradient: "from-sky-400 to-indigo-500" },
  { name: "ISO 9001:2015 Certified", year: "2023", body: "International Organization for Standardization", icon: "📋", gradient: "from-slate-400 to-slate-600" },
  { name: "Best Telemedicine Platform", year: "2025", body: "TeleMed Association", icon: "📡", gradient: "from-cyan-400 to-blue-500" },
  { name: "Healthcare Innovation Award", year: "2024", body: "MedTech Innovators", icon: "💡", gradient: "from-yellow-400 to-orange-500" },
  { name: "Patient Choice Award", year: "2025", body: "Patient Advocacy Group", icon: "❤️", gradient: "from-rose-400 to-pink-500" },
  { name: "Excellence in Medical Technology", year: "2024", body: "HealthTech Global", icon: "⚕️", gradient: "from-teal-400 to-emerald-500" },
  { name: "Best Patient Experience", year: "2025", body: "Healthcare Experience Foundation", icon: "⭐", gradient: "from-fuchsia-400 to-purple-500" },
];

export default function AwardsSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-primary-50/30 to-white py-20">
      <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-gradient-to-br from-amber-200/40 to-orange-200/40 blur-3xl" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-orange-700">
            🏆 Recognition
          </span>
          <h2 className="mt-4 text-3xl font-bold text-gray-900 md:text-5xl">
            Awards &amp;{" "}
            <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent">
              Certifications
            </span>
          </h2>
          <p className="mt-3 text-gray-500">
            Recognized for excellence in healthcare delivery
          </p>
        </div>
      </div>

      <div className="relative mt-10">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-white to-transparent" />
        <div className="flex animate-marquee gap-6 whitespace-nowrap">
          {[...awards, ...awards].map((award, i) => (
            <div
              key={`${award.name}-${i}`}
              className="group relative inline-flex w-64 flex-shrink-0 flex-col items-center overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-md transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              <div
                className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${award.gradient}`}
              />
              <div
                className={`mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${award.gradient} text-2xl shadow-lg ring-4 ring-white transition-transform group-hover:scale-110 group-hover:rotate-3`}
              >
                {award.icon}
              </div>
              <h3 className="whitespace-normal text-center text-sm font-bold text-gray-900">
                {award.name}
              </h3>
              <span
                className={`mt-2 inline-block rounded-full bg-gradient-to-r ${award.gradient} px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm`}
              >
                {award.year}
              </span>
              <p className="mt-2 whitespace-normal text-center text-xs text-gray-500">
                {award.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
