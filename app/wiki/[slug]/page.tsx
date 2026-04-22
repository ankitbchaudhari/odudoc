import Link from "next/link";
import { notFound } from "next/navigation";
import { findArticleBySlug, allArticles, slugify } from "@/lib/wiki-articles";

export function generateStaticParams() {
  return allArticles.map((a) => ({ slug: slugify(a.title) }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const article = findArticleBySlug(params.slug);
  if (!article) return { title: "Article not found — OduDoc Wiki" };
  return {
    title: `${article.title} — OduDoc Health Wiki`,
    description: article.summary,
  };
}

export default function WikiArticlePage({ params }: { params: { slug: string } }) {
  const article = findArticleBySlug(params.slug);
  if (!article) notFound();

  const related = allArticles
    .filter((a) => a.category === article.category && a.title !== article.title)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-700 to-primary-900 py-12 text-white">
        <div className="mx-auto max-w-3xl px-4">
          <Link
            href="/wiki"
            className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-primary-200 hover:text-white"
          >
            <span>←</span> Back to Health Wiki
          </Link>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm`}>
              <span>{article.icon}</span>
              {article.category}
            </span>
            <span className="text-xs text-primary-200">· {article.readTime} read</span>
          </div>
          <h1 className="text-3xl font-bold leading-tight md:text-4xl">{article.title}</h1>
          <p className="mt-3 text-base text-primary-100 md:text-lg">{article.summary}</p>
        </div>
      </section>

      {/* Body */}
      <section className="py-10">
        <div className="mx-auto max-w-3xl px-4">
          {/* Key points card */}
          {article.keyPoints && article.keyPoints.length > 0 && (
            <div className="mb-8 rounded-2xl border border-primary-100 bg-primary-50/50 p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-primary-700">
                <span>✨</span> Key points
              </h2>
              <ul className="space-y-2">
                {article.keyPoints.map((p, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700">
                    <span className="mt-0.5 text-primary-600">•</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Sections */}
          <article className="space-y-8">
            {article.sections.map((s, i) => (
              <section key={i} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-2 text-xl font-bold text-gray-900">{s.heading}</h2>
                <p className="text-sm leading-relaxed text-gray-700">{s.body}</p>
              </section>
            ))}
          </article>

          {/* When to see a doctor */}
          {article.whenToSeeDoctor && article.whenToSeeDoctor.length > 0 && (
            <div className="mt-8 rounded-2xl border border-red-100 bg-red-50/60 p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-red-700">
                <span>⚠️</span> When to see a doctor
              </h2>
              <ul className="space-y-2">
                {article.whenToSeeDoctor.map((p, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700">
                    <span className="mt-0.5 text-red-600">•</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/consult/book"
                  className="rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-700"
                >
                  Book a consultation
                </Link>
                <Link
                  href="/doctors"
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Browse doctors
                </Link>
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="mt-8 rounded-xl border border-gray-200 bg-white p-4 text-xs leading-relaxed text-gray-500">
            <strong className="text-gray-700">Medical Disclaimer:</strong> This article is for educational purposes only
            and is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of
            your physician or qualified health provider.
          </div>

          {/* Related */}
          {related.length > 0 && (
            <div className="mt-10">
              <h2 className="mb-4 text-lg font-bold text-gray-900">Related articles</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((r) => (
                  <Link
                    key={r.title}
                    href={`/wiki/${slugify(r.title)}`}
                    className="group rounded-xl border border-gray-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${r.color}`}>
                        <span>{r.icon}</span>
                        {r.category}
                      </span>
                      <span className="text-[10px] text-gray-400">{r.readTime}</span>
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 group-hover:text-primary-700">{r.title}</h3>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
