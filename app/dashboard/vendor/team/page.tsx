"use client";

// Vendor-side team management.
//
// Owners and managers invite, scope, and revoke staff here. Roles are
// enforced server-side (see lib/vendor-permissions.ts); this page just
// provides the UI affordances for each state.
//
// A staff row has three statuses: invited (awaiting first login),
// active (can act), revoked (read-only audit record).

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Role = "manager" | "pharmacist" | "cashier";
type Status = "invited" | "active" | "revoked";

interface StaffRow {
  id: string;
  vendorId: string;
  email: string;
  displayName?: string;
  role: Role;
  storeIds: string[];
  status: Status;
  invitedAt: string;
  acceptedAt?: string;
  revokedAt?: string;
}

interface Store {
  id: string;
  name: string;
}

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  manager: "Invite staff · manage stores · manage inventory · process orders",
  pharmacist: "Manage inventory · process orders",
  cashier: "Process orders only",
};

export default function VendorTeamPage() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [myRole, setMyRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    email: "",
    displayName: "",
    role: "cashier" as Role,
    storeIds: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sr, tr] = await Promise.all([
        fetch("/api/vendors/me/stores"),
        fetch("/api/vendors/me/staff"),
      ]);
      if (sr.ok) {
        const d = (await sr.json()) as { stores: Store[] };
        setStores(d.stores);
      }
      if (tr.ok) {
        const d = (await tr.json()) as { staff: StaffRow[]; myRole: string };
        setStaff(d.staff);
        setMyRole(d.myRole);
      } else {
        const d = await tr.json().catch(() => ({}));
        setError(d?.error || "Couldn't load team.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/vendors/me/staff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Couldn't invite.");
        return;
      }
      setForm({ email: "", displayName: "", role: "cashier", storeIds: [] });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const revoke = async (id: string) => {
    if (!confirm("Revoke this team member's access?")) return;
    const res = await fetch(`/api/vendors/me/staff/${id}`, { method: "DELETE" });
    if (res.ok) await load();
  };

  const changeRole = async (id: string, role: Role) => {
    const res = await fetch(`/api/vendors/me/staff/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) await load();
  };

  const active = staff.filter((s) => s.status !== "revoked");
  const revoked = staff.filter((s) => s.status === "revoked");

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-5">
          <Link href="/dashboard/vendor" className="text-xs text-gray-500 hover:underline">
            ← Back to dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">Team access</h1>
          <p className="text-sm text-gray-500">
            Invite pharmacists and cashiers to your pharmacy. Each role has different permissions.
          </p>
          {myRole && (
            <p className="mt-1 text-[11px] uppercase tracking-wider text-gray-400">
              You are signed in as: {myRole}
            </p>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Active + invited */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">
            Staff ({active.length})
          </h2>
          {loading ? (
            <p className="mt-3 text-sm text-gray-500">Loading…</p>
          ) : active.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">
              No staff yet. Invite someone below to share the load.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-gray-100">
              {active.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {s.displayName || s.email}
                    </p>
                    <p className="text-xs text-gray-500">
                      {s.email} ·{" "}
                      <StatusPill status={s.status} />
                    </p>
                    <p className="mt-1 text-[11px] text-gray-400">
                      {s.storeIds.length === 0
                        ? "All stores"
                        : s.storeIds
                            .map((id) => stores.find((st) => st.id === id)?.name || id)
                            .join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={s.role}
                      onChange={(e) => changeRole(s.id, e.target.value as Role)}
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs"
                    >
                      {(Object.keys(ROLE_DESCRIPTIONS) as Role[]).map((r) => (
                        <option key={r} value={r} disabled={r === "manager" && myRole !== "owner"}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => revoke(s.id)}
                      className="rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Revoke
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Invite form */}
        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">
            Invite someone
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            They&apos;ll claim access the next time they sign in with this email.
          </p>
          <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold uppercase text-gray-500">Email</span>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="pharmacist@example.com"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase text-gray-500">Display name (optional)</span>
              <input
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Neha Iyer"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase text-gray-500">Role</span>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                {(Object.keys(ROLE_DESCRIPTIONS) as Role[]).map((r) => (
                  <option key={r} value={r} disabled={r === "manager" && myRole !== "owner"}>
                    {r}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-[11px] text-gray-500">
                {ROLE_DESCRIPTIONS[form.role]}
              </span>
            </label>

            <fieldset className="block sm:col-span-2">
              <legend className="text-xs font-semibold uppercase text-gray-500">
                Store scope
              </legend>
              <p className="text-[11px] text-gray-500">
                Leave unchecked to grant access across every store.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {stores.length === 0 && (
                  <span className="text-xs text-gray-500">
                    Add stores first — staff need somewhere to work.
                  </span>
                )}
                {stores.map((s) => {
                  const on = form.storeIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          storeIds: on
                            ? f.storeIds.filter((id) => id !== s.id)
                            : [...f.storeIds, s.id],
                        }))
                      }
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                        on ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {on ? "✓ " : ""}
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? "Sending invite…" : "Send invite"}
              </button>
            </div>
          </form>
        </section>

        {revoked.length > 0 && (
          <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">
              Revoked ({revoked.length})
            </h2>
            <ul className="mt-3 divide-y divide-gray-100 text-sm text-gray-500">
              {revoked.map((s) => (
                <li key={s.id} className="flex justify-between py-2">
                  <span>
                    {s.displayName || s.email} · {s.role}
                  </span>
                  <span className="text-[11px]">
                    Revoked {s.revokedAt && new Date(s.revokedAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, { bg: string; text: string; label: string }> = {
    invited: { bg: "bg-amber-100", text: "text-amber-800", label: "Invited" },
    active: { bg: "bg-emerald-100", text: "text-emerald-800", label: "Active" },
    revoked: { bg: "bg-gray-100", text: "text-gray-600", label: "Revoked" },
  };
  const m = map[status];
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${m.bg} ${m.text}`}>
      {m.label}
    </span>
  );
}
