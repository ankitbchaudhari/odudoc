"use client";

import { useEffect, useState } from "react";
import TestimonialCard from "@/components/TestimonialCard";
import type { Testimonial } from "@/lib/data";

export default function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    location: "",
    doctor: "",
    rating: 5,
    review: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const r = await fetch("/api/testimonials", { cache: "no-store" });
      if (!r.ok) return;
      const data = await r.json();
      setTestimonials(data.testimonials || []);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    load();
  }, []);

  const avgRating =
    testimonials.length > 0
      ? (testimonials.reduce((s, t) => s + t.rating, 0) / testimonials.length).toFixed(1)
      : "—";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const r = await fetch("/api/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit");
      }
      setSubmitted(true);
      setFormData({ name: "", email: "", location: "", doctor: "", rating: 5, review: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-50 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 md:text-4xl">
            What Our <span className="text-primary-600">Patients Say</span>
          </h1>
          <p className="mt-3 text-gray-500">Real experiences from real patients</p>
        </div>

        {/* Stats bar */}
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-6 text-center shadow-sm">
            <p className="text-3xl font-bold text-primary-600">{avgRating}{avgRating !== "—" ? "/5" : ""}</p>
            <div className="mt-1 flex justify-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg
                  key={i}
                  className={`h-4 w-4 ${
                    i < Math.round(Number(avgRating) || 0) ? "text-yellow-400" : "text-gray-200"
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <p className="mt-1 text-sm text-gray-500">Average Rating</p>
          </div>
          <div className="rounded-xl bg-white p-6 text-center shadow-sm">
            <p className="text-3xl font-bold text-primary-600">{testimonials.length}</p>
            <p className="mt-1 text-sm text-gray-500">Total Reviews</p>
          </div>
          <div className="rounded-xl bg-white p-6 text-center shadow-sm">
            <p className="text-3xl font-bold text-primary-600">
              {testimonials.length
                ? `${Math.round(
                    (testimonials.filter((t) => t.rating >= 4).length / testimonials.length) * 100
                  )}%`
                : "—"}
            </p>
            <p className="mt-1 text-sm text-gray-500">Would Recommend</p>
          </div>
        </div>

        {/* Testimonials grid */}
        {testimonials.length > 0 ? (
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t) => (
              <TestimonialCard key={t.id} t={t} />
            ))}
          </div>
        ) : (
          <div className="mt-12 rounded-xl bg-white p-12 text-center text-sm text-gray-400 shadow-sm">
            Be the first to share your experience below.
          </div>
        )}

        {/* Share experience form */}
        <div className="mt-16 rounded-xl bg-white p-8 shadow-md">
          <h2 className="text-center text-2xl font-bold text-gray-900">Share Your Experience</h2>
          <p className="mt-2 text-center text-sm text-gray-500">
            Your feedback helps us improve and helps others make informed decisions. Submissions are
            reviewed before being published.
          </p>

          {submitted ? (
            <div className="mt-8 flex flex-col items-center py-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
                &#10003;
              </div>
              <h3 className="text-xl font-bold text-gray-900">Thank You!</h3>
              <p className="mt-2 text-gray-500">
                Your review has been submitted and will be published after admin review.
              </p>
              <button onClick={() => setSubmitted(false)} className="btn-primary mt-6">
                Submit Another Review
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mx-auto mt-8 max-w-2xl space-y-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Your name"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Email Address</label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="your@email.com"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="City, State"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Doctor (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.doctor}
                    onChange={(e) => setFormData({ ...formData, doctor: e.target.value })}
                    placeholder="Dr. Name"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormData({ ...formData, rating: star })}
                      className="focus:outline-none"
                      aria-label={`${star} star${star > 1 ? "s" : ""}`}
                    >
                      <svg
                        className={`h-8 w-8 transition-colors ${
                          star <= formData.rating ? "text-yellow-400" : "text-gray-300"
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Your Review</label>
                <textarea
                  required
                  rows={4}
                  value={formData.review}
                  onChange={(e) => setFormData({ ...formData, review: e.target.value })}
                  placeholder="Tell us about your experience..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
              </div>

              {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              )}

              <div className="text-center">
                <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
                  {submitting ? "Submitting…" : "Submit Review"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
