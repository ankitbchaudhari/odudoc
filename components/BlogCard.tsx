import Link from "next/link";
import type { BlogPost } from "@/lib/data";
import { categoryGradients } from "@/lib/data";
import RelativeTime from "@/components/RelativeTime";

const categoryIcons: Record<string, string> = {
  Wellness: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
  Nutrition: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z",
  "Mental Health": "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  Fitness: "M13 10V3L4 14h7v7l9-11h-7z",
  "Medical Tips": "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
  News: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z",
};

export default function BlogCard({ post }: { post: BlogPost }) {
  const gradient = categoryGradients[post.category] || "from-gray-400 to-gray-600";
  const icon = categoryIcons[post.category] || categoryIcons["Medical Tips"];

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
      {/* Thumbnail */}
      <Link href={`/blog/${post.slug}`} className="block">
        <div className={`relative h-48 overflow-hidden bg-gradient-to-br ${gradient}`}>
          {post.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.imageUrl}
              alt={post.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
                </svg>
              </div>
            </div>
          )}
          {/* Dark gradient overlay for badge legibility on photos */}
          {post.imageUrl && (
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
          )}
          {/* Category badge */}
          <span className="absolute left-4 top-4 rounded-full bg-black/40 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            {post.category}
          </span>
          {/* Read time badge */}
          <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-xs text-white backdrop-blur-sm">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {post.readTime}
          </span>
        </div>
      </Link>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <Link href={`/blog/${post.slug}`}>
          <h3 className="mb-2 line-clamp-2 text-base font-bold text-gray-900 transition-colors group-hover:text-primary-600">
            {post.title}
          </h3>
        </Link>
        <p className="mb-4 line-clamp-2 flex-1 text-sm leading-relaxed text-gray-500">
          {post.excerpt}
        </p>

        {/* Author + Read more */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
              {post.authorInitials}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700">{post.author}</p>
              <p className="text-xs text-gray-400">
                <RelativeTime date={post.createdAt || post.date} fallback={post.date} />
              </p>
            </div>
          </div>
          <Link
            href={`/blog/${post.slug}`}
            className="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700"
          >
            Read
            <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </article>
  );
}
