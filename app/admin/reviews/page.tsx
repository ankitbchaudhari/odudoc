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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Product Reviews</h1>
        <p className="mt-1 text-sm text-gray-500">Approve, reject or delete customer reviews.</p>
      </div>

      {/* Filter tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(["all", "approved", "pending", "rejected"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${
              filter === f
                ? "bg-primary-600 text-white"
                : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {f} <span className="ml-1 opacity-70">({counts[f]})</span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((r) => (
          <div key={r.id} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-0.5 text-yellow-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg key={i} className={`h-4 w-4 ${i < r.rating ? "" : "opacity-20"}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">{r.title}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                    r.status === "approved" ? "bg-green-50 text-green-700"
                      : r.status === "pending" ? "bg-amber-50 text-amber-700"
                      : "bg-red-50 text-red-700"
                  }`}>{r.status}</span>
                </div>
                <p className="text-xs text-gray-500">
                  <span className="font-medium text-gray-700">{r.author}</span> · {r.email} · {r.date}
                </p>
                <p className="mt-1 text-xs text-primary-600">on: {r.product}</p>
                <p className="mt-2 text-sm text-gray-700">{r.content}</p>
              </div>
              <div className="flex flex-shrink-0 flex-col gap-1.5">
                {r.status !== "approved" && (
                  <button onClick={() => update(r.id, "approved")} className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100">
                    ✓ Approve
                  </button>
                )}
                {r.status !== "rejected" && (
                  <button onClick={() => update(r.id, "rejected")} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100">
                    ✗ Reject
                  </button>
                )}
                <button onClick={() => del(r.id)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center text-sm text-gray-400">
            No reviews in this category.
          </div>
        )}
      </div>
    </div>
  );
}
