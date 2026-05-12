import { notFound } from "next/navigation";
import { getPageBySlug } from "@/lib/pages-store";
import { sanitizeUserHtml } from "@/lib/sanitize-html";

export const dynamic = "force-dynamic";

export default async function CmsPageRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  const page = getPageBySlug("/" + decoded);
  if (!page || page.status !== "Published" || !page.isCustom) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-white dark:bg-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-slate-100">{page.title}</h1>
        {page.seoDescription && (
          <p className="mt-3 text-lg text-gray-600 dark:text-slate-300">{page.seoDescription}</p>
        )}
        <div className="mt-4 text-xs text-gray-400 dark:text-slate-500">
          By {page.author} · Updated {page.updatedAt}
        </div>
        <article
          className="prose prose-gray mt-10 max-w-none"
          dangerouslySetInnerHTML={{ __html: sanitizeUserHtml(page.content || "") }}
        />
      </div>
    </main>
  );
}
