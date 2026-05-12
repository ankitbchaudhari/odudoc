import StatsSection from "@/components/StatsSection";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn about OduDoc's mission to make quality healthcare accessible to everyone.",
};

interface TeamMember {
  name: string;
  role: string;
  initials: string;
  color: string;
  photo?: string;
}

const team: TeamMember[] = [
  { name: "Dr. Ankitkumar Chaudhari", role: "Founder & CEO", initials: "AC", color: "bg-indigo-500" },
  { name: "Dr. Dixit Velani", role: "Chief Medical Officer & Internal Medicine Specialist", initials: "DV", color: "bg-teal-500" },
  { name: "Dr. Prutha Chaudhary", role: "Rehabilitation Specialist & Head of Physiotherapy", initials: "PC", color: "bg-orange-500" },
  { name: "Dr. Pankti Chaudhari", role: "Integrative Medicine Specialist", initials: "PC", color: "bg-rose-500" },
  { name: "Lawan Bala", role: "Director of Pharmacy Services", initials: "LB", color: "bg-emerald-500" },
  { name: "Danlami Lawal", role: "Clinical Microbiologist", initials: "DL", color: "bg-cyan-500" },
];

const values = [
  { icon: "❤️", title: "Patient First", desc: "Every decision we make starts with what's best for the patient." },
  { icon: "🔬", title: "Innovation", desc: "We leverage technology to make healthcare more accessible and affordable." },
  { icon: "🤝", title: "Trust", desc: "We build trust through transparency, quality, and consistent care." },
  { icon: "🌍", title: "Accessibility", desc: "Quality healthcare should be available to everyone, everywhere." },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-50 via-white to-teal-50 py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-slate-100 md:text-5xl">
            Making Healthcare <span className="text-primary-600">Accessible</span> for Everyone
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-500 dark:text-slate-400">
            OduDoc is on a mission to make quality healthcare accessible, affordable, and convenient for millions of people. We connect patients with the best doctors and healthcare services through technology.
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 md:grid-cols-2 lg:px-8">
          <div className="card border-l-4 border-primary-500">
            <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Our Mission</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-slate-300">
              To simplify the healthcare experience by connecting patients with quality doctors and health services through a seamless digital platform. We aim to ensure that no one has to struggle to find the right care at the right time.
            </p>
          </div>
          <div className="card border-l-4 border-teal-500">
            <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Our Vision</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-slate-300">
              To be the world&apos;s most trusted healthcare platform, where every individual can access affordable, quality healthcare with just a few taps. We envision a future where geography and cost are no longer barriers to good health.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-gray-50 dark:bg-slate-900 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="section-title text-center">Our Core Values</h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <div key={v.title} className="card text-center">
                <span className="mb-4 block text-4xl">{v.icon}</span>
                <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">{v.title}</h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <StatsSection />

      {/* Team */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="section-title text-center">Meet Our Leadership Team</h2>
          <p className="section-subtitle text-center">
            Passionate people building the future of healthcare
          </p>
          <div className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-6">
            {team.map((t) => (
              <div key={t.name} className="card text-center">
                {t.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={t.photo}
                    alt={t.name}
                    className="mx-auto mb-4 h-20 w-20 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full text-xl font-bold text-white ${t.color}`}
                  >
                    {t.initials}
                  </div>
                )}
                <h3 className="font-semibold text-gray-900 dark:text-slate-100">{t.name}</h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{t.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="bg-gray-50 dark:bg-slate-900 py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="section-title text-center">Our Journey</h2>
          <div className="mt-10 space-y-8">
            {[
              { year: "2020", text: "OduDoc founded with a vision to democratize healthcare" },
              { year: "2021", text: "Launched video consultation feature; 10K+ doctors onboarded" },
              { year: "2022", text: "Expanded to 100+ cities; introduced home lab test collection" },
              { year: "2023", text: "Reached 1M+ patient consultations; launched surgery services" },
              { year: "2024", text: "AI-powered health insights; partnerships with 500+ hospitals" },
              { year: "2025", text: "Went worldwide — live in 40+ countries across North America, Europe, Middle East, Asia-Pacific and Africa" },
              { year: "2026", text: "Crossed 5M+ consultations; launched multivendor pharmacy marketplace and the OduDoc Hospital Management Suite for enterprise partners" },
            ].map((item) => (
              <div key={item.year} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
                    {item.year.slice(2)}
                  </div>
                  <div className="h-full w-0.5 bg-primary-200" />
                </div>
                <div className="pb-8">
                  <p className="text-sm font-bold text-primary-600">{item.year}</p>
                  <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
