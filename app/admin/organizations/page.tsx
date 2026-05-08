"use client";

import { useCallback, useEffect, useState } from "react";

type OrgPlan = "trial" | "starter" | "clinic" | "hospital" | "enterprise";
type OrgStatus = "active" | "suspended" | "cancelled";

interface OrgModules {
  patient: boolean;
  opd: boolean;
  ipd: boolean;
  lab: boolean;
  pharmacy: boolean;
  billing: boolean;
  surgery: boolean;
  inventory: boolean;
  radiology: boolean;
  telemedicine: boolean;
  aiVoice: boolean;
}

interface Organization {
  id: string;
  slug: string;
  name: string;
  contactEmail: string;
  contactPhone?: string;
  country: string;
  plan: OrgPlan;
  status: OrgStatus;
  modules: OrgModules;
  trialEndsAt?: string;
  createdAt: string;
}

const PLANS: OrgPlan[] = ["trial", "starter", "clinic", "hospital", "enterprise"];
const STATUSES: OrgStatus[] = ["active", "suspended", "cancelled"];

// Must stay in sync with PLAN_MODULE_ENTITLEMENTS in lib/organizations-store.ts.
// Duplicated here (not fetched) so the disabled-state renders instantly as
// the operator flips the plan dropdown. Server still re-clamps on save —
// this is a UX hint, not a security boundary.
const PLAN_MODULES: Record<OrgPlan, (keyof OrgModules)[]> = {
  trial:      ["patient", "opd", "telemedicine"],
  starter:    ["patient", "opd", "telemedicine"],
  clinic:     ["patient", "opd", "lab", "pharmacy", "billing", "telemedicine"],
  hospital:   ["patient", "opd", "ipd", "lab", "pharmacy", "billing", "surgery", "inventory", "radiology", "telemedicine"],
  enterprise: ["patient", "opd", "ipd", "lab", "pharmacy", "billing", "surgery", "inventory", "radiology", "telemedicine", "aiVoice"],
};

const MODULE_LABELS: Record<keyof OrgModules, string> = {
  patient: "Patient Mgmt",
  opd: "OPD",
  ipd: "IPD",
  lab: "Lab",
  pharmacy: "Pharmacy",
  billing: "Billing",
  surgery: "Surgery / OT",
  inventory: "Inventory",
  radiology: "Radiology",
  telemedicine: "Telemedicine",
  aiVoice: "AI Voice",
};

const PLAN_COLORS: Record<OrgPlan, string> = {
  trial: "bg-gray-100 text-gray-700",
  starter: "bg-sky-100 text-sky-700",
  clinic: "bg-emerald-100 text-emerald-700",
  hospital: "bg-indigo-100 text-indigo-700",
  enterprise: "bg-purple-100 text-purple-700",
};

const STATUS_COLORS: Record<OrgStatus, string> = {
  active: "bg-emerald-100 text-emerald-700",
  suspended: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-700",
};

const DEFAULT_MODULES: OrgModules = {
  patient: true,
  opd: true,
  ipd: false,
  lab: false,
  pharmacy: false,
  billing: false,
  surgery: false,
  inventory: false,
  radiology: false,
  telemedicine: true,
  aiVoice: false,
};

interface RepairedStaff {
  name: string;
  email: string;
  password: string;
  title: string;
  action: "created" | "already_existed" | "membership_added";
}

