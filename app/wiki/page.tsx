"use client";

import { useState } from "react";
import Link from "next/link";
import { wikiCategories, allArticles, slugify } from "@/lib/wiki-articles";

export default function WikiPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const filtered = allArticles.filter((a) => {
    const matchCategory = activeCategory === "all" || a.category === activeCategory;
    const matchSearch =
      !search.trim() ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.summary.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-700 to-primary-900 py-14 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="text-3xl font-bold md:text-4xl">OduDoc Health Wiki</h1>
          <p className="mt-3 text-base text-primary-100 md:text-lg">
            Trusted, doctor-reviewed health information for everyone
          </p>
          <div className="relative mt-6 mx-auto max-w-xl">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conditions, medications, wellness topics..."
              className="w-full rounded-xl border-0 bg-white/10 px-5 py-3.5 text-white placeholder-white/60 backdrop-blur-sm outline-none focus:ring-2 focus:ring-white/30"
            />
            <svg className="absolute right-4 top-3.5 h-5 w-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </section>

      {/* Category filters — sticky */}
      <section className="sticky top-16 z-20 border-b border-gray-200 dark:border-slate-800 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 py-3">
          <button
            onClick={() => setActiveCategory("all")}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeCategory === "all" ? "bg-primary-600 text-white shadow-sm" : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200"}`}
          >
            All Topics
          </button>
          {wikiCategories.map((c) => (
            <button
              key={c.name}
              onClick={() => setActiveCategory(c.name)}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeCategory === c.name ? "bg-primary-600 text-white shadow-sm" : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200"}`}
            >
              <span className="mr-1">{c.icon}</span>
              {c.name}
            </button>
          ))}
        </div>
      </section>

      {/* Articles */}
      <section className="py-8">
        <div className="mx-auto max-w-5xl px-4">
          <div className="mb-5 flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-slate-300">
              <span className="font-semibold text-gray-900 dark:text-slate-100">{filtered.length}</span> article{filtered.length === 1 ? "" : "s"}
              {activeCategory !== "all" && (
                <span className="ml-1 text-gray-500 dark:text-slate-400">in {activeCategory}</span>
              )}
            </p>
            {activeCategory !== "all" && (
              <button
                onClick={() => setActiveCategory("all")}
                className="text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                Clear filter
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-16 text-center">
              <div className="mb-3 text-4xl">🔍</div>
              <p className="font-medium text-gray-700 dark:text-slate-300">No articles match your search</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Try different keywords or clear filters.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((a) => (
                <Link
                  key={a.title}
                  href={`/wiki/${slugify(a.title)}`}
                  className="group flex flex-col rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-lg"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${a.color}`}>
                      <span>{a.icon}</span>
                      {a.category}
                    </span>
                    <span className="text-[11px] text-gray-400 dark:text-slate-500">{a.readTime}</span>
                  </div>
                  <h3 className="mb-1.5 text-base font-bold leading-snug text-gray-900 dark:text-slate-100 group-hover:text-primary-700">
                    {a.title}
                  </h3>
                  <p className="mb-4 flex-1 text-sm leading-relaxed text-gray-600 dark:text-slate-300 line-clamp-3">
                    {a.summary}
                  </p>
                  <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-xs font-medium text-primary-600">
                    <span>Read article</span>
                    <span className="transition-transform group-hover:translate-x-1">→</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Disclaimer */}
      <section className="border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-10">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <p className="text-xs leading-relaxed text-gray-500 dark:text-slate-400">
            <strong className="text-gray-700 dark:text-slate-300">Medical Disclaimer:</strong> The information provided here is for educational
            purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the
            advice of your physician or qualified health provider.
          </p>
        </div>
      </section>
    </div>
  );
}
