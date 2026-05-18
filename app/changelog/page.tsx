import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Every meaningful change shipped to the OduDoc platform — features, fixes, and improvements.",
  alternates: { canonical: "/changelog" },
};

// Spec: Final Cowork Reference / Header+Footer Final · footer "Resources"
// column. Lightweight changelog index — entries are seeded from the
// most-recent commit messages until we wire a CMS for it.
const entries = [
  {
    date: "2026-05-18",
    title: "Glass + aurora dashboards",
    body: "Patient, doctor, and clinic dashboards moved to a frosted-glass / aurora visual system with per-role signature colours. Public navbar is now suppressed on post-login surfaces.",
  },
  {
    date: "2026-05-17",
    title: "Family-account threading",
    body: "Booking on behalf of a dependent (kid / parent / spouse) now stamps the dependent name on the consultation. Doctor's dashboard shows the dependent as the primary patient with a 'booked by <owner>' chip.",
  },
  {
    date: "2026-05-16",
    title: "AI symptom triage + clinic TPA empanelment",
    body: "Free-text symptom checker powered by Gemini. Clinics can now manage TPA cashless empanelments with discount %, contact, and validity tracking.",
  },
  {
    date: "2026-05-15",
    title: "Indic-language navbar + vaccination tracker",
    body: "Hindi, Tamil, Telugu, Marathi, Bengali navbar translations. UIP vaccination schedule with auto-reminders.",
  },
  {
    date: "2026-05-14",
    title: "SEO landing pages",
    body: "216 new specialty × city pages (12 specialties × 18 cities) with Service / FAQ / Breadcrumb JSON-LD and sitemap entries.",
  },
];

export default function ChangelogPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-extrabold text-gray-900 dark:text-slate-100">Changelog</h1>
      <p className="mt-3 text-lg text-gray-600 dark:text-slate-300">
        Every meaningful change shipped to the OduDoc platform.
      </p>
      <ol className="mt-10 space-y-8 border-l border-gray-200 dark:border-slate-800">
        {entries.map((e) => (
          <li key={e.date} className="relative pl-6">
            <span className="absolute -left-[7px] top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 ring-4 ring-white dark:ring-slate-950" />
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
              {new Date(e.date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
            </p>
            <h2 className="mt-1 text-lg font-bold text-gray-900 dark:text-slate-100">{e.title}</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">{e.body}</p>
          </li>
        ))}
      </ol>
    </main>
  );
}