export default function AdminOrganizations() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [repairingId, setRepairingId] = useState<string | null>(null);
  const [repairResult, setRepairResult] = useState<{ orgName: string; staff: RepairedStaff[] } | null>(null);
  // Surface every save / fetch failure so silent close-on-error
  // never happens again.
  const [saveError, setSaveError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    contactEmail: "",
    contactPhone: "",
    country: "",
    plan: "trial" as OrgPlan,
    status: "active" as OrgStatus,
    modules: { ...DEFAULT_MODULES },
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/organizations", { cache: "no-store" });
      if (r.ok) {
        const data = await r.json();
        setOrgs(data.organizations || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setForm({
      name: "",
      contactEmail: "",
      contactPhone: "",
      country: "",
      plan: "trial",
      status: "active",
      modules: { ...DEFAULT_MODULES },
    });
    setEditingId(null);
  };

  const handleEdit = (o: Organization) => {
    setForm({
      name: o.name,
      contactEmail: o.contactEmail,
      contactPhone: o.contactPhone || "",
      country: o.country,
      plan: o.plan,
      status: o.status,
      modules: { ...o.modules },
    });
    setEditingId(o.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaveError(null);
    if (!form.name.trim()) {
      setSaveError("Organization name is required.");
      return;
    }
    if (!form.contactEmail.trim()) {
      setSaveError("Contact email is required.");
      return;
    }
    // Light email sanity check — server validates again, but giving
    // the operator immediate feedback beats waiting for a 400.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim())) {
      setSaveError("Contact email doesn't look valid.");
      return;
    }
    setSaving(true);
    try {
      const r = editingId
        ? await fetch("/api/organizations", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editingId, ...form }),
          })
        : await fetch("/api/organizations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          });
      if (!r.ok) {
        // Translate the server's machine codes into operator copy.
        // The `forbidden` 403 is the trickiest — that's a "you're
        // signed in as plain admin, not super admin" issue.
        const body = await r.json().catch(() => ({} as Record<string, unknown>));
        const code = (body as { error?: string }).error || "";
        const msg =
          code === "forbidden"
            ? "Only Super Admins can create organizations. Sign in with a super-admin account, or ask one to add yours to lib/tenant.ts SUPER_ADMIN_EMAILS."
            : code === "missing_fields"
              ? "Organization name and contact email are required."
              : code === "not_found"
                ? "That organization no longer exists. Refresh the list."
                : code || `Save failed (HTTP ${r.status}).`;
        setSaveError(msg);
        return;
      }
      setShowForm(false);
      resetForm();
      await load();
    } catch (err) {
      setSaveError((err as Error).message || "Save failed — network error.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this organization and all its memberships?")) return;
    await fetch("/api/organizations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  };

  const allowedForPlan = new Set<keyof OrgModules>(PLAN_MODULES[form.plan]);

  const toggleModule = (key: keyof OrgModules) => {
    // No-op if the current plan doesn't entitle this module. The backend
    // would clamp it anyway, but bailing here keeps the UI honest.
    if (!allowedForPlan.has(key)) return;
    setForm({ ...form, modules: { ...form.modules, [key]: !form.modules[key] } });
  };

  // When the plan changes, force-disable any modules that aren't in the new
  // plan's entitlement so the operator sees exactly what they'll get.
  const handlePlanChange = (plan: OrgPlan) => {
    const allowed = new Set<keyof OrgModules>(PLAN_MODULES[plan]);
    const nextModules = { ...form.modules };
    (Object.keys(nextModules) as (keyof OrgModules)[]).forEach((k) => {
      if (!allowed.has(k)) nextModules[k] = false;
    });
    setForm({ ...form, plan, modules: nextModules });
  };

  const handleRepairStaff = async (o: Organization) => {
    if (!confirm(
      `Repair demo staff for "${o.name}"?\n\n` +
      `This re-creates the 3 doctors + 1 receptionist using the same emails and passwords as the original seed, so any previously-emailed credentials will work again. Existing users are left alone.`
    )) return;
    setRepairingId(o.id);
    setRepairResult(null);
    try {
      const r = await fetch("/api/admin/super/repair-demo-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: o.id }),
      });
      if (r.ok) {
        const data = await r.json();
        setRepairResult({ orgName: o.name, staff: data.staff || [] });
      } else {
        const err = await r.json().catch(() => ({}));
        alert(`Repair failed: ${err.error || r.statusText}`);
      }
    } catch (e) {
      alert(`Repair failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRepairingId(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Organizations</h2>
          <p className="mt-1 text-sm text-gray-500">
            {orgs.length} tenants · {orgs.filter((o) => o.status === "active").length} active
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setSaveError(null);
            setShowForm(!showForm);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Organization
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            {editingId ? "Edit Organization" : "Add Organization"}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                placeholder="Apollo Hospitals Hyderabad"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Contact email</label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
              <input
                type="text"
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Country</label>
              <input
                type="text"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Plan</label>
              <select
                value={form.plan}
                onChange={(e) => handlePlanChange(e.target.value as OrgPlan)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm capitalize outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              >
                {PLANS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as OrgStatus })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm capitalize outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Enabled modules
                <span className="ml-2 text-[11px] font-normal text-gray-400">
                  · greyed modules aren&rsquo;t included in the <span className="capitalize">{form.plan}</span> plan
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(MODULE_LABELS) as (keyof OrgModules)[]).map((key) => {
                  const allowed = allowedForPlan.has(key);
                  const on = form.modules[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleModule(key)}
                      disabled={!allowed}
                      title={allowed ? undefined : `Not available on the ${form.plan} plan — upgrade to enable`}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        !allowed
                          ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300"
                          : on
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-gray-300 bg-white text-gray-500 hover:border-indigo-300"
                      }`}
                    >
                      {MODULE_LABELS[key]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          {saveError && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              <p className="font-semibold">Couldn&apos;t save the organization</p>
              <p className="mt-1">{saveError}</p>
            </div>
          )}
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : editingId ? "Update" : "Save"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setSaveError(null);
                resetForm();
              }}
              className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                <th className="px-4 py-3 font-medium">Organization</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Modules</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => {
                const enabledCount = Object.values(o.modules).filter(Boolean).length;
                return (
                  <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{o.name}</p>
                      <p className="text-xs text-gray-400">{o.slug} · {o.country || "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">{o.contactEmail}</p>
                      {o.contactPhone && <p className="text-xs text-gray-400">{o.contactPhone}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${PLAN_COLORS[o.plan]}`}>
                        {o.plan}
                      </span>
                      {o.trialEndsAt && o.plan === "trial" && (
                        <p className="mt-1 text-[10px] text-gray-400">
                          ends {new Date(o.trialEndsAt).toLocaleDateString()}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_COLORS[o.status]}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {enabledCount} / {Object.keys(o.modules).length}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(o)}
                          title="Edit"
                          className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleRepairStaff(o)}
                          disabled={repairingId === o.id}
                          title="Repair demo staff users (for orgs seeded before the flush-race fix)"
                          className="rounded p-1.5 text-gray-400 hover:bg-amber-50 hover:text-amber-600 disabled:opacity-40"
                        >
                          {repairingId === o.id ? (
                            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <circle cx="12" cy="12" r="10" strokeWidth={3} className="opacity-25" />
                              <path strokeLinecap="round" strokeWidth={3} d="M22 12a10 10 0 00-10-10" />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(o.id)}
                          title="Delete"
                          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && orgs.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">No organizations yet.</div>
        )}
        {loading && <div className="py-12 text-center text-sm text-gray-400">Loading…</div>}
      </div>

      {repairResult && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setRepairResult(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Staff repaired</h2>
                <p className="mt-0.5 text-[13px] text-slate-500">
                  {repairResult.orgName} — credentials below match the original seed email.
                </p>
              </div>
              <button
                onClick={() => setRepairResult(null)}
                className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-2">
              {repairResult.staff.map((s) => (
                <div
                  key={s.email}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-800">{s.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide ${
                        s.action === "created"
                          ? "bg-emerald-100 text-emerald-700"
                          : s.action === "membership_added"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {s.action === "created"
                        ? "created"
                        : s.action === "membership_added"
                        ? "membership added"
                        : "already existed"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11.5px] text-slate-500">{s.title}</p>
                  <p className="mt-1 font-mono text-[11.5px] text-slate-700">{s.email}</p>
                  <p className="font-mono text-[11.5px] text-slate-700">pw: {s.password}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setRepairResult(null)}
                className="rounded-lg bg-primary-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-primary-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
