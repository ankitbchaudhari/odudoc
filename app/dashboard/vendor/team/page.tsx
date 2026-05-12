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
import SharedBadge from "@/components/StatusBadge";

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/40 to-pink-50/40 py-10">
      <div className="mx-auto max-w-4xl px-4">
        <Link href="/dashboard/vendor" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 transition-colors hover:text-violet-600">
          ← Back to dashboard
        </Link>

        {/* Hero */}
        <div className="relative mt-4 mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-8 text-white shadow-xl">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-pink-300/30 blur-3xl" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
              Pharmacy · Team
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Team access</h1>
            <p className="mt-2 max-w-md text-sm text-white/90">
              Invite pharmacists and cashiers to your pharmacy. Each role has different permissions.
            </p>
            {myRole && (
              <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm ring-1 ring-white/30">
                Signed in as · {myRole}
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Active + invited */}
        <section className="rounded-3xl border border-white/60 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-slate-300">
            Staff ({active.length})
          </h2>
          {loading ? (
            <p className="mt-3 text-sm text-gray-500 dark:text-slate-400">Loading…</p>
          ) : active.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500 dark:text-slate-400">
              No staff yet. Invite someone below to share the load.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-gray-100 dark:divide-slate-800">
              {active.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                      {s.displayName || s.email}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {s.email} ·{" "}
                      <StatusPill status={s.status} />
                    </p>
                    <p className="mt-1 text-[11px] text-gray-400 dark:text-slate-500">
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
                      className="rounded-md border border-gray-300 dark:border-slate-700 px-2 py-1 text-xs"
                    >
                      {(Object.keys(ROLE_DESCRIPTIONS) as Role[]).map((r) => (
                        <option key={r} value={r} disabled={r === "manager" && myRole !== "owner"}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => revoke(s.id)}
                      className="rounded-md border border-red-200 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
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
        <section className="mt-6 rounded-3xl border border-white/60 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-slate-300">
            Invite someone
          </h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
            They&apos;ll claim access the next time they sign in with this email.
          </p>
          <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Email</span>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm"
                placeholder="pharmacist@example.com"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Display name (optional)</span>
              <input
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm"
                placeholder="Neha Iyer"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Role</span>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm"
              >
                {(Object.keys(ROLE_DESCRIPTIONS) as Role[]).map((r) => (
                  <option key={r} value={r} disabled={r === "manager" && myRole !== "owner"}>
                    {r}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-[11px] text-gray-500 dark:text-slate-400">
                {ROLE_DESCRIPTIONS[form.role]}
              </span>
            </label>

            <fieldset className="block sm:col-span-2">
              <legend className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">
                Store scope
              </legend>
              <p className="text-[11px] text-gray-500 dark:text-slate-400">
                Leave unchecked to grant access across every store.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {stores.length === 0 && (
                  <span className="text-xs text-gray-500 dark:text-slate-400">
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
                      className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                        on
                          ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-sm"
                          : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-violet-300"
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
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-50"
              >
                {saving ? "Sending invite…" : "✉ Send invite"}
              </button>
            </div>
          </form>
        </section>

        {revoked.length > 0 && (
          <section className="mt-6 rounded-3xl border border-white/60 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-slate-300">
              Revoked ({revoked.length})
            </h2>
            <ul className="mt-3 divide-y divide-gray-100 dark:divide-slate-800 text-sm text-gray-500 dark:text-slate-400">
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

// Maps the local invited/active/revoked staff statuses to the canonical
// clinical-tones keys so the staff list shares the platform-wide
// pill grammar.
function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, { tone: import("@/lib/clinical-tones").ToneKey; label: string }> = {
    invited: { tone: "pending",   label: "Invited" },
    active:  { tone: "completed", label: "Active" },
    revoked: { tone: "neutral",   label: "Revoked" },
  };
  const m = map[status];
  return <SharedBadge status={m.tone} label={m.label} />;
}
