"use client";

// Clinic staff management — owner adds nurse / front desk / extra
// doctors by email. Each staff member must already have an OduDoc
// account; once they're on the list, signing in puts them inside
// this owner's clinic with the assigned role.
//
// Plan tiers (enforced server-side, mirrored here for UX):
//   Free     → 1 nurse + 1 front desk + 0 staff doctors
//   $50/mo   → 3 nurse + 3 front desk + 3 staff doctors
//   Beyond   → /corporate (multi-clinic / hospital tier)
// The clinic owner (the doctor logged in) is automatic and is NOT
// counted against any of these caps.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface StaffRow {
  id: string;
  staffEmail: string;
  staffName?: string;
  role: "doctor" | "nurse" | "frontdesk";
  invitedBy: string;
  createdAt: string;
}

interface QuotaInfo {
  month: string;
  unlocked: boolean;
  unlockAmount: number;
  staffLimits: { nurse: number; frontdesk: number; doctor: number };
  staffUsage: { nurse: number; frontdesk: number; doctor: number };
}

const ROLE_META: Record<StaffRow["role"], { label: string; tone: string; description: string; key: keyof QuotaInfo["staffUsage"] }> = {
  doctor: {
    label: "Doctor",
    tone: "from-indigo-100 to-violet-100 text-indigo-700 ring-indigo-100",
    description: "Full clinical write access. Can manage patients, visits, files, invoices, certificates.",
    key: "doctor",
  },
  nurse: {
    label: "Nurse",
    tone: "from-emerald-100 to-teal-100 text-emerald-700 ring-emerald-100",
    description: "Writes visits + uploads files. Reads patients and invoices. Cannot issue certificates.",
    key: "nurse",
  },
  frontdesk: {
    label: "Front desk",
    tone: "from-amber-100 to-orange-100 text-amber-700 ring-amber-100",
    description: "Registers patients, raises invoices, uploads files. No clinical notes or certificates.",
    key: "frontdesk",
  },
};

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showPaywall, setShowPaywall] = useState<"limit-hit" | null>(null);
  const [paywallContext, setPaywallContext] = useState<{
    role: StaffRow["role"];
    error: string;
  } | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [form, setForm] = useState({
    staffEmail: "",
    staffName: "",
    role: "frontdesk" as StaffRow["role"],
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/emr/staff");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not load staff");
      }
      const data = await res.json();
      setStaff(data.staff || []);
      setQuota(data.quota || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function inviteStaff(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/emr/staff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.status === 402) {
        // Limit hit. Surface paywall instead of a flat error.
        setShowInvite(false);
        setPaywallContext({ role: form.role, error: data.error || "Limit reached" });
        setShowPaywall("limit-hit");
        if (data.quota) setQuota(data.quota);
        return;
      }
      if (!res.ok) throw new Error(data.error || "Invite failed");
      setForm({ staffEmail: "", staffName: "", role: "frontdesk" });
      setShowInvite(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setSaving(false);
    }
  }

  async function startUnlock() {
    setUnlocking(true);
    try {
      const res = await fetch("/api/emr/quota/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Checkout failed");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setUnlocking(false);
    }
  }

  async function removeStaff(id: string) {
    if (!confirm("Remove this staff member from your clinic?")) return;
    try {
      const res = await fetch(`/api/emr/staff?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Remove failed");
      }
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed");
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 py-10">
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute -top-40 left-1/2 h-[420px] w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-200/40 via-violet-200/40 to-fuchsia-200/40 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard/doctor/emr"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
          >
            ← Clinic records
          </Link>
          <button
            onClick={() => setShowInvite(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30"
          >
            + Invite staff
          </button>
        </div>

        <div className="mb-6 overflow-hidden rounded-3xl border border-white/60 bg-white/80 shadow-xl shadow-indigo-500/5 backdrop-blur-xl">
          <div className="border-b border-slate-100 px-6 py-5">
            <h1 className="text-2xl font-bold text-slate-900">Clinic staff</h1>
            <p className="mt-1 text-sm text-slate-600">
              You — the clinic owner — are automatically on the team. Add
              additional nurse, front desk, and (with the unlock) staff
              doctors below.
            </p>
          </div>

          {/* Plan + usage cards */}
          {quota && (
            <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  {quota.unlocked
                    ? `Unlocked plan · ${quota.month}`
                    : "Free plan"}
                </p>
                {!quota.unlocked && (
                  <button
                    onClick={() => {
                      setPaywallContext(null);
                      setShowPaywall("limit-hit");
                    }}
                    className="text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    Upgrade for $50/month →
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {(["nurse", "frontdesk", "doctor"] as const).map((roleKey) => {
                  const meta = ROLE_META[roleKey];
                  const used = quota.staffUsage[meta.key];
                  const limit = quota.staffLimits[meta.key];
                  const full = used >= limit;
                  return (
                    <div
                      key={roleKey}
                      className={`rounded-2xl border bg-white p-4 ${
                        full ? "border-rose-200" : "border-slate-200"
                      }`}
                    >
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        {meta.label}
                      </p>
                      <p
                        className={`mt-1 text-2xl font-bold tabular-nums ${
                          full ? "text-rose-700" : "text-slate-900"
                        }`}
                      >
                        {used}
                        <span className="text-base font-normal text-slate-500">
                          {" "}
                          / {limit}
                        </span>
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {full
                          ? quota.unlocked
                            ? "Limit reached — Corporate plan needed"
                            : "Limit reached — unlock or Corporate"
                          : limit === 0
                            ? "Unlock to add staff doctors"
                            : `${limit - used} seat${limit - used === 1 ? "" : "s"} left`}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {error && (
            <div className="m-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-3 p-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : staff.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm font-semibold text-slate-700">
                You haven&apos;t added any staff yet
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Click <b>+ Invite staff</b> to bring nurses or front-desk staff into your clinic.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {staff.map((s) => {
                const meta = ROLE_META[s.role];
                return (
                  <li key={s.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-fuchsia-100 text-sm font-bold text-indigo-700 ring-2 ring-white">
                      {(s.staffName || s.staffEmail)[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {s.staffName || s.staffEmail}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {s.staffEmail}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span
                        className={`rounded-full bg-gradient-to-r ${meta.tone} px-3 py-0.5 text-[11px] font-semibold ring-1`}
                      >
                        {meta.label}
                      </span>
                      <button
                        onClick={() => removeStaff(s.id)}
                        className="text-[11px] font-semibold text-rose-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Role legend */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(Object.keys(ROLE_META) as Array<keyof typeof ROLE_META>).map((k) => (
            <div
              key={k}
              className="rounded-2xl border border-white/60 bg-white/70 p-4 backdrop-blur"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full bg-gradient-to-r ${ROLE_META[k].tone} px-2.5 py-0.5 text-[11px] font-semibold ring-1`}
                >
                  {ROLE_META[k].label}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                {ROLE_META[k].description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {showInvite && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowInvite(false)}
        >
          <form
            onSubmit={inviteStaff}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-slate-900">Invite staff</h3>
            <p className="mt-1 text-xs text-slate-500">
              They must already have an OduDoc account with this email.
            </p>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-700">
                  Staff email *
                </span>
                <input
                  type="email"
                  required
                  value={form.staffEmail}
                  onChange={(e) => setForm({ ...form, staffEmail: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-700">
                  Display name
                </span>
                <input
                  value={form.staffName}
                  onChange={(e) => setForm({ ...form, staffName: e.target.value })}
                  placeholder="Optional"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-700">Role</span>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as StaffRow["role"] })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                >
                  <option value="frontdesk">Front desk</option>
                  <option value="nurse">Nurse</option>
                  <option value="doctor">Doctor</option>
                </select>
                {quota && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Currently using {quota.staffUsage[form.role === "frontdesk" ? "frontdesk" : form.role]} of {quota.staffLimits[form.role === "frontdesk" ? "frontdesk" : form.role]} {form.role === "frontdesk" ? "front desk" : `${form.role}`} seats.
                  </p>
                )}
              </label>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 disabled:opacity-50"
              >
                {saving ? "Inviting…" : "Send invite"}
              </button>
            </div>
          </form>
        </div>
      )}

      {showPaywall && quota && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
          onClick={() => setShowPaywall(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <div className="bg-gradient-to-br from-indigo-50 via-violet-50 to-fuchsia-50 px-6 py-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                Plan upgrade
              </p>
              <h3 className="mt-1 text-xl font-bold text-slate-900">
                Bigger team? Pick a plan that fits.
              </h3>
              {paywallContext && (
                <p className="mt-1 text-sm text-slate-600">
                  {paywallContext.error}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 p-6 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Free
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">$0</p>
                <ul className="mt-3 space-y-1 text-xs text-slate-600">
                  <li>✓ 1 nurse</li>
                  <li>✓ 1 front desk</li>
                  <li className="text-slate-400">— No staff doctors</li>
                  <li>✓ 50 patients / month</li>
                </ul>
                <p className="mt-3 text-[11px] font-semibold text-slate-500">
                  {quota.unlocked ? "Includes free tier" : "Current plan"}
                </p>
              </div>
              <div className="rounded-2xl border-2 border-indigo-500 bg-gradient-to-br from-indigo-50 to-fuchsia-50 p-4 ring-2 ring-indigo-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                  {quota.unlocked ? "Current plan" : "Recommended"}
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  $50<span className="text-sm font-normal text-slate-500">/mo</span>
                </p>
                <ul className="mt-3 space-y-1 text-xs text-slate-700">
                  <li>✓ 3 nurses</li>
                  <li>✓ 3 front desk</li>
                  <li>✓ 3 staff doctors</li>
                  <li>✓ Up to 250 patients / month</li>
                </ul>
                {quota.unlocked ? (
                  <p className="mt-3 text-[11px] font-semibold text-emerald-700">
                    Already on this plan
                  </p>
                ) : (
                  <button
                    onClick={startUnlock}
                    disabled={unlocking}
                    className="mt-3 w-full rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-3 py-2 text-xs font-semibold text-white shadow disabled:opacity-50"
                  >
                    {unlocking ? "Opening…" : "Buy unlock"}
                  </button>
                )}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Corporate
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">Talk to us</p>
                <ul className="mt-3 space-y-1 text-xs text-slate-700">
                  <li>✓ Unlimited staff &amp; roles</li>
                  <li>✓ Multiple clinics</li>
                  <li>✓ Hospital + admin tools</li>
                  <li>✓ BAA / DPA available</li>
                </ul>
                <Link
                  href="/corporate"
                  className="mt-3 block rounded-xl bg-slate-900 px-3 py-2 text-center text-xs font-semibold text-white hover:bg-indigo-600"
                >
                  Go to /corporate
                </Link>
              </div>
            </div>
            <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-3 text-right">
              <button
                onClick={() => setShowPaywall(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
