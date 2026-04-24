"use client";

import { useEffect, useState, useCallback } from "react";

interface AdminTestimonial {
  id: string;
  name: string;
  email?: string;
  location: string;
  rating: number;
  review: string;
  doctor: string;
  status: "Published" | "Pending";
  createdAt: string;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function AdminTestimonials() {
  const [testimonials, setTestimonials] = useState<AdminTestimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formRating, setFormRating] = useState(5);
  const [formReview, setFormReview] = useState("");
  const [formDoctor, setFormDoctor] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/testimonials?view=admin", { cache: "no-store" });
      if (r.ok) {
        const data = await r.json();
        setTestimonials(data.testimonials || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setFormName("");
    setFormLocation("");
    setFormRating(5);
    setFormReview("");
    setFormDoctor("");
    setEditingId(null);
  };

  const handleEdit = (t: AdminTestimonial) => {
    setFormName(t.name);
    setFormLocation(t.location);
    setFormRating(t.rating);
    setFormReview(t.review);
    setFormDoctor(t.doctor);
    setEditingId(t.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formReview.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await fetch("/api/testimonials", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingId,
            name: formName,
            location: formLocation,
            rating: formRating,
            review: formReview,
            doctor: formDoctor,
          }),
        });
      } else {
        await fetch("/api/testimonials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName,
            location: formLocation,
            rating: formRating,
            review: formReview,
            doctor: formDoctor,
            status: "Published",
          }),
        });
      }
      setShowForm(false);
      resetForm();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    await fetch("/api/testimonials", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    await load();
  };

  const handleApprove = (id: string) => patch(id, { action: "approve" });
  const handleReject = (id: string) => patch(id, { action: "reject" });

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this testimonial? This cannot be undone.")) return;
    await fetch("/api/testimonials", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  };

  const renderStars = (rating: number, interactive = false) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={interactive ? () => setFormRating(star) : undefined}
          className={interactive ? "cursor-pointer" : "cursor-default"}
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
        >
          <svg
            className={`h-5 w-5 ${star <= rating ? "text-yellow-400" : "text-gray-200"}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  );

  const pendingCount = testimonials.filter((t) => t.status === "Pending").length;

  return (
    <div>
      {/* gradient hero */}
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-500 via-amber-500 to-orange-600 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-yellow-200/30 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-200 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-300" />
              </span>
              Patient stories
            </div>
            <h2 className="text-2xl font-bold">Testimonials</h2>
            <p className="mt-1 text-sm text-amber-50/90">
              {testimonials.length} total · {testimonials.filter((t) => t.status === "Published").length} published
              {pendingCount > 0 && ` · ${pendingCount} pending review`}
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-amber-700 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Testimonial
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            {editingId ? "Edit Testimonial" : "Add Testimonial"}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Patient Name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Location</label>
              <input
                type="text"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                placeholder="New York"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Doctor Name</label>
              <input
                type="text"
                value={formDoctor}
                onChange={(e) => setFormDoctor(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                placeholder="Dr. Sarah Johnson (optional)"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Rating</label>
              {renderStars(formRating, true)}
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Review</label>
              <textarea
                value={formReview}
                onChange={(e) => setFormReview(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                placeholder="Write the testimonial review..."
              />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : editingId ? "Update" : "Save"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="h-1 bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500" />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white text-xs font-semibold uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Review</th>
                <th className="px-4 py-3">Doctor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {testimonials.map((t, i) => {
                const palettes = [
                  "from-amber-400 to-orange-500",
                  "from-rose-400 to-pink-500",
                  "from-emerald-400 to-teal-500",
                  "from-sky-400 to-blue-500",
                  "from-violet-400 to-fuchsia-500",
                  "from-indigo-400 to-violet-500",
                ];
                const grad = palettes[i % palettes.length];
                const initials = (t.name || "?").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
                return (
                <tr key={t.id} className="border-b border-gray-50 transition-colors hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${grad} text-xs font-bold text-white shadow-sm ring-2 ring-white`}>
                        {initials}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{t.name}</p>
                        <p className="text-xs text-gray-400">{t.location}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{renderStars(t.rating)}</td>
                  <td className="max-w-xs px-4 py-3 text-gray-600">
                    <p className="line-clamp-2">{t.review}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{t.doctor || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
                        t.status === "Published"
                          ? "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 ring-emerald-200"
                          : "bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 ring-amber-200"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${t.status === "Published" ? "bg-emerald-500" : "bg-amber-500"}`} />
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(t.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {t.status === "Pending" ? (
                        <button
                          onClick={() => handleApprove(t.id)}
                          className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600 ring-1 ring-emerald-100 transition hover:-translate-y-0.5 hover:bg-emerald-100"
                          title="Publish"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReject(t.id)}
                          className="rounded-lg bg-amber-50 p-1.5 text-amber-600 ring-1 ring-amber-100 transition hover:-translate-y-0.5 hover:bg-amber-100"
                          title="Unpublish"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(t)}
                        className="rounded-lg bg-blue-50 p-1.5 text-blue-600 ring-1 ring-blue-100 transition hover:-translate-y-0.5 hover:bg-blue-100"
                        title="Edit"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="rounded-lg bg-red-50 p-1.5 text-red-600 ring-1 ring-red-100 transition hover:-translate-y-0.5 hover:bg-red-100"
                        title="Delete"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
        {!loading && testimonials.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">No testimonials yet.</div>
        )}
        {loading && <div className="py-12 text-center text-sm text-gray-400">Loading…</div>}
      </div>
    </div>
  );
}
