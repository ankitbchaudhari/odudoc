"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface Review {
  id: string;
  name: string;
  rating: number;
  review: string;
  location: string;
  createdAt: string;
}
interface Summary {
  count: number;
  average: number;
  distribution: Record<"1" | "2" | "3" | "4" | "5", number>;
  published: number;
  pending: number;
}

export default function DoctorReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "5" | "4" | "3" | "2" | "1">("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/doctor/reviews", { cache: "no-store" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        setReviews(data.reviews || []);
        setSummary(data.summary || null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load reviews");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = [...reviews];
    if (filter !== "all") {
      const star = Number(filter);
      list = list.filter((r) => Math.round(r.rating) === star);
    }
    list.sort((a, b) => {
      if (sort === "newest") return b.createdAt.localeCompare(a.createdAt);
      if (sort === "oldest") return a.createdAt.localeCompare(b.createdAt);
      if (sort === "highest") return b.rating - a.rating;
      if (sort === "lowest") return a.rating - b.rating;
      return 0;
    });
    return list;
  }, [reviews, filter, sort]);

  const maxBar = summary
    ? Math.max(1, ...(Object.values(summary.distribution) as number[]))
    : 1;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/dashboard/doctor"
            className="rounded-lg p-2 text-gray-400 dark:text-slate-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-600 dark:text-slate-300"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Patient Reviews</h1>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-slate-400">
              Feedback and ratings from your patients
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center text-sm text-gray-400 dark:text-slate-500 dark:text-slate-400">
            Loading reviews…
          </div>
        ) : summary && summary.count > 0 ? (
          <>
            {/* Summary */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="rounded-2xl border border-gray-100 bg-white dark:bg-slate-900 p-6 shadow-sm md:col-span-1">
                <p className="text-sm text-gray-500 dark:text-slate-400">Overall rating</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-gray-900 dark:text-slate-100">
                    {summary.average.toFixed(1)}
                  </span>
                  <span className="text-sm text-gray-400 dark:text-slate-500 dark:text-slate-400">/ 5.0</span>
                </div>
                <Stars value={summary.average} size="lg" />
                <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                  Based on {summary.count} review{summary.count === 1 ? "" : "s"}
                  {summary.pending > 0 && (
                    <> · <span className="text-amber-600">{summary.pending} awaiting admin approval</span></>
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white dark:bg-slate-900 p-6 shadow-sm md:col-span-2">
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">Rating breakdown</p>
                <div className="mt-4 space-y-2">
                  {([5, 4, 3, 2, 1] as const).map((star) => {
                    const count = summary.distribution[String(star) as "1" | "2" | "3" | "4" | "5"] || 0;
                    const pct = Math.round((count / maxBar) * 100);
                    return (
                      <div key={star} className="flex items-center gap-3 text-sm">
                        <span className="flex w-12 items-center gap-1 text-gray-600 dark:text-slate-300">
                          {star}
                          <svg className="h-3.5 w-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.293z" />
                          </svg>
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-yellow-400 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-xs text-gray-500 dark:text-slate-400">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as typeof filter)}
                className="rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="all">All ratings</option>
                <option value="5">5 stars</option>
                <option value="4">4 stars</option>
                <option value="3">3 stars</option>
                <option value="2">2 stars</option>
                <option value="1">1 star</option>
              </select>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="highest">Highest rating</option>
                <option value="lowest">Lowest rating</option>
              </select>
              <span className="text-xs text-gray-400 dark:text-slate-500 dark:text-slate-400">
                Showing {filtered.length} of {reviews.length}
              </span>
            </div>

            {/* Reviews */}
            <div className="mt-6 space-y-4">
              {filtered.map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl border border-gray-100 bg-white dark:bg-slate-900 p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-sm font-semibold text-primary-700">
                          {r.name
                            .split(/\s+/)
                            .map((w) => w[0])
                            .filter(Boolean)
                            .slice(0, 2)
                            .join("")
                            .toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{r.name}</p>
                          {r.location && (
                            <p className="text-xs text-gray-400 dark:text-slate-500 dark:text-slate-400">{r.location}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Stars value={r.rating} />
                      <p className="mt-1 text-xs text-gray-400 dark:text-slate-500 dark:text-slate-400">
                        {new Date(r.createdAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 whitespace-pre-wrap text-sm text-gray-700 dark:text-slate-300">
                    {r.review}
                  </p>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="rounded-2xl border border-dashed border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center text-sm text-gray-400 dark:text-slate-500 dark:text-slate-400">
                  No reviews match this filter.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-50 text-yellow-600">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">No reviews yet</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              Patients can rate and review you after each completed consultation.
            </p>
            {summary && summary.pending > 0 && (
              <p className="mt-3 text-xs text-amber-600">
                {summary.pending} review{summary.pending === 1 ? " is" : "s are"} awaiting admin approval.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Stars({ value, size = "md" }: { value: number; size?: "md" | "lg" }) {
  const cls = size === "lg" ? "h-5 w-5" : "h-4 w-4";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={`${cls} ${i <= Math.round(value) ? "text-yellow-400" : "text-gray-200"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.293z" />
        </svg>
      ))}
    </div>
  );
}
