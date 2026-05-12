"use client";

const partners = [
  { name: "MedTech Labs", color: "bg-blue-500" },
  { name: "HealthFirst", color: "bg-teal-500" },
  { name: "BioGenix", color: "bg-purple-500" },
  { name: "CarePlus", color: "bg-green-500" },
  { name: "MedSync", color: "bg-cyan-500" },
  { name: "PharmaCo", color: "bg-indigo-500" },
  { name: "VitalCare", color: "bg-rose-500" },
  { name: "NovaMed", color: "bg-amber-500" },
  { name: "LifeScience", color: "bg-emerald-500" },
  { name: "WellPath", color: "bg-sky-500" },
];

export default function PartnerLogos() {
  return (
    <section className="overflow-hidden bg-white dark:bg-slate-900 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="section-title text-center">Our Trusted Partners</h2>
        <p className="section-subtitle text-center">
          Working with leading healthcare organizations worldwide
        </p>
      </div>

      <div className="relative mt-10 overflow-hidden">
        <div className="flex animate-marquee gap-8">
          {[...partners, ...partners].map((partner, i) => (
            <div
              key={`${partner.name}-${i}`}
              className="group flex h-20 w-44 flex-shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-white dark:bg-slate-900 px-6 shadow-sm transition-all duration-300 hover:shadow-md"
            >
              <div className="flex items-center gap-3 grayscale transition-all duration-300 group-hover:grayscale-0">
                <div className={`h-8 w-8 rounded-lg ${partner.color} flex items-center justify-center text-xs font-bold text-white`}>
                  {partner.name.charAt(0)}
                </div>
                <span className="whitespace-nowrap text-sm font-semibold text-gray-600 dark:text-slate-300 group-hover:text-gray-900 dark:text-slate-100">
                  {partner.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
