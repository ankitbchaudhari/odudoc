"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import BlogCard from "@/components/BlogCard";
import NewsletterSignup from "@/components/NewsletterSignup";
import RelativeTime from "@/components/RelativeTime";
import {
  blogPosts as seedBlogPosts,
  blogCategories,
  categoryGradients,
  type BlogPost,
} from "@/lib/data";

const POSTS_PER_PAGE = 6;

const categoryIcons: Record<string, string> = {
  Wellness: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
  Nutrition: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z",
  "Mental Health": "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  Fitness: "M13 10V3L4 14h7v7l9-11h-7z",
  "Medical Tips": "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
  News: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z",
};

export default function BlogClient({ initialPosts }: { initialPosts: BlogPost[] }) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  // Hydrate with server-provided posts (falls back to the static seed if the
  // server couldn't reach the database) then re-fetch in the background in
  // case the admin published something between the server render and mount.
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>(
    initialPosts && initialPosts.length ? initialPosts : seedBlogPosts
  );

  useEffect(() => {
    let alive = true;
    fetch("/api/blog", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (alive && Array.isArray(data.posts) && data.posts.length) {
          setBlogPosts(data.posts);
        }
      })
      .catch(() => {
        /* keep current list on error */
      });
    return () => {
      alive = false;
    };
  }, []);

  // Featured hero: prefer the newest post with featured=true, otherwise
  // fall back to the first post in the list so the hero never disappears.
  // IMPORTANT: we do NOT exclude the featured post from the grid — every
  // post in state shows up in the grid. Any exclusion here risks emptying
  // the grid when the DB is in an unexpected shape (e.g. all posts flagged
  // featured, duplicated ids, etc.), which is what caused the "No articles
  // found" regression in production.
  const featuredPost = blogPosts.find((p) => p.featured) || blogPosts[0];

  const filteredPosts = useMemo(() => {
    return blogPosts
      .filter((p) => activeCategory === "All" || p.category === activeCategory)
      .filter(
        (p) =>
          searchQuery === "" ||
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (Array.isArray(p.tags) &&
            p.tags.some((t) =>
              (t || "").toLowerCase().includes(searchQuery.toLowerCase())
            ))
      );
  }, [activeCategory, searchQuery, blogPosts]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE
  );

  const popularPosts = [...blogPosts].sort(() => 0).slice(0, 5);
  const allTags = Array.from(new Set(blogPosts.flatMap((p) => p.tags)));

  const categoryCounts = blogCategories
    .filter((c) => c !== "All")
    .map((c) => ({
      name: c,
      count: blogPosts.filter((p) => p.category === c).length,
    }));

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setCurrentPage(1);
  };

  const featuredGradient = featuredPost
    ? categoryGradients[featuredPost.category] || "from-primary-500 to-teal-600"
    : "from-primary-500 to-teal-600";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-primary-700 via-primary-600 to-teal-600 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <span className="mb-3 inline-block rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest">
            OduDoc Health Blog
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Health Insights &{" "}
            <span className="text-primary-200">Medical Advice</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-100">
            Expert health tips, wellness guides, and medical advice written by qualified doctors.
          </p>
          {/* Search bar in hero */}
          <div className="mx-auto mt-8 max-w-lg">
            <div className="relative">
              <svg
                className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Search articles, topics, or tags..."
                className="w-full rounded-xl border-0 bg-white py-3.5 pl-12 pr-4 text-sm text-gray-900 shadow-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">

        {/* ── Featured Post ── */}
        {featuredPost && (
          <div className="mb-10">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary-600">
              <span className="h-px flex-1 bg-primary-100" />
              Featured Article
              <span className="h-px flex-1 bg-primary-100" />
            </h2>
            <Link href={`/blog/${featuredPost.slug}`} className="group block">
              <div className="overflow-hidden rounded-2xl bg-white shadow-md transition-all duration-300 hover:shadow-xl md:flex">
                {/* Image */}
                <div className={`relative h-64 flex-shrink-0 overflow-hidden bg-gradient-to-br ${featuredGradient} md:h-auto md:w-2/5`}>
                  {featuredPost.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={featuredPost.imageUrl}
                      alt={featuredPost.title}
                      loading="eager"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/20 backdrop-blur-sm">
                        <svg className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d={categoryIcons[featuredPost.category] || categoryIcons["Medical Tips"]} />
                        </svg>
                      </div>
                    </div>
                  )}
                  {featuredPost.imageUrl && (
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />
                  )}
                  <span className="absolute left-5 top-5 rounded-full bg-black/40 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                    ⭐ Featured · {featuredPost.category}
                  </span>
                </div>
                {/* Text */}
                <div className="flex flex-col justify-center p-7 md:w-3/5">
                  <h2 className="mb-3 text-2xl font-extrabold text-gray-900 transition-colors group-hover:text-primary-600 md:text-3xl">
                    {featuredPost.title}
                  </h2>
                  <p className="mb-5 line-clamp-3 text-gray-500">{featuredPost.excerpt}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                        {featuredPost.authorInitials}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{featuredPost.author}</p>
                        <p className="text-xs text-gray-400">
                          <RelativeTime date={featuredPost.createdAt || featuredPost.date} fallback={featuredPost.date} />
                          {" · "}
                          {featuredPost.readTime}
                        </p>
                      </div>
                    </div>
                    <span className="hidden rounded-lg bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700 transition-colors group-hover:bg-primary-600 group-hover:text-white sm:block">
                      Read Article →
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* ── Main Content + Sidebar ── */}
        <div className="flex flex-col gap-8 lg:flex-row">

          {/* Left: Posts */}
          <div className="flex-1 min-w-0">
            {/* Category Tabs */}
            <div className="mb-6 flex flex-wrap gap-2">
              {blogCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    activeCategory === cat
                      ? "bg-primary-600 text-white shadow-md"
                      : "bg-white text-gray-600 shadow-sm hover:bg-primary-50 hover:text-primary-700"
                  }`}
                >
                  {cat !== "All" && categoryIcons[cat] && (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={categoryIcons[cat]} />
                    </svg>
                  )}
                  {cat}
                  <span className={`rounded-full px-1.5 py-0.5 text-xs ${
                    activeCategory === cat ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                  }`}>
                    {cat === "All" ? blogPosts.length : blogPosts.filter(p => p.category === cat).length}
                  </span>
                </button>
              ))}
            </div>

            {/* Results info */}
            {searchQuery && (
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {filteredPosts.length} result{filteredPosts.length !== 1 ? "s" : ""} for{" "}
                  <span className="font-semibold text-gray-800">&quot;{searchQuery}&quot;</span>
                </p>
                <button
                  onClick={() => { setSearchQuery(""); setCurrentPage(1); }}
                  className="text-xs text-primary-600 hover:text-primary-700"
                >
                  Clear search ✕
                </button>
              </div>
            )}

            {/* Blog Grid */}
            {paginatedPosts.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {paginatedPosts.map((post) => (
                  <BlogCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl bg-white py-20 text-center shadow-sm">
                <svg className="mx-auto mb-4 h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg font-semibold text-gray-700">No articles found</p>
                <p className="mt-1 text-sm text-gray-400">Try a different category or search term.</p>
                <button
                  onClick={() => { setActiveCategory("All"); setSearchQuery(""); setCurrentPage(1); }}
                  className="mt-4 rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:bg-primary-700"
                >
                  Show all posts
                </button>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`h-10 w-10 rounded-lg text-sm font-semibold shadow-sm transition-all ${
                      currentPage === page
                        ? "bg-primary-600 text-white"
                        : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <aside className="w-full shrink-0 space-y-6 lg:w-72">

            {/* Popular Posts */}
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-500">
                <svg className="h-4 w-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Popular Posts
              </h3>
              <div className="space-y-4">
                {popularPosts.map((post, i) => (
                  <Link key={post.id} href={`/blog/${post.slug}`} className="group flex items-start gap-3">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-primary-50 text-xs font-bold text-primary-600">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-medium text-gray-700 transition-colors group-hover:text-primary-600">
                        {post.title}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">{post.readTime} · {post.category}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-500">
                <svg className="h-4 w-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Categories
              </h3>
              <div className="space-y-1.5">
                {categoryCounts.map((cat) => {
                  const icon = categoryIcons[cat.name];
                  return (
                    <button
                      key={cat.name}
                      onClick={() => handleCategoryChange(cat.name)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        activeCategory === cat.name
                          ? "bg-primary-50 font-semibold text-primary-700"
                          : "text-gray-600 hover:bg-gray-50 hover:text-primary-600"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {icon && (
                          <svg className="h-4 w-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
                          </svg>
                        )}
                        {cat.name}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                        {cat.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Newsletter */}
            <NewsletterSignup />

            {/* Tags */}
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-500">
                <svg className="h-4 w-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => { setSearchQuery(tag); setCurrentPage(1); }}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      searchQuery === tag
                        ? "border-primary-400 bg-primary-50 text-primary-700"
                        : "border-gray-200 text-gray-500 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600"
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
