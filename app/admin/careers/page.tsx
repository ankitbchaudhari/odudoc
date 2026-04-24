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
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-fuchsia-600 via-pink-600 to-rose-600 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-yellow-300/20 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-300 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-400" />
              </span>
              {jobs.filter((j) => j.active).length} open roles · {applications.length} applications
            </div>
            <h1 className="text-2xl font-bold">Careers</h1>
            <p className="mt-1 text-sm text-pink-50/90">Manage vacancies and review applications.</p>
          </div>
          {tab === "jobs" && (
            <button
              onClick={() => setShowNew(true)}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-pink-700 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              + New Vacancy
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-gray-100">
        <button
          onClick={() => setTab("jobs")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
            tab === "jobs"
              ? "bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white shadow-md"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          💼 Vacancies ({jobs.length})
        </button>
        <button
          onClick={() => setTab("applications")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
            tab === "applications"
              ? "bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white shadow-md"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          📄 Applications ({applications.length})
        </button>
      </div>

      {tab === "jobs" && (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="h-1 bg-gradient-to-r from-fuchsia-500 via-pink-500 to-rose-500" />
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gradient-to-r from-fuchsia-50/60 via-pink-50/40 to-rose-50/60">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Department
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Location
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Status
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobs.map((job, i) => {
                const palettes = [
                  { grad: "from-fuchsia-400 to-pink-500", dept: "from-fuchsia-50 to-pink-50 text-fuchsia-700 ring-fuchsia-200" },
                  { grad: "from-violet-400 to-purple-500", dept: "from-violet-50 to-purple-50 text-violet-700 ring-violet-200" },
                  { grad: "from-sky-400 to-blue-500", dept: "from-sky-50 to-blue-50 text-sky-700 ring-sky-200" },
                  { grad: "from-emerald-400 to-teal-500", dept: "from-emerald-50 to-teal-50 text-emerald-700 ring-emerald-200" },
                  { grad: "from-amber-400 to-orange-500", dept: "from-amber-50 to-orange-50 text-amber-700 ring-amber-200" },
                  { grad: "from-rose-400 to-red-500", dept: "from-rose-50 to-red-50 text-rose-700 ring-rose-200" },
                ];
                const p = palettes[i % palettes.length];
                return (
                  <tr key={job.id} className="transition-colors hover:bg-pink-50/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${p.grad} text-white shadow ring-2 ring-white`}>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="text-sm font-semibold text-gray-900">{job.title}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full bg-gradient-to-r ${p.dept} px-2.5 py-1 text-xs font-semibold ring-1`}>
                        {job.department}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">📍 {job.location}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                        {job.employmentType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(job)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 transition hover:-translate-y-0.5 hover:shadow ${
                          job.active
                            ? "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 ring-emerald-200"
                            : "bg-gradient-to-r from-gray-50 to-slate-50 text-gray-500 ring-gray-200"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${job.active ? "bg-emerald-500" : "bg-gray-400"}`} />
                        {job.active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <button
                        onClick={() => setEditing(job)}
                        className="mr-2 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600 ring-1 ring-indigo-100 transition hover:-translate-y-0.5 hover:bg-indigo-100 hover:shadow"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteJob(job.id)}
                        className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600 ring-1 ring-rose-100 transition hover:-translate-y-0.5 hover:bg-rose-100 hover:shadow"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
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
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                  appView === "active"
                    ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md"
                    : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setAppView("archived")}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                  appView === "archived"
                    ? "bg-gradient-to-r from-slate-500 to-gray-600 text-white shadow-md"
                    : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
                }`}
              >
                Archived
              </button>
            </div>
            <p className="text-xs text-gray-400">
              Candidates receive an email when their status is set to Reviewing / Shortlisted / Hired / Rejected.
            </p>
          </div>

        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="h-1 bg-gradient-to-r from-fuchsia-500 via-pink-500 to-rose-500" />
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gradient-to-r from-fuchsia-50/60 via-pink-50/40 to-rose-50/60">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Applicant</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Position</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">CV</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {applications.map((a, i) => {
                const job = jobs.find((j) => j.id === a.jobId);
                const grads = [
                  "from-fuchsia-400 to-pink-500",
                  "from-violet-400 to-purple-500",
                  "from-sky-400 to-blue-500",
                  "from-emerald-400 to-teal-500",
                  "from-amber-400 to-orange-500",
                  "from-rose-400 to-red-500",
                ];
                const g = grads[i % grads.length];
                const initials = `${(a.firstName[0] || "").toUpperCase()}${(a.lastName[0] || "").toUpperCase()}`;
                const statusStyle: Record<string, string> = {
                  new: "from-sky-50 to-blue-50 text-sky-700 ring-sky-200",
                  reviewing: "from-amber-50 to-yellow-50 text-amber-700 ring-amber-200",
                  shortlisted: "from-violet-50 to-purple-50 text-violet-700 ring-violet-200",
                  hired: "from-emerald-50 to-green-50 text-emerald-700 ring-emerald-200",
                  rejected: "from-rose-50 to-red-50 text-rose-700 ring-rose-200",
                };
                return (
                  <tr key={a.id} className="transition-colors hover:bg-pink-50/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${g} text-xs font-bold text-white shadow ring-2 ring-white`}>
                          {initials}
                        </div>
                        <div className="text-sm font-semibold text-gray-900">
                          {a.firstName} {a.lastName}
                        </div>
                      </div>
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
                        className={`rounded-full bg-gradient-to-r ${statusStyle[a.status] ?? statusStyle.new} px-3 py-1 text-xs font-semibold ring-1 outline-none`}
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
                            className="rounded-lg bg-slate-50 px-2.5 py-1 font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow disabled:opacity-50"
                            title="Hide from Active list; keep on file"
                          >
                            Archive
                          </button>
                        ) : (
                          <button
                            disabled={busyAppId === a.id}
                            onClick={() => unarchiveApp(a.id)}
                            className="rounded-lg bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 ring-1 ring-emerald-200 transition hover:-translate-y-0.5 hover:bg-emerald-100 hover:shadow disabled:opacity-50"
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
                          className="rounded-lg bg-rose-50 px-2.5 py-1 font-semibold text-rose-700 ring-1 ring-rose-200 transition hover:-translate-y-0.5 hover:bg-rose-100 hover:shadow disabled:opacity-50"
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
