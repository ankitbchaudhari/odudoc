import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CORPORATE_TYPES, getCorporateType } from "@/lib/corporate-types";

export const dynamicParams = false;

export function generateStaticParams() {
  return CORPORATE_TYPES.map((t) => ({ type: t.slug }));
}

export function generateMetadata({ params }: { params: { type: string } }): Metadata {
  const t = getCorporateType(params.type);
  if (!t) return {};
  return {
    title: `OduDoc for ${t.name} — ${t.tier} tier`,
    description: t.tagline,
    alternates: { canonical: `/signup/corporate/${t.slug}` },
    openGraph: {
      title: `OduDoc for ${t.name}`,
      description: t.tagline,
      url: `/signup/corporate/${t.slug}`,
      type: "website",
    },
  };
}

export default function CorporateTypePage({ params }: { params: { type: string } }) {
  const t = getCorporateType(params.type);
  if (!t) return notFound();

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 py-20 text-white">
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-indigo-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-10 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
            <Link href="/signup/corporate" className="hover:text-white">For organisations</Link>
            <span>·</span>
            <span>{t.group}</span>
          </div>
          <div className="mt-4 flex items-start gap-5">
            <span className="text-6xl">{t.emoji}</span>
            <div>
              <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">
                {t.heroLine}
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-white/80">{t.tagline}</p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {t.selfSignup ? (
              <>
                <Link
                  href={`/auth/register?path=corporate&type=${t.slug}`}
                  className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/40 transition-transform hover:-translate-y-0.5"
                >
                  Get started →
                </Link>
                <Link
                  href="/contact?subject=demo"
                  className="inline-flex items-center gap-1 rounded-xl border border-white/15 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                >
                  Watch demo
                </Link>
              </>
            ) : (
              <Link
                href="/contact?subject=student-institute-invite"
                className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg transition-transform hover:-translate-y-0.5"
              >
                Talk to your institute →
              </Link>
            )}
            <span className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur-sm">
              Recommended tier: <span className="text-emerald-300">{t.tier}</span>
            </span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-16 dark:bg-slate-950">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">What you get</h2>
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {t.features.map((f) => (
              <li key={f} className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-xs font-bold text-white">✓</span>
                <span className="text-sm text-gray-700 dark:text-slate-300">{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Who for */}
      <section className="bg-gray-50 py-14 dark:bg-slate-900">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Who this is for</h2>
          <p className="mt-3 text-lg text-gray-600 dark:text-slate-300">{t.whoFor}</p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-white py-16 dark:bg-slate-950">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-slate-100">
            Ready to onboard your {t.singular.toLowerCase()}?
          </h2>
          <p className="mt-3 text-gray-600 dark:text-slate-300">
            Verification typically takes 24–48 hours. We onboard your team, import your initial data, and stay with you through go-live.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {t.selfSignup && (
              <Link
                href={`/auth/register?path=corporate&type=${t.slug}`}
                className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/40 transition-transform hover:-translate-y-0.5"
              >
                Get started →
              </Link>
            )}
            <Link
              href="/contact?subject=sales"
              className="inline-flex items-center gap-1 rounded-xl border-2 border-indigo-600 px-6 py-3 text-sm font-bold text-indigo-600 transition-colors hover:bg-indigo-50 dark:hover:bg-slate-800"
            >
              Talk to sales
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
