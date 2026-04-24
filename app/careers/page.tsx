"use client";

import { useEffect, useState } from "react";
import type { JobVacancy } from "@/lib/careers-store";

export default function CareersPage() {
  const [jobs, setJobs] = useState<JobVacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobVacancy | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formJobId, setFormJobId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/careers/jobs")
      .then((r) => r.json())
      .then((data) => {
        setJobs(data.jobs || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const openApply = (jobId: string | null) => {
    setFormJobId(jobId);
    setShowForm(true);
    setSelectedJob(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 py-20 text-white">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <span className="inline-block rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider">
            Careers
          </span>
          <h1 className="mt-4 text-4xl font-bold md:text-5xl">Join the OduDoc team</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            We are building the future of healthcare. If you are a doctor, engineer, designer,
            or operator passionate about patient care — we want to hear from you.
          </p>
          <button
            onClick={() => openApply(null)}
            className="mt-8 inline-block rounded-lg bg-white px-6 py-3 text-sm font-semibold text-primary-700 transition-colors hover:bg-gray-100"
          >
            Send General Application
          </button>
        </div>
      </section>

      {/* Vacancies */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-gray-900">Open Positions</h2>
          <p className="mt-2 text-gray-500">Current vacancies at OduDoc</p>
        </div>

        {loading ? (
          <p className="text-center text-gray-500">Loading...</p>
        ) : jobs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <p className="text-gray-500">No open positions right now.</p>
            <p className="mt-1 text-sm text-gray-400">
              You can still send a general application and we will reach out when something opens.
            </p>
            <button
              onClick={() => openApply(null)}
              className="btn-primary mt-6"
            >
              Send General Application
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="flex flex-col gap-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="inline-block rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
                      {job.department}
                    </span>
                    <span className="inline-block rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
                      {job.employmentType}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{job.title}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {job.location}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedJob(job)}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => openApply(job.id)}
                    className="btn-primary !px-5 !py-2 !text-sm"
                  >
                    Apply
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Details Modal */}
      {selectedJob && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedJob(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-8 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <span className="inline-block rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
                  {selectedJob.department}
                </span>
                <h2 className="mt-2 text-2xl font-bold text-gray-900">{selectedJob.title}</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedJob.location} · {selectedJob.employmentType}
                </p>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-gray-600">{selectedJob.description}</p>

            <h4 className="mt-6 text-sm font-bold uppercase text-gray-500">Responsibilities</h4>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-600">
              {selectedJob.responsibilities.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>

            <h4 className="mt-6 text-sm font-bold uppercase text-gray-500">Requirements</h4>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-600">
              {selectedJob.requirements.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>

            <button
              onClick={() => openApply(selectedJob.id)}
              className="btn-primary mt-8 w-full"
            >
              Apply for this role
            </button>
          </div>
        </div>
      )}

      {/* Application Form Modal */}
      {showForm && (
        <ApplicationForm
          jobId={formJobId}
          jobTitle={formJobId ? jobs.find((j) => j.id === formJobId)?.title : undefined}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

function ApplicationForm({
  jobId,
  jobTitle,
  onClose,
}: {
  jobId: string | null;
  jobTitle?: string;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    coverLetter: "",
  });
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("CV must be under 5MB");
      return;
    }
    setError("");
    setCvFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cvFile) {
      setError("Please upload your CV");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("firstName", form.firstName);
      fd.append("lastName", form.lastName);
      fd.append("email", form.email);
      fd.append("phone", form.phone);
      fd.append("coverLetter", form.coverLetter);
      if (jobId) fd.append("jobId", jobId);
      fd.append("cv", cvFile, cvFile.name);

      const res = await fetch("/api/careers/applications", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error || "Submission failed");
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {success ? (
          <div className="py-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="mt-4 text-xl font-bold text-gray-900">Application Sent!</h3>
            <p className="mt-2 text-sm text-gray-500">
              Thanks for applying. Our team will review and reach out within 5-7 business days.
            </p>
            <button onClick={onClose} className="btn-primary mt-6 w-full">
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {jobTitle ? `Apply: ${jobTitle}` : "General Application"}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Fill in the details below. We will get back to you soon.
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    First Name *
                  </label>
                  <input
                    required
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Last Name *
                  </label>
                  <input
                    required
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Contact Number *
                </label>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+1 555 000 0000"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Upload CV / Resume *
                </label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-sm text-gray-600 hover:border-primary-400 hover:bg-primary-50">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  {cvFile?.name || "Click to upload PDF / DOC"}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFile}
                    className="hidden"
                  />
                </label>
                <p className="mt-1 text-xs text-gray-400">Max 5MB. PDF or DOC preferred.</p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Cover Letter (optional)
                </label>
                <textarea
                  rows={4}
                  value={form.coverLetter}
                  onChange={(e) => setForm({ ...form, coverLetter: e.target.value })}
                  placeholder="Tell us why you are a great fit..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit Application"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
