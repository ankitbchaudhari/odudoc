import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PROCEDURE_LIBRARY, CATEGORY_META, getProcedure } from "@/lib/procedure-education";

export const dynamicParams = false;

export function generateStaticParams() {
  return PROCEDURE_LIBRARY.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const p = getProcedure(params.slug);
  if (!p) return {};
  return {
    title: p.title,
    description: p.summary,
    alternates: { canonical: `/education/procedures/${p.slug}` },
  };
}

export default function ProcedureDetailPage({ params }: { params: { slug: string } }) {
  const p = getProcedure(params.slug);
  if (!p) return notFound();
  const meta = CATEGORY_META[p.category];

  return (
    <main className="bg-white py-12 dark:bg-slate-950">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Link href="/education/procedures" className="text-xs font-semibold text-emerald-600 hover:underline">
          ← Procedure library
        </Link>
        <div className="mt-4 flex items-start gap-4">
          <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${meta.tone} text-2xl shadow-lg`}>{meta.emoji}</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">{meta.label}</p>
            <h1 className="mt-1 text-3xl font-extrabold text-gray-900 dark:text-slate-100">{p.title}</h1>
            <p className="mt-1 text-gray-600 dark:text-slate-300">{p.summary}</p>
          </div>
        </div>

        {p.clinicianOnly && (
          <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
            <strong>For clinicians.</strong> This content describes a clinical procedure that should be performed only by trained staff. Patients reading this for self-care: please confirm with your prescriber before acting on it.
          </div>
        )}

        {p.steps && p.steps.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">Steps</h2>
            <ol className="mt-3 space-y-3">
              {p.steps.map((s, i) => (
                <li key={i} className="flex gap-3 rounded-xl bg-gray-50 p-4 dark:bg-slate-900">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-xs font-bold text-white">{i + 1}</span>
                  <p className="text-sm text-gray-800 dark:text-slate-200">{s}</p>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section className="prose prose-slate mt-8 max-w-none dark:prose-invert">
          {p.body.split("\n\n").map((para, i) => (
            <p key={i} dangerouslySetInnerHTML={{ __html: para.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} />
          ))}
        </section>

        <footer className="mt-10 border-t border-gray-200 pt-4 text-xs text-gray-500 dark:border-slate-800 dark:text-slate-400">
          Reviewed by {p.author}
          {p.source ? <> · Source: {p.source}</> : null}
          {" · "}Last updated {new Date(p.updatedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
        </footer>
      </div>
    </main>
  );
}
