"use client";

// Admin review panel for doctor registration applications.
// Shows each application with direct links to the uploaded Blob documents
// so the admin can open the medical license, photo ID, and degree in a
// new tab before approving or rejecting.

import { useEffect, useState } from "react";
import type { DoctorApplication } from "@/lib/doctor-applications-store";

type Tab = "pending" | "approved" | "rejected" | "all";

export default function AdminApplicationsPage() {
  const [apps, setApps] = useState<DoctorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notesFor, setNotesFor] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/doctor-applications", { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        setApps(d.applications || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function decide(
    id: string,
    status: "approved" | "rejected",
    adminNotes?: string
  ) {
    setBusyId(id);
    try {
      const r = await fetch("/api/admin/doctor-applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, adminNotes }),
      });
      if (r.ok) await load();
    } finally {
      setBusyId(null);
      setNotesFor(null);
      setNotesText("");
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(
      `Delete ${name}'s application permanently? This cannot be undone. ` +
      `(If they've already been approved, their Doctor record on /admin/doctors is separate and will remain.)`
    )) return;
    setBusyId(id);
    try {
      const r = await fetch(`/api/admin/doctor-applications?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (r.ok) await load();
      else {
        const d = await r.json().catch(() => ({}));
        alert(d.error || `Delete failed (HTTP ${r.status})`);
      }
    } finally {
      setBusyId(null);
    }
  }

  const filtered = apps.filter((a) => tab === "all" || a.status === tab);
  const counts = {
    pending: apps.filter((a) => a.status === "pending").length,
    approved: apps.filter((a) => a.status === "approved").length,
    rejected: apps.filter((a) => a.status === "rejected").length,
    all: apps.length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50/40 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary-700 via-indigo-700 to-purple-700 p-8 text-white shadow-xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider ring-1 ring-white/30">
            👨‍⚕️ Admin Review
          </span>
          <h1 className="mt-3 text-3xl font-bold md:text-4xl">Doctor Applications</h1>
          <p className="mt-2 text-white/80">
            Review submitted documents and approve or reject new doctor registrations.
          </p>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex flex-wrap gap-2 rounded-2xl border border-gray-100 bg-white p-2 shadow-sm">
          {(["pending", "approved", "rejected", "all"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold capitalize transition-all ${
                tab === t
                  ? "bg-gradient-to-r from-primary-600 to-teal-600 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {t}{" "}
              <span
                className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${
                  tab === t ? "bg-white/20" : "bg-gray-100 text-gray-600"
                }`}
              >
                {counts[t]}
              </span>
            </button>
          ))}
        </div>

        {/* List */}
        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="rounded-2xl bg-white p-12 text-center text-gray-500 shadow-sm">
              Loading applications…
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl bg-white p-12 text-center text-gray-500 shadow-sm">
              No {tab === "all" ? "" : tab} applications.
            </div>
          ) : (
            filtered.map((app) => (
              <ApplicationCard
                key={app.id}
                app={app}
                busy={busyId === app.id}
                onApprove={() => decide(app.id, "approved")}
                onRejectClick={() => {
                  setNotesFor(app.id);
                  setNotesText(app.adminNotes || "");
                }}
                onDelete={() => remove(app.id, app.fullName)}
              />
            ))
          )}
        </div>
      </div>

      {/* Reject modal */}
      {notesFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900">Reject application</h3>
            <p className="mt-1 text-sm text-gray-500">
              Add a short note explaining why — this is visible to the applicant.
            </p>
            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              rows={4}
              placeholder="e.g. Missing specialty certification documents…"
              className="mt-4 w-full rounded-xl border-2 border-gray-200 p-3 text-sm focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setNotesFor(null);
                  setNotesText("");
                }}
                className="rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => decide(notesFor, "rejected", notesText)}
                className="rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-5 py-2 text-sm font-semibold text-white shadow-md hover:scale-105"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ApplicationCard({
  app,
  busy,
  onApprove,
  onRejectClick,
  onDelete,
}: {
  app: DoctorApplication;
  busy: boolean;
  onApprove: () => void;
  onRejectClick: () => void;
  onDelete: () => void;
}) {
  const statusColors: Record<string, string> = {
    pending: "from-amber-500 to-orange-500",
    approved: "from-emerald-500 to-teal-500",
    rejected: "from-rose-500 to-red-500",
  };

  const docs: { label: string; value?: string }[] = [
    { label: "Medical License", value: app.documents.medicalLicense },
    { label: "Government ID", value: app.documents.governmentId },
    { label: "Medical Degree", value: app.documents.medicalDegree },
    { label: "Professional Photo", value: app.documents.professionalPhoto },
    {
      label: "Hospital Affiliation",
      value: app.documents.hospitalAffiliationLetter,
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md">
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
        <h3 className="text-lg font-bold text-gray-900">{app.fullName}</h3>
        <span
          className={`rounded-full bg-gradient-to-r ${statusColors[app.status]} px-3 py-0.5 text-xs font-bold uppercase tracking-wide text-white`}
        >
          {app.status}
        </span>
        <span className="ml-auto text-xs text-gray-500">
          {new Date(app.submittedAt).toLocaleString()}
        </span>
      </div>

      <div className="grid gap-5 p-5 md:grid-cols-3">
        {/* Info */}
        <div className="md:col-span-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <InfoRow label="Email" value={app.email} />
            <InfoRow label="Phone" value={app.phone} />
            <InfoRow label="Specialty" value={app.specialty} />
            <InfoRow label="License" value={app.licenseNumber} />
            <InfoRow label="Experience" value={`${app.yearsExperience} years`} />
            <InfoRow label="Plan" value={app.plan} />
            <InfoRow
              label="Qualifications"
              value={app.qualifications}
              span={2}
            />
            <InfoRow label="Address" value={app.address} span={2} />
          </div>

          {app.adminNotes && (
            <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-900">
              <p className="text-xs font-bold uppercase tracking-wide text-rose-700">
                Admin notes
              </p>
              <p className="mt-1">{app.adminNotes}</p>
            </div>
          )}
        </div>

        {/* Documents */}
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
            Documents
          </p>
          <div className="space-y-2">
            {docs.map((d) => (
              <DocLink key={d.label} label={d.label} value={d.value} applicationId={app.id} />
            ))}
            {app.documents.specialtyCertifications &&
              app.documents.specialtyCertifications.length > 0 && (
                <div>
                  <p className="mt-2 text-xs font-semibold text-gray-600">
                    Specialty Certifications
                  </p>
                  {app.documents.specialtyCertifications.map((v, i) => (
                    <DocLink key={i} label={`Cert ${i + 1}`} value={v} applicationId={app.id} />
                  ))}
                </div>
              )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3">
        <button
          onClick={onDelete}
          disabled={busy}
          title="Permanently delete this application"
          className="mr-auto inline-flex items-center gap-1.5 rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M10 7V4a1 1 0 011-1h2a1 1 0 011 1v3" />
          </svg>
          Delete
        </button>
        {app.status === "pending" && (
          <>
            <button
              onClick={onRejectClick}
              disabled={busy}
              className="rounded-xl border-2 border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
            >
              Reject
            </button>
            <button
              onClick={onApprove}
              disabled={busy}
              className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-sm font-semibold text-white shadow-md transition-transform hover:scale-105 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Approve"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  span = 1,
}: {
  label: string;
  value: string;
  span?: 1 | 2;
}) {
  return (
    <div className={span === 2 ? "col-span-2" : ""}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-gray-900">{value}</p>
    </div>
  );
}

function DocLink({
  label,
  value,
  applicationId,
}: {
  label: string;
  value?: string;
  applicationId?: string;
}) {
  if (!value) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-400">
        <span>{label}</span>
        <span>Not provided</span>
      </div>
    );
  }
  const isUrl = value.startsWith("http");

  // View click no longer hits files.odudoc.com directly. We mint a
  // signed, short-lived, admin-session-gated URL via /api/admin/blob/sign
  // and open that — the proxy at /api/admin/blob/fetch streams the
  // bytes after a fresh admin check + audit-log entry.
  const handleView = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isUrl) return;
    try {
      const r = await fetch("/api/admin/blob/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: value, applicationId }),
      });
      const j = await r.json();
      if (!r.ok || !j.url) {
        alert(j.error || `Failed to mint URL (${r.status})`);
        return;
      }
      window.open(j.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs">
      <span className="font-medium text-gray-700">{label}</span>
      {isUrl ? (
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleView}
            className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-primary-600 to-teal-600 px-2.5 py-1 font-semibold text-white hover:scale-105"
            title="Opens an audit-logged, time-limited link"
          >
            View
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        </div>
      ) : (
        <span className="truncate text-gray-500" title={value}>
          {value}
        </span>
      )}
    </div>
  );
}
