"use client";

import { useState } from "react";

interface AdminTestimonial {
  id: string;
  name: string;
  location: string;
  rating: number;
  review: string;
  doctor: string;
  status: "Published" | "Pending";
  date: string;
}

const initialTestimonials: AdminTestimonial[] = [
  { id: "t1", name: "John Smith", location: "New York", rating: 5, review: "Excellent service! Dr. Johnson was very thorough and attentive.", doctor: "Dr. Sarah Johnson", status: "Published", date: "Apr 12, 2026" },
  { id: "t2", name: "Emily Davis", location: "Chicago", rating: 4, review: "Great experience with the online consultation. Very convenient.", doctor: "Dr. Michael Chen", status: "Published", date: "Apr 11, 2026" },
  { id: "t3", name: "Robert Wilson", location: "Houston", rating: 5, review: "The pharmacy delivery was fast and the products were genuine.", doctor: "N/A", status: "Published", date: "Apr 10, 2026" },
  { id: "t4", name: "Maria Garcia", location: "Phoenix", rating: 3, review: "Good service but had to wait a bit for the appointment.", doctor: "Dr. Priya Patel", status: "Pending", date: "Apr 13, 2026" },
  { id: "t5", name: "David Lee", location: "Philadelphia", rating: 5, review: "Dr. Brown is amazing! He explained everything clearly and I felt very comfortable.", doctor: "Dr. David Brown", status: "Pending", date: "Apr 13, 2026" },
  { id: "t6", name: "Anna White", location: "San Antonio", rating: 4, review: "Very professional and the prices are reasonable. Highly recommend.", doctor: "Dr. James Wilson", status: "Published", date: "Apr 09, 2026" },
];

export default function AdminTestimonials() {
  const [testimonials, setTestimonials] = useState(initialTestimonials);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formRating, setFormRating] = useState(5);
  const [formReview, setFormReview] = useState("");
  const [formDoctor, setFormDoctor] = useState("");

  const resetForm = () => {
    setFormName(""); setFormLocation(""); setFormRating(5); setFormReview(""); setFormDoctor(""); setEditingId(null);
  };

  const handleEdit = (t: AdminTestimonial) => {
    setFormName(t.name); setFormLocation(t.location); setFormRating(t.rating);
    setFormReview(t.review); setFormDoctor(t.doctor); setEditingId(t.id); setShowForm(true);
  };

  const handleSave = () => {
    if (!formName || !formReview) return;
    const item: AdminTestimonial = {
      id: editingId || `t${Date.now()}`,
      name: formName,
      location: formLocation,
      rating: formRating,
      review: formReview,
      doctor: formDoctor,
      status: editingId ? testimonials.find((t) => t.id === editingId)?.status || "Pending" : "Pending",
      date: "Apr 13, 2026",
    };
    if (editingId) {
      setTestimonials(testimonials.map((t) => t.id === editingId ? item : t));
    } else {
      setTestimonials([...testimonials, item]);
    }
    setShowForm(false); resetForm();
  };

  const handleApprove = (id: string) => {
    setTestimonials(testimonials.map((t) => t.id === id ? { ...t, status: "Published" } : t));
  };

  const handleReject = (id: string) => {
    setTestimonials(testimonials.filter((t) => t.id !== id));
  };

  const handleDelete = (id: string) => {
    setTestimonials(testimonials.filter((t) => t.id !== id));
  };

  const renderStars = (rating: number, interactive = false) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={interactive ? () => setFormRating(star) : undefined}
          className={interactive ? "cursor-pointer" : "cursor-default"}
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

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Testimonials</h2>
          <p className="mt-1 text-sm text-gray-500">{testimonials.length} testimonials total, {testimonials.filter((t) => t.status === "Pending").length} pending review</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Add Testimonial
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">{editingId ? "Edit Testimonial" : "Add Testimonial"}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Patient Name</label>
              <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500" placeholder="John Doe" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Location</label>
              <input type="text" value={formLocation} onChange={(e) => setFormLocation(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500" placeholder="New York" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Doctor Name</label>
              <input type="text" value={formDoctor} onChange={(e) => setFormDoctor(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500" placeholder="Dr. Sarah Johnson" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Rating</label>
              {renderStars(formRating, true)}
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Review</label>
              <textarea value={formReview} onChange={(e) => setFormReview(e.target.value)} rows={3} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500" placeholder="Write the testimonial review..." />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={handleSave} className="rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700">{editingId ? "Update" : "Save"}</button>
            <button onClick={() => { setShowForm(false); resetForm(); }} className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                <th className="px-4 py-3 font-medium">Patient</th>
                <th className="px-4 py-3 font-medium">Rating</th>
                <th className="px-4 py-3 font-medium">Review</th>
                <th className="px-4 py-3 font-medium">Doctor</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {testimonials.map((t) => (
                <tr key={t.id} className="border-b border-gray-50 transition-colors hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.location}</p>
                  </td>
                  <td className="px-4 py-3">{renderStars(t.rating)}</td>
                  <td className="max-w-xs px-4 py-3 text-gray-600">
                    <p className="line-clamp-2">{t.review}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{t.doctor}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${t.status === "Published" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{t.date}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {t.status === "Pending" && (
                        <>
                          <button onClick={() => handleApprove(t.id)} className="rounded p-1.5 text-gray-400 hover:bg-green-50 hover:text-green-600" title="Approve">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          </button>
                          <button onClick={() => handleReject(t.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Reject">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </>
                      )}
                      <button onClick={() => handleEdit(t)} className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => handleDelete(t.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {testimonials.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">No testimonials found.</div>
        )}
      </div>
    </div>
  );
}
