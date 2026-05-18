import type { Metadata } from "next";
import Link from "next/link";
import { corporateTypesByGroup } from "@/lib/corporate-types";

export const metadata: Metadata = {
  title: "Get started — pick your organisation type",
  description: "Hospital, clinic, lab, pharmacy, pharma, insurance, education — pick your tenant type to get started on OduDoc.",
  alternates: { canonical: "/signup/corporate" },
};

export default function CorporatePickerPage() {
  const groups = corporateTypesByGroup();
  return (
    <main className="bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">For organisations</p>
        <h1 className="mt-2 text-4xl font-extrabold text-gray-900 dark:text-slate-100 md:text-5xl">
          Pick your organisation type
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-gray-600 dark:text-slate-300">
          OduDoc supports 13 organisation types out of the box. Each lands on a tailored signup flow with the right modules
          enabled by default. You can change tier later.
        </p>

        {(Object.keys(groups) as Array<keyof typeof groups>).map((groupName) => (
          <div key={groupName} className="mt-10">
            <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">{groupName}</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {groups[groupName].map((t) => (
                <Link
                  key={t.slug}
                  href={`/signup/corporate/${t.slug}`}
                  className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-3xl">{t.emoji}</span>
                    <span className="rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:from-indigo-900/40 dark:to-purple-900/40 dark:text-indigo-300">
                      {t.tier}
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-gray-900 dark:text-slate-100">{t.name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-slate-300">{t.tagline}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 transition-transform group-hover:translate-x-0.5">
                    {t.selfSignup ? "Get started →" : "How it works →"}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}

        <p className="mt-12 text-center text-sm text-gray-500 dark:text-slate-400">
          Not sure which one applies? <Link href="/contact?subject=corporate" className="font-semibold text-indigo-600 hover:underline">Talk to sales →</Link>
        </p>
      </section>
    </main>
  );
}
