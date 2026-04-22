import Link from "next/link";
import type { AdminBlogPost } from "@/lib/blog-store";

// Compact "Related reading" block for SEO landing pages. Hides itself if
// no matching posts exist — keeps pages clean on fresh deploys.

export default function RelatedReading({
  posts,
  heading = "Related reading",
}: {
  posts: AdminBlogPost[];
  heading?: string;
}) {
  if (!posts.length) return null;
  return (
    <section className="py-14">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-gray-900">{heading}</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              className="group rounded-2xl border border-gray-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-primary-400 hover:shadow-md"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-primary-600">
                {p.category}
              </p>
              <h3 className="mt-2 text-base font-bold text-gray-900 group-hover:text-primary-700">
                {p.title}
              </h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed line-clamp-3">
                {p.excerpt}
              </p>
              <p className="mt-3 text-xs text-gray-400">{p.readTime}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
