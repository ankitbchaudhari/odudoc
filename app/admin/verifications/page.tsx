"use client";

// Admin identity-verification queue.
//
// Lists every user with identity.status === "pending". The reviewer
// opens the uploaded document in a new tab, eyeballs the name / photo /
// DOB against our user record, and approves or rejects. Rejection
// requires a free-form note so the user sees actionable feedback
// ("photo is blurry", "name doesn't match account", etc.) on their
// profile and can re-upload.

import { useCallback, useEffect, useState } from "react";

interface Pending {
  userId: string;
  name: string;
  email: string;
  role: string;
  medicalId: string;
  docType: string;
  docUrl: string;
  docFilename: string;
  submittedAt: string;
}

export default function AdminVerificationsPage() {
  const [items, setItems] = useState<Pending[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectingFor, setRejectingFor] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/verifications", { cache: "no-store" });
      if (!res.ok) {
        setError("Failed to load verifications");
        setItems([]);
        return;
      }
      const data = await res.json();
      setItems(data.pending || []);
      setError(null);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (userId: string) => {
    setBusyId(userId);
    try {
      const res = await fetch(`/api/admin/verifications/${encodeURIComponent(userId)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.message || "Approval failed");
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const submitReject = async () => {
    if (!rejectingFor) return;
    setBusyId(rejectingFor);
    try {
      const res = await fetch(
        `/api/admin/verifications/${encodeURIComponent(rejectingFor)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "reject", note: rejectNote }),
        },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.message || "Rejection failed");
        return;
      }
      setRejectingFor(null);
      setRejectNote("");
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
              </span>
              {items.length} pending review
            </div>
            <h1 className="text-2xl font-bold">Identity Verifications</h1>
            <p className="mt-1 text-sm text-sky-50/90">
              Review uploaded government IDs and approve or reject with a note.
            </p>
          </div>
          <button
            onClick={load}
            className="rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-gray-500">
          Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-green-50 p-10 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-green-500 text-white shadow-md ring-4 ring-white">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-emerald-700">No pending verifications</p>
          <p className="mt-1 text-xs text-emerald-600/80">All caught up — great work!</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="h-1 bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500" />
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gradient-to-r from-sky-50/60 via-blue-50/40 to-indigo-50/60 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Medical ID</th>
                <th className="px-4 py-3">Doc type</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((it, i) => {
                const avatarPalette = [
                  "from-sky-400 to-blue-500",
                  "from-violet-400 to-purple-500",
                  "from-pink-400 to-rose-500",
                  "from-amber-400 to-orange-500",
                  "from-emerald-400 to-teal-500",
                  "from-fuchsia-400 to-pink-500",
                ];
                const g = avatarPalette[i % avatarPalette.length];
                const initials = it.name
                  .split(" ")
                  .map((s) => s[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                return (
                  <tr key={it.userId} className="transition-colors hover:bg-sky-50/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${g} text-xs font-bold text-white shadow ring-2 ring-white`}
                        >
                          {initials}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{it.name}</div>
                          <div className="text-xs text-gray-500">{it.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-gradient-to-r from-indigo-50 to-violet-50 px-3 py-1 text-xs font-semibold capitalize text-indigo-700 ring-1 ring-indigo-200">
                        {it.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">
                      {it.medicalId}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-cyan-50 to-sky-50 px-3 py-1 text-xs font-semibold text-cyan-700 ring-1 ring-cyan-200">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {it.docType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(it.submittedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <a
                          href={it.docUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow"
                        >
                          View doc
                        </a>
                        <button
                          onClick={() => approve(it.userId)}
                          disabled={busyId === it.userId}
                          className="rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => {
                            setRejectingFor(it.userId);
                            setRejectNote("");
                          }}
                          disabled={busyId === it.userId}
                          className="rounded-lg bg-gradient-to-r from-rose-500 to-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"
                        >
                          ✕ Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject-with-note modal */}
      {rejectingFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">Reject submission</h2>
            <p className="mt-1 text-sm text-gray-500">
              The user will see this note on their profile so they know what to fix.
            </p>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={4}
              placeholder="e.g. Photo is blurry — please re-upload a clearer image showing all four corners."
              className="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setRejectingFor(null);
                  setRejectNote("");
                }}
                className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitReject}
                disabled={busyId === rejectingFor}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Reject & notify user
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
