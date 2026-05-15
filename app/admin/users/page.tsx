"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

// Mirrors AdminUserView in lib/users-store.ts (kept in sync manually — the
// admin page only renders the fields it needs, so drift here is low-risk).
// Mirrors User["role"] in lib/users-store.ts. Keep in sync.
type Role =
  | "patient"
  | "doctor"
  | "admin"
  | "staff"
  | "vendor"
  | "hr"
  | "support"
  | "pharmacist";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  createdAt: string;
  emailVerified: boolean;
  lastLoginAt: string | null;
  status: "active" | "banned";
  banReason?: string;
  bannedAt?: string;
  warningsCount: number;
}

type TabKey = "all" | Role | "banned";

// Order shown in the tab strip — most common roles first, banned last so
// it sits visually apart.
const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "patient", label: "Patient" },
  { key: "doctor", label: "Doctor" },
  { key: "admin", label: "Admin" },
  { key: "staff", label: "Staff" },
  { key: "vendor", label: "Vendor" },
  { key: "pharmacist", label: "Pharmacist" },
  { key: "support", label: "Support" },
  { key: "hr", label: "HR" },
  { key: "banned", label: "Banned" },
];

const ROLE_BADGE: Record<Role, string> = {
  admin: "bg-gradient-to-r from-purple-50 to-fuchsia-50 text-purple-700 ring-1 ring-purple-200",
  doctor: "bg-gradient-to-r from-blue-50 to-sky-50 text-blue-700 ring-1 ring-blue-200",
  patient: "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 ring-1 ring-emerald-200",
  staff: "bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 ring-1 ring-amber-200",
  vendor: "bg-gradient-to-r from-pink-50 to-rose-50 text-pink-700 ring-1 ring-pink-200",
  hr: "bg-gradient-to-r from-teal-50 to-cyan-50 text-teal-700 ring-1 ring-teal-200",
  support: "bg-gradient-to-r from-cyan-50 to-sky-50 text-cyan-700 ring-1 ring-cyan-200",
  pharmacist: "bg-gradient-to-r from-lime-50 to-emerald-50 text-lime-700 ring-1 ring-lime-200",
};

const AVATAR_COLOR: Record<Role, string> = {
  admin: "bg-gradient-to-br from-purple-400 to-fuchsia-500 text-white ring-2 ring-purple-100",
  doctor: "bg-gradient-to-br from-blue-400 to-sky-500 text-white ring-2 ring-blue-100",
  patient: "bg-gradient-to-br from-emerald-400 to-green-500 text-white ring-2 ring-emerald-100",
  staff: "bg-gradient-to-br from-amber-400 to-orange-500 text-white ring-2 ring-amber-100",
  vendor: "bg-gradient-to-br from-pink-400 to-rose-500 text-white ring-2 ring-pink-100",
  hr: "bg-gradient-to-br from-teal-400 to-cyan-500 text-white ring-2 ring-teal-100",
  support: "bg-gradient-to-br from-cyan-400 to-sky-500 text-white ring-2 ring-cyan-100",
  pharmacist: "bg-gradient-to-br from-lime-400 to-emerald-500 text-white ring-2 ring-lime-100",
};

