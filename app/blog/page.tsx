"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import BlogCard from "@/components/BlogCard";
import NewsletterSignup from "@/components/NewsletterSignup";
import { blogPosts, blogCategories, categoryGradients } from "@/lib/data";

const POSTS_PER_PAGE = 4;

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const featuredPost = blogPosts.find((p) => p.featured);

  const filteredPosts = useMemo(() => {
    return blogPosts
      .filter((p) => !p.featured)
      .filter((p) => activeCategory === "All" || p.category === activeCategory)
      .filter(
        (p) =>
          searchQuery === "" ||
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
      );
  }, [activeCategory, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE
  );

  const popularPosts = blogPosts.slice(0, 5);

  const categoryCounts = blogCategories
    .filter((c) => c !== "All")
    .map((c) => ({
      name: c,
      count: blogPosts.filter((p) => p.category === c).length,
    }));

  const allTags = Array.from(new Set(blogPosts.flatMap((p) => p.tags)));

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setCurrentPage(1);
  };

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-50 via-white to-teal-50 py-16">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            Health Blog & <span className="text-primary-600">Articles</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500">
            Expert health insights, wellness tips, and medical advice from our team of qualified healthcare professionals.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Featured Article */}
        {featuredPost && (
          <Link href={`/blog/${featuredPost.slug}`} className="group mb-12 block">
            <div className="card overflow-hidden !p-0 md:flex">
              <div
                className={`flex h-64 items-center justify-center bg-gradient-to-br ${
                  categoryGradients[featuredPost.category] || "from-gray-400 to-gray-600"
                } md:h-auto md:w-1/2`}
              >
                <span className="text-6xl text-white/60">🌿</span>
              </div>
              <div className="flex flex-col justify-center p-6 md:w-1/2 md:p-8">
                <span className="mb-2 inline-block w-fit rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-600">
                  Featured &middot; {featuredPost.category}
                </span>
                <h2 className="mb-3 text-2xl font-bold text-gray-900 transition-colors group-hover:text-primary-600 md:text-3xl">
                  {featuredPost.title}
                </h2>
                <p className="mb-4 text-gray-500">{featuredPost.excerpt}</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                    {featuredPost.authorInitials}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">{featuredPost.author}</p>
                    <p className="text-xs text-gray-400">
                      {featuredPost.date} &middot; {featuredPost.readTime}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Category Tabs + Search */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {blogCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  activeCategory === cat
                    ? "bg-primary-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search articles..."
              className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-100 md:w-64"
            />
          </div>
        </div>

        {/* Main Content + Sidebar */}
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Blog Grid */}
          <div className="flex-1">
            {paginatedPosts.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {paginatedPosts.map((post) => (
                  <BlogCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-gray-50 py-16 text-center">
                <p className="text-lg font-medium text-gray-500">No articles found</p>
                <p className="mt-1 text-sm text-gray-400">Try a different category or search term.</p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`h-10 w-10 rounded-lg text-sm font-medium transition-all ${
                      currentPage === page
                        ? "bg-primary-600 text-white shadow-md"
                        : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-full shrink-0 space-y-6 lg:w-80">
            {/* Popular Posts */}
            <div className="rounded-xl bg-white p-6 shadow-md">
              <h3 className="mb-4 text-lg font-bold text-gray-900">Popular Posts</h3>
              <div className="space-y-4">
                {popularPosts.map((post, i) => (
                  <Link
                    key={post.id}
                    href={`/blog/${post.slug}`}
                    className="group flex items-start gap-3"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-700 transition-colors group-hover:text-primary-600">
                        {post.title}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">{post.readTime}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div className="rounded-xl bg-white p-6 shadow-md">
              <h3 className="mb-4 text-lg font-bold text-gray-900">Categories</h3>
              <div className="space-y-2">
                {categoryCounts.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => handleCategoryChange(cat.name)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-primary-600"
                  >
                    <span>{cat.name}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                      {cat.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Newsletter */}
            <NewsletterSignup />

            {/* Tags */}
            <div className="rounded-xl bg-white p-6 shadow-md">
              <h3 className="mb-4 text-lg font-bold text-gray-900">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      setSearchQuery(tag);
                      setCurrentPage(1);
                    }}
                    className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-500 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
