"use client";

const awards = [
  { name: "Best Healthcare Provider 2025", year: "2025", body: "National Health Council", icon: "🏆" },
  { name: "JCI Accreditation", year: "2024", body: "Joint Commission International", icon: "🏅" },
  { name: "Patient Safety Excellence Award", year: "2025", body: "Healthcare Safety Board", icon: "🛡️" },
  { name: "Top Digital Health Platform", year: "2024", body: "Digital Health Awards", icon: "💻" },
  { name: "ISO 9001:2015 Certified", year: "2023", body: "International Organization for Standardization", icon: "📋" },
  { name: "Best Telemedicine Platform", year: "2025", body: "TeleMed Association", icon: "📡" },
  { name: "Healthcare Innovation Award", year: "2024", body: "MedTech Innovators", icon: "💡" },
  { name: "Patient Choice Award", year: "2025", body: "Patient Advocacy Group", icon: "❤️" },
  { name: "Excellence in Medical Technology", year: "2024", body: "HealthTech Global", icon: "⚕️" },
  { name: "Best Patient Experience", year: "2025", body: "Healthcare Experience Foundation", icon: "⭐" },
];

export default function AwardsSection() {
  return (
    <section className="overflow-hidden bg-gray-50 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="section-title text-center">Awards &amp; Certifications</h2>
        <p className="section-subtitle text-center">
          Recognized for excellence in healthcare delivery
        </p>
      </div>

      <div className="relative mt-10">
        <div className="flex animate-marquee gap-6 whitespace-nowrap">
          {[...awards, ...awards].map((award, i) => (
            <div
              key={`${award.name}-${i}`}
              className="inline-flex w-64 flex-shrink-0 flex-col items-center rounded-xl bg-white p-6 shadow-md"
            >
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-2xl">
                {award.icon}
              </div>
              <h3 className="whitespace-normal text-center text-sm font-bold text-gray-900">
                {award.name}
              </h3>
              <p className="mt-1 text-xs font-semibold text-primary-600">{award.year}</p>
              <p className="mt-1 whitespace-normal text-center text-xs text-gray-400">
                {award.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
