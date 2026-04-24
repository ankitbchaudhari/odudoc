"use client";

import { useState } from "react";

interface Review {
  id: string;
  product: string;
  author: string;
  email: string;
  rating: number;
  title: string;
  content: string;
  date: string;
  status: "approved" | "pending" | "rejected";
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([
    { id: "1", product: "Vitamin C 1000mg", author: "Sarah Mitchell", email: "sarah.m@example.com", rating: 5, title: "Great quality", content: "I've been taking these for 3 months and my energy levels are much better. Highly recommend.", date: "2026-04-14", status: "approved" },
    { id: "2", product: "Digital BP Monitor", author: "Mark Johnson", email: "mark.j@example.com", rating: 4, title: "Accurate and easy", content: "Compared readings with my doctor's office — within 2 points. Good value.", date: "2026-04-13", status: "approved" },
    { id: "3", product: "Paracetamol 500mg", author: "Priya S.", email: "priya.s@example.com", rating: 2, title: "Packaging damaged", content: "The box arrived crushed and blister pack was torn. Product itself seems fine but disappointing.", date: "2026-04-13", status: "pending" },
    { id: "4", product: "Glucose Test Strips (50ct)", author: "David Chen", email: "dchen@example.com", rating: 5, title: "Works with my meter", content: "Perfect compatibility with Accu-Chek. Fast shipping.", date: "2026-04-12", status: "approved" },
    { id: "5", product: "Multivitamin Gummies", author: "Emma Rodriguez", email: "emma.r@example.com", rating: 3, title: "Taste ok", content: "Kids like the flavor but they're a bit too sweet for my taste. Nutritional content is good though.", date: "2026-04-11", status: "pending" },
    { id: "6", product: "N95 Mask (10 pack)", author: "James Wilson", email: "jw@example.com", rating: 1, title: "Not genuine", content: "These don't seem to be real N95. No NIOSH label. Reporting.", date: "2026-04-10", status: "rejected" },
    { id: "7", product: "Electric Toothbrush", author: "Lisa Park", email: "lisa.p@example.com", rating: 5, title: "Game changer", content: "Dentist noticed cleaner teeth after 6 weeks. Battery lasts 2 weeks on single charge.", date: "2026-04-09", status: "approved" },
  ]);
  const [filter, setFilter] = useState<"all" | "approved" | "pending" | "rejected">("all");

  const filtered = filter === "all" ? reviews : reviews.filter((r) => r.status === filter);
  const counts = {
    all: reviews.length,
    approved: reviews.filter((r) => r.status === "approved").length,
    pending: reviews.filter((r) => r.status === "pending").length,
    rejected: reviews.filter((r) => r.status === "rejected").length,
  };

  const update = (id: string, status: Review["status"]) => {
    setReviews(reviews.map((r) => (r.id === id ? { ...r, status } : r)));
  };
  const del = (id: string) => {
    if (!confirm("Delete this review?")) return;
    setReviews(reviews.filter((r) => r.id !== id));
  };

  const filterThemes: Record<typeof filter, string> = {
    all: "from-slate-500 to-gray-600",
    approved: "from-emerald-500 to-green-600",
    pending: "from-amber-500 to-orange-600",
    rejected: "from-rose-500 to-red-600",
  };
  const statusPill: Record<Review["status"], { pill: string; dot: string }> = {
    approved: { pill: "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
    pending: { pill: "bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" },
    rejected: { pill: "bg-gradient-to-r from-rose-50 to-red-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" },
  };

  return (
    <div>
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-yellow-300/20 blur-3xl" />
        <div className="relative">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-300 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-400" />
            </span>
            {counts.pending} pending moderation
          </div>
          <h1 className="text-2xl font-bold">Product Reviews</h1>
          <p className="mt-1 text-sm text-orange-50/90">Approve, reject or delete customer reviews.</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(["all", "approved", "pending", "rejected"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition hover:-translate-y-0.5 ${
              filter === f
                ? `bg-gradient-to-r ${filterThemes[f]} text-white shadow-md`
                : "bg-white text-gray-700 ring-1 ring-gray-200 hover:shadow"
            }`}
          >
            {f} <span className="ml-1 opacity-70">({counts[f]})</span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((r, i) => {
          const accents = [
            "from-amber-400 to-orange-500",
            "from-rose-400 to-pink-500",
            "from-violet-400 to-purple-500",
            "from-sky-400 to-blue-500",
            "from-emerald-400 to-teal-500",
          ];
          const accent = accents[i % accents.length];
          const s = statusPill[r.status];
          return (
            <div key={r.id} className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100 transition hover:shadow-md">
              <div className={`h-1 bg-gradient-to-r ${accent}`} />
              <div className="flex items-start justify-between gap-4 p-5">
                <div className="flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-0.5 text-amber-400">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <svg key={idx} className={`h-4 w-4 ${idx < r.rating ? "" : "opacity-20"}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <h3 className="text-sm font-bold text-gray-900">{r.title}</h3>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ${s.pill}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                      {r.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    <span className="font-medium text-gray-700">{r.author}</span> · {r.email} · {r.date}
                  </p>
                  <p className="mt-1 text-xs font-medium text-indigo-600">on: {r.product}</p>
                  <p className="mt-2 text-sm text-gray-700">{r.content}</p>
                </div>
                <div className="flex flex-shrink-0 flex-col gap-1.5">
                  {r.status !== "approved" && (
                    <button onClick={() => update(r.id, "approved")} className="rounded-lg bg-gradient-to-r from-emerald-50 to-green-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 transition hover:-translate-y-0.5 hover:shadow">
                      ✓ Approve
                    </button>
                  )}
                  {r.status !== "rejected" && (
                    <button onClick={() => update(r.id, "rejected")} className="rounded-lg bg-gradient-to-r from-rose-50 to-red-50 px-3 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200 transition hover:-translate-y-0.5 hover:shadow">
                      ✗ Reject
                    </button>
                  )}
                  <button onClick={() => del(r.id)} className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 ring-1 ring-gray-200 transition hover:-translate-y-0.5 hover:bg-gray-50 hover:shadow">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center text-sm text-gray-400">
            💬 No reviews in this category.
          </div>
        )}
      </div>
    </div>
  );
}