// Role options for the "Change role" modal, in the same order as the tab
// strip. Extracted so adding a role only requires editing this + the TABS
// array + the Role union.
const ROLE_OPTIONS: { value: Role; label: string; hint?: string }[] = [
  { value: "patient", label: "Patient" },
  {
    value: "doctor",
    label: "Doctor",
    hint: "Auto-creates a profile in /admin/doctors.",
  },
  { value: "pharmacist", label: "Pharmacist — dispensing & Rx verification" },
  { value: "vendor", label: "Vendor — pharmacy / marketplace seller" },
  { value: "support", label: "Customer Support" },
  { value: "hr", label: "HR — careers & applicants" },
  { value: "staff", label: "Staff — generic back-office" },
  { value: "admin", label: "Admin — platform super-admin" },
];

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
  const [newRole, setNewRole] = useState<Role>("patient");
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
    const byRole: Record<Role, number> = {
      patient: 0,
      doctor: 0,
      admin: 0,
      staff: 0,
      vendor: 0,
      hr: 0,
      support: 0,
      pharmacist: 0,
    };
    for (const u of users) byRole[u.role] = (byRole[u.role] ?? 0) + 1;
    return {
      total: users.length,
      byRole,
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
      {/* gradient hero */}
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-fuchsia-300/20 blur-3xl" />
        <div className="relative">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fuchsia-300 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-fuchsia-400" />
            </span>
            Access control
          </div>
          <h2 className="text-2xl font-bold">Users &amp; Roles</h2>
          <p className="mt-1 text-sm text-purple-50/90">
            {loading ? "Loading…" : `${users.length} total users · ${stats.banned} banned`}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stats — show the five most actionable cards; the full per-role
          breakdown lives in the tab strip below. */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatCard label="Total" value={stats.total} tone="slate" />
        <StatCard label="Patients" value={stats.byRole.patient} tone="green" />
        <StatCard label="Doctors" value={stats.byRole.doctor} tone="blue" />
        <StatCard label="Admins" value={stats.byRole.admin} tone="purple" />
        <StatCard label="Banned" value={stats.banned} tone="red" />
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
                : stats.byRole[tab.key as Role] ?? 0;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                  active
                    ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md"
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

      {/* Table — scrolls both directions. The outer wrapper caps
          height at 70vh so the user list never pushes the page taller
          than the viewport; the inner div allows horizontal scroll
          when the columns total wider than the visible area. The
          thead is sticky so headers stay anchored during vertical
          scroll. */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500" />
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-gray-100 bg-gradient-to-r from-violet-50/95 via-purple-50/95 to-indigo-50/95 text-xs uppercase text-gray-600 backdrop-blur">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Joined</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Last login</th>
                {/* Actions column is sticky-right so it stays visible
                    even when the table scrolls horizontally. Patient
                    feedback: at narrower viewports the column kept
                    falling off the right edge. */}
                <th className="sticky right-0 z-20 bg-gradient-to-l from-violet-50/95 via-purple-50/95 to-purple-50/0 px-4 py-3 text-right font-medium shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.1)]">Actions</th>
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
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-rose-50 to-red-50 px-3 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        Banned
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-50 to-green-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                    {fmtDate(u.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                    {fmtDate(u.lastLoginAt)}
                  </td>
                  <td className="sticky right-0 z-10 bg-white whitespace-nowrap px-4 py-3 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.08)]">
                    {/* sticky right-0 keeps the Actions cell anchored
                        to the right edge during horizontal scroll. bg-white
                        prevents columns underneath from bleeding through.
                        Action column was overflowing off-screen with 5
                        text buttons + 3-line date columns. Switched to
                        icon-only square buttons with title tooltips —
                        same actions, ~⅓ the width. Date columns get
                        whitespace-nowrap above so they don't wrap to 3
                        lines either. */}
                    <div className="flex items-center justify-end gap-1">
                      {u.status === "active" ? (
                        <IconBtn
                          onClick={() => setBanFor(u)}
                          disabled={busyId === u.id}
                          title="Ban user"
                          tone="bg-red-50 text-red-600 ring-red-100 hover:bg-red-100"
                          icon="🚫"
                        />
                      ) : (
                        <IconBtn
                          onClick={() => doUnban(u)}
                          disabled={busyId === u.id}
                          title="Unban user"
                          tone="bg-emerald-50 text-emerald-600 ring-emerald-100 hover:bg-emerald-100"
                          icon="✓"
                        />
                      )}
                      <IconBtn
                        onClick={() => setWarningFor(u)}
                        disabled={busyId === u.id}
                        title="Send warning"
                        tone="bg-amber-50 text-amber-700 ring-amber-100 hover:bg-amber-100"
                        icon="⚠️"
                      />
                      <IconBtn
                        onClick={() => { setNewRole(u.role); setRoleFor(u); }}
                        disabled={busyId === u.id}
                        title="Change role"
                        tone="bg-indigo-50 text-indigo-600 ring-indigo-100 hover:bg-indigo-100"
                        icon="🛡"
                      />
                      <IconBtn
                        onClick={() => doResetPassword(u)}
                        disabled={busyId === u.id}
                        title="Reset password"
                        tone="bg-blue-50 text-blue-600 ring-blue-100 hover:bg-blue-100"
                        icon="🔑"
                      />
                      <IconBtn
                        onClick={() => doDelete(u)}
                        disabled={busyId === u.id}
                        title="Delete user"
                        tone="bg-rose-50 text-rose-700 ring-rose-100 hover:bg-rose-100"
                        icon="🗑"
                      />
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
            onChange={(e) => setNewRole(e.target.value as Role)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
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
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "green" | "blue" | "purple" | "red";
}) {
  const themes: Record<
    typeof tone,
    { bg: string; ring: string; text: string; dot: string }
  > = {
    slate: {
      bg: "from-slate-50 to-white",
      ring: "ring-slate-100",
      text: "text-slate-900",
      dot: "bg-slate-500",
    },
    green: {
      bg: "from-emerald-50 to-white",
      ring: "ring-emerald-100",
      text: "text-emerald-700",
      dot: "bg-emerald-500",
    },
    blue: {
      bg: "from-blue-50 to-white",
      ring: "ring-blue-100",
      text: "text-blue-700",
      dot: "bg-blue-500",
    },
    purple: {
      bg: "from-purple-50 to-white",
      ring: "ring-purple-100",
      text: "text-purple-700",
      dot: "bg-purple-500",
    },
    red: {
      bg: "from-rose-50 to-white",
      ring: "ring-rose-100",
      text: "text-rose-700",
      dot: "bg-rose-500",
    },
  };
  const t = themes[tone];
  return (
    <div
      className={`rounded-xl bg-gradient-to-br ${t.bg} p-5 shadow-sm ring-1 ${t.ring} transition hover:-translate-y-0.5 hover:shadow-md`}
    >
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${t.dot}`} />
        <p className="text-sm font-medium text-gray-600">{label}</p>
      </div>
      <p className={`mt-2 text-2xl font-bold ${t.text}`}>{value}</p>
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

/** Compact icon-only action button used in the Users table actions
 *  column. Same affordance as the previous text buttons (ring, hover
 *  lift, disabled state) but ~⅓ the width — keeps the actions column
 *  on-screen without horizontal scrolling. */
function IconBtn({
  onClick,
  disabled,
  title,
  tone,
  icon,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  tone: string;
  icon: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm ring-1 transition hover:-translate-y-0.5 hover:shadow disabled:opacity-50 ${tone}`}
    >
      {icon}
    </button>
  );
}
