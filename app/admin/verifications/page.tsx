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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Identity Verifications</h1>
          <p className="mt-1 text-sm text-gray-500">
            Review uploaded government IDs and approve or reject with a note.
          </p>
        </div>
        <button
          onClick={load}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Refresh
        </button>
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
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
          No pending verifications. All caught up.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
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
              {items.map((it) => (
                <tr key={it.userId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{it.name}</div>
                    <div className="text-xs text-gray-500">{it.email}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{it.role}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">
                    {it.medicalId}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{it.docType}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(it.submittedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <a
                        href={it.docUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        View doc
                      </a>
                      <button
                        onClick={() => approve(it.userId)}
                        disabled={busyId === it.userId}
                        className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          setRejectingFor(it.userId);
                          setRejectNote("");
                        }}
                        disabled={busyId === it.userId}
                        className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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
