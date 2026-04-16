import Link from "next/link";

const pressReleases = [
  {
    date: "April 10, 2026",
    title: "OduDoc Raises $25M Series B to Expand Telehealth Services Across South Asia",
    excerpt: "The funding round was led by HealthTech Ventures, with participation from existing investors. OduDoc plans to expand its telehealth infrastructure to 50 new cities.",
    source: "TechCrunch",
  },
  {
    date: "March 22, 2026",
    title: "OduDoc Partners with Apollo Hospitals for Integrated Digital Health Records",
    excerpt: "The partnership enables seamless sharing of patient records between OduDoc's platform and Apollo's hospital network, improving continuity of care.",
    source: "Economic Times",
  },
  {
    date: "February 15, 2026",
    title: "OduDoc Launches AI-Powered Symptom Checker for Faster Triage",
    excerpt: "The new feature uses machine learning to help patients understand their symptoms and connect them with the right specialist within minutes.",
    source: "Forbes Health",
  },
  {
    date: "January 28, 2026",
    title: "OduDoc Crosses 1 Million Video Consultations Milestone",
    excerpt: "Just 18 months after launching video consultations, OduDoc has facilitated over one million virtual doctor visits, with a 4.8/5 average patient satisfaction score.",
    source: "Business Standard",
  },
  {
    date: "December 12, 2025",
    title: "OduDoc Named 'HealthTech Startup of the Year' at Global Digital Health Awards",
    excerpt: "The recognition highlights OduDoc's innovative approach to making quality healthcare accessible and affordable through technology.",
    source: "HealthTech Magazine",
  },
  {
    date: "November 5, 2025",
    title: "OduDoc Expands Prescription Delivery to 200+ Cities",
    excerpt: "Patients can now order prescribed medications directly through the OduDoc app with same-day delivery available in metro areas.",
    source: "Mint",
  },
];

const mediaLogos = [
  "TechCrunch", "Forbes", "Economic Times", "Business Standard", "Mint", "YourStory",
];

export default function PressPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-20 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="text-4xl font-bold md:text-5xl">Press & Media</h1>
          <p className="mt-4 text-lg text-gray-300">
            The latest news and updates from OduDoc. For press inquiries, contact{" "}
            <a href="mailto:press@odudoc.com" className="text-primary-400 underline">
              press@odudoc.com
            </a>
          </p>
        </div>
      </section>

      {/* As seen in */}
      <section className="border-b border-gray-100 py-10">
        <div className="mx-auto max-w-5xl px-4">
          <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-gray-400">
            As featured in
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {mediaLogos.map((m) => (
              <span key={m} className="text-lg font-bold text-gray-300">{m}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Press Releases */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="mb-10 text-2xl font-bold text-gray-900">Press Releases</h2>
          <div className="space-y-8">
            {pressReleases.map((pr, i) => (
              <article key={i} className="border-b border-gray-100 pb-8 last:border-0">
                <div className="mb-2 flex items-center gap-3">
                  <span className="text-sm text-gray-500">{pr.date}</span>
                  <span className="rounded-full bg-primary-50 px-3 py-0.5 text-xs font-medium text-primary-700">
                    {pr.source}
                  </span>
                </div>
                <h3 className="mb-2 text-lg font-bold text-gray-900">{pr.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{pr.excerpt}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Media Kit */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">Media Kit</h2>
          <p className="mb-6 text-gray-600">
            Download our brand assets, logos, and executive headshots for press use.
          </p>
          <button className="btn-primary">Download Media Kit</button>
        </div>
      </section>
    </div>
  );
}
