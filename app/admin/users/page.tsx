"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

// Mirrors AdminUserView in lib/users-store.ts (kept in sync manually — the
// admin page only renders the fields it needs, so drift here is low-risk).
interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "patient" | "doctor" | "admin" | "staff";
  createdAt: string;
  emailVerified: boolean;
  lastLoginAt: string | null;
  status: "active" | "banned";
  banReason?: string;
  bannedAt?: string;
  warningsCount: number;
}

type TabKey = "all" | "patient" | "doctor" | "admin" | "staff" | "banned";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "patient", label: "Patient" },
  { key: "doctor", label: "Doctor" },
  { key: "admin", label: "Admin" },
  { key: "staff", label: "Staff" },
  { key: "banned", label: "Banned" },
];

const ROLE_BADGE: Record<AdminUser["role"], string> = {
  admin: "bg-purple-100 text-purple-700",
  doctor: "bg-blue-100 text-blue-700",
  patient: "bg-green-100 text-green-700",
  staff: "bg-amber-100 text-amber-700",
};

const AVATAR_COLOR: Record<AdminUser["role"], string> = {
  admin: "bg-purple-200 text-purple-700",
  doctor: "bg-blue-200 text-blue-700",
  patient: "bg-green-200 text-green-700",
  staff: "bg-amber-200 text-amber-700",
};

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  // Modal state
  const [warningFor, setWarningFor] = useState<AdminUser | null>(null);
  const [warningMsg, setWarningMsg] = useState("");
  const [banFor, setBanFor] = useState<AdminUser | null>(null);
  const [banReason, setBanReason] = useState("");
  const [roleFor, setRoleFor] = useState<AdminUser | null>(null);
  const [newRole, setNewRole] = useState<AdminUser["role"]>("patient");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Failed to load users (${res.status})`);
      }
      const data = (await res.json()) as { users: AdminUser[] };
      setUsers(data.users || []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (activeTab === "banned") {
        if (u.status !== "banned") return false;
      } else if (activeTab !== "all") {
        if (u.role !== activeTab) return false;
      }
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    });
  }, [users, activeTab, search]);

  const stats = useMemo(() => {
    return {
      total: users.length,
      patients: users.filter((u) => u.role === "patient").length,
      doctors: users.filter((u) => u.role === "doctor").length,
      admins: users.filter((u) => u.role === "admin").length,
      banned: users.filter((u) => u.status === "banned").length,
    };
  }, [users]);

  async function doBan() {
    if (!banFor) return;
    const reason = banReason.trim();
    if (!reason) return;
    setBusyId(banFor.id);
    try {
      const res = await fetch(`/api/admin/users/${banFor.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "ban", reason }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast(`Banned ${banFor.name} — email sent.`);
      setBanFor(null);
      setBanReason("");
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ban failed");
    } finally {
      setBusyId(null);
    }
  }

  async function doUnban(u: AdminUser) {
    if (!confirm(`Unban ${u.name}?`)) return;
    setBusyId(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "unban" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast(`Unbanned ${u.name}.`);
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Unban failed");
    } finally {
      setBusyId(null);
    }
  }

  async function doSendWarning() {
    if (!warningFor) return;
    const message = warningMsg.trim();
    if (!message) return;
    setBusyId(warningFor.id);
    try {
      const res = await fetch(
        `/api/admin/users/${warningFor.id}/warning`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message }),
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast(`Warning sent to ${warningFor.name}.`);
      setWarningFor(null);
      setWarningMsg("");
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Warning failed");
    } finally {
      setBusyId(null);
    }
  }

  async function doChangeRole() {
    if (!roleFor) return;
    if (newRole === roleFor.role) {
      setRoleFor(null);
      return;
    }
    setBusyId(roleFor.id);
    try {
      const res = await fetch(`/api/admin/users/${roleFor.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "change-role", role: newRole }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { createdDoctorId?: string | null };
      if (newRole === "doctor" && data.createdDoctorId) {
        showToast(
          `${roleFor.name} is now a doctor — profile created in /admin/doctors.`
        );
      } else {
        showToast(`${roleFor.name} role changed to ${newRole}.`);
      }
      setRoleFor(null);
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Role change failed");
    } finally {
      setBusyId(null);
    }
  }

  async function doDelete(u: AdminUser) {
    if (
      !confirm(
        `Permanently delete ${u.name} (${u.email})?\n\nThis cannot be undone. Their login will stop working immediately. Any prescriptions/orders tied to their email remain on record for audit.`
      )
    )
      return;
    setBusyId(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      showToast(`Deleted ${u.name}.`);
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  async function doResetPassword(u: AdminUser) {
    if (
      !confirm(
        `Reset password for ${u.name}? A temporary password will be emailed to them.`
      )
    )
      return;
    setBusyId(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}/reset-password`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast(`Password reset — new temp password emailed to ${u.email}.`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Users & Roles</h2>
        <p className="mt-1 text-sm text-gray-500">
          {loading ? "Loading…" : `${users.length} total users`}
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatCard label="Total" value={stats.total} tint="text-gray-900" />
        <StatCard
          label="Patients"
          value={stats.patients}
          tint="text-green-600"
        />
        <StatCard label="Doctors" value={stats.doctors} tint="text-blue-600" />
        <StatCard label="Admins" value={stats.admins} tint="text-purple-600" />
        <StatCard label="Banned" value={stats.banned} tint="text-red-600" />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 rounded-xl bg-white p-1.5 shadow-sm">
          {TABS.map((tab) => {
            const count =
              tab.key === "all"
                ? users.length
                : tab.key === "banned"
                ? stats.banned
                : users.filter((u) => u.role === tab.key).length;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tab.label}
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] ${
                    active ? "bg-white/20" : "bg-gray-100"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Last login</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-gray-50 transition-colors hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${AVATAR_COLOR[u.role]}`}
                      >
                        {initialsOf(u.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-gray-900">
                          {u.name}
                        </div>
                        {u.warningsCount > 0 && (
                          <div className="text-[11px] text-amber-600">
                            {u.warningsCount} warning
                            {u.warningsCount > 1 ? "s" : ""}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${ROLE_BADGE[u.role]}`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.status === "banned" ? (
                      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                        Banned
                      </span>
                    ) : (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {fmtDate(u.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {fmtDate(u.lastLoginAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {u.status === "active" ? (
                        <button
                          onClick={() => setBanFor(u)}
                          disabled={busyId === u.id}
                          className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                          title="Ban user"
                        >
                          Ban
                        </button>
                      ) : (
                        <button
                          onClick={() => doUnban(u)}
                          disabled={busyId === u.id}
                          className="rounded px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                          title="Unban user"
                        >
                          Unban
                        </button>
                      )}
                      <button
                        onClick={() => setWarningFor(u)}
                        disabled={busyId === u.id}
                        className="rounded px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                        title="Send warning"
                      >
                        Warn
                      </button>
                      <button
                        onClick={() => {
                          setNewRole(u.role);
                          setRoleFor(u);
                        }}
                        disabled={busyId === u.id}
                        className="rounded px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
                        title="Change role"
                      >
                        Role
                      </button>
                      <button
                        onClick={() => doResetPassword(u)}
                        disabled={busyId === u.id}
                        className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                        title="Reset password"
                      >
                        Reset pw
                      </button>
                      <button
                        onClick={() => doDelete(u)}
                        disabled={busyId === u.id}
                        className="rounded px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                        title="Delete user"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">
            No users found.
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* Ban modal */}
      {banFor && (
        <Modal
          title={`Ban ${banFor.name}`}
          onClose={() => {
            setBanFor(null);
            setBanReason("");
          }}
        >
          <p className="mb-3 text-sm text-gray-600">
            This user will be unable to sign in. They will receive an email
            notifying them of the ban.
          </p>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Reason (shown in email)
          </label>
          <textarea
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            placeholder="Explain why this account is being banned…"
          />
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => {
                setBanFor(null);
                setBanReason("");
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={doBan}
              disabled={!banReason.trim() || busyId === banFor.id}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              Ban user
            </button>
          </div>
        </Modal>
      )}

      {/* Role-change modal */}
      {roleFor && (
        <Modal
          title={`Change role for ${roleFor.name}`}
          onClose={() => setRoleFor(null)}
        >
          <p className="mb-3 text-sm text-gray-600">
            Current role:{" "}
            <span className="font-semibold capitalize">{roleFor.role}</span>.
            Changing the role will update this user&apos;s dashboard and
            permissions. Promoting to <b>doctor</b> automatically creates a
            profile in <code>/admin/doctors</code> where you can set their
            department, specialty, and fee.
          </p>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            New role
          </label>
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as AdminUser["role"])}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          >
            <option value="patient">Patient</option>
            <option value="doctor">Doctor</option>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
          {newRole === "doctor" && roleFor.role !== "doctor" && (
            <p className="mt-3 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
              A doctor profile will be auto-created with specialty &quot;General
              Physician&quot;. Visit /admin/doctors after to set their
              department and fee.
            </p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setRoleFor(null)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={doChangeRole}
              disabled={newRole === roleFor.role || busyId === roleFor.id}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Change role
            </button>
          </div>
        </Modal>
      )}

      {/* Warning modal */}
      {warningFor && (
        <Modal
          title={`Send warning to ${warningFor.name}`}
          onClose={() => {
            setWarningFor(null);
            setWarningMsg("");
          }}
        >
          <p className="mb-3 text-sm text-gray-600">
            This will email a formal warning to the user and record it against
            their account.
          </p>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Warning message
          </label>
          <textarea
            value={warningMsg}
            onChange={(e) => setWarningMsg(e.target.value)}
            rows={5}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            placeholder="Describe the behaviour that led to this warning…"
          />
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => {
                setWarningFor(null);
                setWarningMsg("");
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={doSendWarning}
              disabled={!warningMsg.trim() || busyId === warningFor.id}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              Send warning
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tint,
}: {
  label: string;
  value: number;
  tint: string;
}) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tint}`}>{value}</p>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
