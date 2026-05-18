import type { Metadata } from "next";
import Link from "next/link";
import { PROCEDURE_LIBRARY, CATEGORY_META } from "@/lib/procedure-education";

export const metadata: Metadata = {
  title: "Procedure education library — step-by-step healthcare guides",
  description: "Clinician-authored step-by-step guides: IM injections, drug reconstitution, post-op care, vaccination aftercare, insulin pen use, wound dressing, first aid, device use.",
  alternates: { canonical: "/education/procedures" },
};

export default function ProcedureLibraryPage() {
  // Group by category for display
  const grouped = PROCEDURE_LIBRARY.reduce<Record<string, typeof PROCEDURE_LIBRARY>>((acc, p) => {
    acc[p.category] = acc[p.category] || [];
    acc[p.category].push(p);
    return acc;
  }, {});

  const categoryOrder = Object.keys(CATEGORY_META) as (keyof typeof CATEGORY_META)[];

  return (
    <main>
      <section className="bg-gradient-to-br from-emerald-50 via-white to-cyan-50 py-16 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">Procedure education library</p>
          <h1 className="mt-2 text-4xl font-extrabold text-gray-900 dark:text-slate-100 md:text-5xl">
            Step-by-step guides written by clinicians
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-gray-600 dark:text-slate-300">
            Practical clinical-care guides for patients and front-line staff. Surfaced inline when your doctor
            prescribes a procedure — and freely browsable here.
          </p>
        </div>
      </section>

      <section className="bg-white py-12 dark:bg-slate-950">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-12">
          {categoryOrder.map((cat) => {
            const items = grouped[cat];
            if (!items || items.length === 0) return null;
            const meta = CATEGORY_META[cat];
            return (
              <section key={cat}>
                <h2 className="flex items-center gap-3 text-lg font-bold text-gray-900 dark:text-slate-100">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${meta.tone} text-lg shadow`}>{meta.emoji}</span>
                  {meta.label}
                </h2>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {items.map((p) => (
                    <Link
                      key={p.slug}
                      href={`/education/procedures/${p.slug}`}
                      className="block rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                    >
                      <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">{p.title}</h3>
                      <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">{p.summary}</p>
                      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                        {p.clinicianOnly && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">For clinicians</span>
                        )}
                        <span>By {p.author}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </section>
    </main>
  );
}
