"use client";

import { useEffect, useState } from "react";
import type { JobVacancy, JobApplication, EmploymentType } from "@/lib/careers-store";

type AppView = "active" | "archived";

export default function AdminCareersPage() {
  const [tab, setTab] = useState<"jobs" | "applications">("jobs");
  const [jobs, setJobs] = useState<JobVacancy[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [editing, setEditing] = useState<JobVacancy | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [appView, setAppView] = useState<AppView>("active");
  const [busyAppId, setBusyAppId] = useState<string | null>(null);

  const loadJobs = () => {
    fetch("/api/careers/jobs?all=1")
      .then((r) => r.json())
      .then((d) => setJobs(d.jobs || []));
  };
  const loadApplications = (view: AppView = appView) => {
    const qs = view === "archived" ? "?view=archived" : "";
    fetch(`/api/careers/applications${qs}`)
      .then((r) => r.json())
      .then((d) => setApplications(d.applications || []));
  };

  useEffect(() => {
    loadJobs();
    loadApplications("active");
  }, []);

  useEffect(() => {
    loadApplications(appView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appView]);

  const deleteJob = async (id: string) => {
    if (!confirm("Delete this vacancy?")) return;
    await fetch(`/api/careers/jobs?id=${id}`, { method: "DELETE" });
    loadJobs();
  };

  const toggleActive = async (job: JobVacancy) => {
    await fetch("/api/careers/jobs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: job.id, active: !job.active }),
    });
    loadJobs();
  };

  const updateAppStatus = async (id: string, status: JobApplication["status"]) => {
    setBusyAppId(id);
    try {
      await fetch("/api/careers/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      loadApplications();
    } finally {
      setBusyAppId(null);
    }
  };

  const archiveApp = async (id: string) => {
    setBusyAppId(id);
    try {
      await fetch("/api/careers/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "archive" }),
      });
      loadApplications();
    } finally {
      setBusyAppId(null);
    }
  };

  const unarchiveApp = async (id: string) => {
    setBusyAppId(id);
    try {
      await fetch("/api/careers/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "unarchive" }),
      });
      loadApplications();
    } finally {
      setBusyAppId(null);
    }
  };

  const deleteApp = async (id: string, name: string) => {
    if (
      !confirm(
        `Permanently delete ${name}'s application? This cannot be undone. Consider archiving instead.`
      )
    )
      return;
    setBusyAppId(id);
    try {
      await fetch(`/api/careers/applications?id=${id}`, { method: "DELETE" });
      loadApplications();
    } finally {
      setBusyAppId(null);
    }
  };

  const openCv = async (a: JobApplication) => {
    if (!a.cvStoredFilename) {
      alert(
        "This is a legacy demo record without a stored CV file. Only applications submitted after the file-service rollout have downloadable CVs."
      );
      return;
    }
    try {
      const res = await fetch(`/api/careers/applications/${a.id}/cv-url`);
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error || `Failed (${res.status})`);
      }
      const { url } = (await res.json()) as { url: string };
      window.open(url, "_blank", "noopener");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not open CV");
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Careers</h1>
          <p className="mt-1 text-sm text-gray-500">Manage vacancies and review applications.</p>
        </div>
        {tab === "jobs" && (
          <button onClick={() => setShowNew(true)} className="btn-primary !text-sm">
            + New Vacancy
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1">
        <button
          onClick={() => setTab("jobs")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "jobs" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"
          }`}
        >
          Vacancies ({jobs.length})
        </button>
        <button
          onClick={() => setTab("applications")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "applications" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"
          }`}
        >
          Applications ({applications.length})
        </button>
      </div>

      {tab === "jobs" && (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Department
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Location
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{job.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{job.department}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{job.location}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{job.employmentType}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(job)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        job.active
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {job.active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    <button
                      onClick={() => setEditing(job)}
                      className="mr-3 font-medium text-primary-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteJob(job.id)}
                      className="font-medium text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {jobs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                    No vacancies yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "applications" && (
        <>
          {/* Sub-filter: active vs archived */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setAppView("active")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  appView === "active"
                    ? "bg-primary-600 text-white"
                    : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setAppView("archived")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  appView === "archived"
                    ? "bg-primary-600 text-white"
                    : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Archived
              </button>
            </div>
            <p className="text-xs text-gray-400">
              Candidates receive an email when their status is set to Reviewing / Shortlisted / Hired / Rejected.
            </p>
          </div>

        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Applicant</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Position</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">CV</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {applications.map((a) => {
                const job = jobs.find((j) => j.id === a.jobId);
                return (
                  <tr key={a.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {a.firstName} {a.lastName}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      <div>{a.email}</div>
                      <div className="text-gray-400">{a.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {job?.title || <span className="italic text-gray-400">General</span>}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {a.cvStoredFilename ? (
                        <button
                          onClick={() => openCv(a)}
                          className="inline-flex items-center gap-1 text-primary-600 hover:underline"
                          title={`Click to open ${a.cvFileName} — you can open as many times as you need`}
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"
                            />
                          </svg>
                          <span className="max-w-[180px] truncate">{a.cvFileName}</span>
                        </button>
                      ) : (
                        <span className="text-gray-400" title="Legacy record, no stored file">
                          {a.cvFileName}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={a.status}
                        onChange={(e) => updateAppStatus(a.id, e.target.value as JobApplication["status"])}
                        className="rounded border border-gray-200 px-2 py-1 text-xs"
                      >
                        <option value="new">New</option>
                        <option value="reviewing">Reviewing</option>
                        <option value="shortlisted">Shortlisted</option>
                        <option value="hired">Hired</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(a.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right text-xs">
                      <div className="flex justify-end gap-2">
                        {appView === "active" ? (
                          <button
                            disabled={busyAppId === a.id}
                            onClick={() => archiveApp(a.id)}
                            className="rounded border border-gray-200 px-2.5 py-1 font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                            title="Hide from Active list; keep on file"
                          >
                            Archive
                          </button>
                        ) : (
                          <button
                            disabled={busyAppId === a.id}
                            onClick={() => unarchiveApp(a.id)}
                            className="rounded border border-gray-200 px-2.5 py-1 font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                            title="Restore to Active list"
                          >
                            Unarchive
                          </button>
                        )}
                        <button
                          disabled={busyAppId === a.id}
                          onClick={() =>
                            deleteApp(a.id, `${a.firstName} ${a.lastName}`)
                          }
                          className="rounded border border-red-200 px-2.5 py-1 font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                          title="Permanently delete"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {applications.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                    {appView === "archived"
                      ? "No archived applications."
                      : "No applications yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </>
      )}

      {(showNew || editing) && (
        <JobForm
          initial={editing}
          onClose={() => {
            setShowNew(false);
            setEditing(null);
          }}
          onSaved={() => {
            loadJobs();
            setShowNew(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function JobForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: JobVacancy | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: initial?.title || "",
    department: initial?.department || "",
    location: initial?.location || "",
    employmentType: (initial?.employmentType || "Full-time") as EmploymentType,
    salary: initial?.salary || "",
    description: initial?.description || "",
    responsibilities: initial?.responsibilities.join("\n") || "",
    requirements: initial?.requirements.join("\n") || "",
    active: initial?.active ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      responsibilities: form.responsibilities.split("\n").filter(Boolean),
      requirements: form.requirements.split("\n").filter(Boolean),
    };
    if (initial) {
      await fetch("/api/careers/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: initial.id, ...payload }),
      });
    } else {
      await fetch("/api/careers/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setSaving(false);
    onSaved();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-xl font-bold text-gray-900">
          {initial ? "Edit Vacancy" : "New Vacancy"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-700">Title *</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Department *</label>
              <input
                required
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Location</label>
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Employment Type</label>
              <select
                value={form.employmentType}
                onChange={(e) => setForm({ ...form, employmentType: e.target.value as EmploymentType })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              >
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Contract</option>
                <option>Internship</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Salary Range</label>
              <input
                value={form.salary}
                onChange={(e) => setForm({ ...form, salary: e.target.value })}
                placeholder="e.g. $80k - $120k"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Responsibilities (one per line)
            </label>
            <textarea
              rows={4}
              value={form.responsibilities}
              onChange={(e) => setForm({ ...form, responsibilities: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Requirements (one per line)
            </label>
            <textarea
              rows={4}
              value={form.requirements}
              onChange={(e) => setForm({ ...form, requirements: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            Active (visible on careers page)
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60">
              {saving ? "Saving..." : initial ? "Save Changes" : "Create Vacancy"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
