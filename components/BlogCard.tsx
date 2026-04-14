import Link from "next/link";
import type { BlogPost } from "@/lib/data";
import { categoryGradients } from "@/lib/data";

export default function BlogCard({ post }: { post: BlogPost }) {
  const gradient = categoryGradients[post.category] || "from-gray-400 to-gray-600";

  return (
    <div className="card group flex flex-col">
      {/* Image placeholder */}
      <div className={`mb-4 h-48 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center`}>
        <span className="text-4xl text-white/70">
          {post.category === "Wellness" && "🌿"}
          {post.category === "Nutrition" && "🥗"}
          {post.category === "Mental Health" && "🧠"}
          {post.category === "Fitness" && "💪"}
          {post.category === "Medical Tips" && "🩺"}
          {post.category === "News" && "📰"}
        </span>
      </div>

      {/* Category badge */}
      <span className="mb-2 inline-block w-fit rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-600">
        {post.category}
      </span>

      {/* Title */}
      <Link href={`/blog/${post.slug}`}>
        <h3 className="mb-2 text-lg font-semibold text-gray-900 transition-colors group-hover:text-primary-600">
          {post.title}
        </h3>
      </Link>

      {/* Excerpt */}
      <p className="mb-4 line-clamp-3 flex-1 text-sm leading-relaxed text-gray-500">
        {post.excerpt}
      </p>

      {/* Author + meta */}
      <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
            {post.authorInitials}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-700">{post.author}</p>
            <p className="text-xs text-gray-400">{post.date}</p>
          </div>
        </div>
        <span className="text-xs text-gray-400">{post.readTime}</span>
      </div>

      {/* Read more */}
      <Link
        href={`/blog/${post.slug}`}
        className="mt-3 text-sm font-semibold text-primary-600 transition-colors hover:text-primary-700"
      >
        Read More &rarr;
      </Link>
    </div>
  );
}
