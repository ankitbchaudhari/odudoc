// Payroll v1 admin page — Ecosystem Spec §15.
// Five salary models. Monthly calculation against existing encounter
// data. No bank-transfer, no tax engine — flat tax % per row.

"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHero, StatGrid, StatCard, EmptyState } from "@/components/admin/PageShell";
import { StatusBadge } from "@/components/admin/StatusBadge";
import type { SalaryConfig, SalaryModel, PayslipLine } from "@/lib/payroll-store";

const MODEL_LABEL: Record<SalaryModel, string> = {
  monthly_fixed: "Monthly fixed",
  per_patient: "Per-patient fee",
  per_visit: "Per-visit charge",
  hybrid: "Hybrid (base + bonus)",
  revenue_share: "Revenue share",
};

const MODEL_HELP: Record<SalaryModel, string> = {
  monthly_fixed: "Fixed pay regardless of patient volume. Use for nurses, admin, support staff.",
  per_patient: "Doctor earns per consultation / admission. Rate × patient count this month.",
  per_visit: "Paid per visiting session (each check-in). Rate × visit count.",
  hybrid: "Base + bonus for patients above a threshold. Use for staff doctors with incentive.",
  revenue_share: "% of billing from this doctor's patients. v1 approximates via patient count × rate.",
};

interface FormState {
  membershipId: string;
  staffName: string;
  role: string;
  model: SalaryModel;
  baseMonthly: string;
  perPatientRate: string;
  hybridThreshold: string;
  perVisitRate: string;
  sharePercent: string;
  taxPercent: string;
  currency: string;
}

const EMPTY: FormState = {
  membershipId: "",
  staffName: "",
  role: "doctor",
  model: "monthly_fixed",
  baseMonthly: "",
  perPatientRate: "",
  hybridThreshold: "",
  perVisitRate: "",
  sharePercent: "",
  taxPercent: "",
  currency: "USD",
};

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function fmtMoney(n: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

export default function PayrollPage() {
  const [configs, setConfigs] = useState<SalaryConfig[]>([]);
  const [payslips, setPayslips] = useState<PayslipLine[]>([]);
  const [totals, setTotals] = useState<{ gross: number; tax: number; net: number }>({ gross: 0, tax: 0, net: 0 });
  const [month, setMonth] = useState(currentMonth());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function reload() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/payroll?run=${encodeURIComponent(month)}`, { cache: "no-store" });
      if (!r.ok) {
        if (r.status === 400 || r.status === 403) {
          setErr("Pick an organization from the header.");
          setConfigs([]); setPayslips([]); setTotals({ gross: 0, tax: 0, net: 0 });
          return;
        }
        throw new Error(`HTTP ${r.status}`);
      }
      const data = await r.json();
      setConfigs(data.configs ?? []);
      setPayslips(data.payslips ?? []);
      setTotals(data.totals ?? { gross: 0, tax: 0, net: 0 });
    } catch {
      setErr("Failed to load payroll.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [month]);

  async function save() {
    if (!form.staffName.trim() || !form.role.trim()) {
      alert("Staff name and role are required.");
      return;
    }
    if (!form.membershipId.trim()) {
      // For v1, allow free-form id so super-admin can set salary even
      // before memberships are wired.
      form.membershipId = `staff_${form.staffName.toLowerCase().replace(/\W+/g, "_")}`;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          baseMonthly: form.baseMonthly === "" ? undefined : Number(form.baseMonthly),
          perPatientRate: form.perPatientRate === "" ? undefined : Number(form.perPatientRate),
          hybridThreshold: form.hybridThreshold === "" ? undefined : Number(form.hybridThreshold),
          perVisitRate: form.perVisitRate === "" ? undefined : Number(form.perVisitRate),
          sharePercent: form.sharePercent === "" ? undefined : Number(form.sharePercent),
          taxPercent: form.taxPercent === "" ? undefined : Number(form.taxPercent),
        }),
      });
      if (!r.ok) throw new Error();
      setForm(EMPTY);
      setEditingId(null);
      await reload();
    } catch {
      alert("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this salary configuration?")) return;
    setSaving(true);
    try {
      await fetch("/api/payroll", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await reload();
    } finally {
      setSaving(false);
    }
  }

  function startEdit(c: SalaryConfig) {
    setEditingId(c.id);
    setForm({
      membershipId: c.membershipId,
      staffName: c.staffName,
      role: c.role,
      model: c.model,
      baseMonthly: c.baseMonthly?.toString() ?? "",
      perPatientRate: c.perPatientRate?.toString() ?? "",
      hybridThreshold: c.hybridThreshold?.toString() ?? "",
      perVisitRate: c.perVisitRate?.toString() ?? "",
      sharePercent: c.sharePercent?.toString() ?? "",
      taxPercent: c.taxPercent?.toString() ?? "",
      currency: c.currency,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const payslipsByConfig = useMemo(() => {
    const m = new Map<string, PayslipLine>();
    for (const p of payslips) m.set(p.configId, p);
    return m;
  }, [payslips]);

  const currency = configs[0]?.currency ?? "USD";

  return (
    <div className="space-y-6">
      <PageHero
        icon="💰"
        eyebrow="HR & Operations"
        title="Payroll"
        subtitle="Configure salary models per staff. Five models supported: fixed, per-patient, per-visit, hybrid, revenue-share."
        tone="emerald"
      />

      {err && <p className="admin-empty-callout">{err}</p>}

      {!err && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pay month</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm"
              />
            </div>
            <div className="text-xs text-slate-500">
              Calculation reads encounters in the selected month and matches doctor names to memberships.
            </div>
          </div>

          <StatGrid label={`Payroll run · ${month}`} cols={4}>
            <StatCard label="Active staff" value={configs.filter((c) => c.active).length} tone="emerald" />
            <StatCard label="Gross" value={fmtMoney(totals.gross, currency)} tone="indigo" />
            <StatCard label="Tax" value={fmtMoney(totals.tax, currency)} tone="amber" />
            <StatCard label="Net payable" value={fmtMoney(totals.net, currency)} tone="violet" />
          </StatGrid>

          {/* Form */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              {editingId ? "Edit salary configuration" : "Add salary configuration"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">{MODEL_HELP[form.model]}</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Staff name">
                <input
                  type="text"
                  value={form.staffName}
                  onChange={(e) => setForm({ ...form, staffName: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Dr. Asha Verma"
                />
              </Field>
              <Field label="Role">
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  {["doctor","nurse","receptionist","lab_tech","pharmacist","admin","accountant","staff"].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </Field>
              <Field label="Salary model">
                <select
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value as SalaryModel })}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  {(Object.keys(MODEL_LABEL) as SalaryModel[]).map((m) => (
                    <option key={m} value={m}>{MODEL_LABEL[m]}</option>
                  ))}
                </select>
              </Field>

              {(form.model === "monthly_fixed" || form.model === "hybrid") && (
                <Field label="Base monthly">
                  <input type="number" value={form.baseMonthly} onChange={(e) => setForm({ ...form, baseMonthly: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" />
                </Field>
              )}
              {(form.model === "per_patient" || form.model === "hybrid" || form.model === "revenue_share") && (
                <Field label="Per-patient rate">
                  <input type="number" value={form.perPatientRate} onChange={(e) => setForm({ ...form, perPatientRate: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" />
                </Field>
              )}
              {form.model === "hybrid" && (
                <Field label="Bonus threshold (patients)">
                  <input type="number" value={form.hybridThreshold} onChange={(e) => setForm({ ...form, hybridThreshold: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" />
                </Field>
              )}
              {form.model === "per_visit" && (
                <Field label="Per-visit rate">
                  <input type="number" value={form.perVisitRate} onChange={(e) => setForm({ ...form, perVisitRate: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" />
                </Field>
              )}
              {form.model === "revenue_share" && (
                <Field label="Share %">
                  <input type="number" value={form.sharePercent} onChange={(e) => setForm({ ...form, sharePercent: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" placeholder="e.g. 30" />
                </Field>
              )}

              <Field label="Tax / TDS %">
                <input type="number" value={form.taxPercent} onChange={(e) => setForm({ ...form, taxPercent: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" placeholder="0" />
              </Field>
              <Field label="Currency">
                <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                  {["USD","INR","EUR","GBP","AED","SGD"].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={save}
                disabled={saving}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                {editingId ? "Save changes" : "Add staff"}
              </button>
              {editingId && (
                <button
                  onClick={() => { setEditingId(null); setForm(EMPTY); }}
                  className="rounded-lg bg-white px-5 py-2 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                >
                  Cancel
                </button>
              )}
            </div>
          </section>

          {/* Payslip table */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-100 px-5 py-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Payslips · {month}</h2>
            </header>
            {loading ? (
              <p className="p-5 text-sm text-slate-500">Loading…</p>
            ) : configs.length === 0 ? (
              <EmptyState
                icon="🧾"
                title="No salary configurations yet"
                body="Add at least one staff configuration above to see the monthly run."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-2 text-left">Staff</th>
                      <th className="px-4 py-2 text-left">Role</th>
                      <th className="px-4 py-2 text-left">Model</th>
                      <th className="px-4 py-2 text-right">Inputs</th>
                      <th className="px-4 py-2 text-right">Gross</th>
                      <th className="px-4 py-2 text-right">Tax</th>
                      <th className="px-4 py-2 text-right">Net</th>
                      <th className="px-4 py-2 text-right">Status</th>
                      <th className="px-4 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {configs.map((c) => {
                      const p = payslipsByConfig.get(c.id);
                      return (
                        <tr key={c.id}>
                          <td className="px-4 py-2 font-medium text-slate-900">{c.staffName}</td>
                          <td className="px-4 py-2 text-slate-600">{c.role}</td>
                          <td className="px-4 py-2 text-slate-600">{MODEL_LABEL[c.model]}</td>
                          <td className="px-4 py-2 text-right text-xs text-slate-500">
                            {p?.inputs.patientCount != null && `${p.inputs.patientCount} pt `}
                            {p?.inputs.visitCount != null && `${p.inputs.visitCount} visit `}
                            {p?.inputs.rate != null && `@ ${fmtMoney(p.inputs.rate, c.currency)}`}
                            {p?.inputs.threshold != null && ` thr ${p.inputs.threshold}`}
                            {p?.inputs.sharePercent != null && ` ${p.inputs.sharePercent}%`}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums">{p ? fmtMoney(p.gross, c.currency) : "—"}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-amber-700">{p ? fmtMoney(p.tax, c.currency) : "—"}</td>
                          <td className="px-4 py-2 text-right font-semibold tabular-nums text-emerald-700">{p ? fmtMoney(p.net, c.currency) : "—"}</td>
                          <td className="px-4 py-2 text-right">
                            <StatusBadge color={c.active ? "green" : "gray"} label={c.active ? "Active" : "Paused"} size="sm" />
                          </td>
                          <td className="px-4 py-2 text-right">
                            <button onClick={() => startEdit(c)} className="rounded-md px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50">Edit</button>
                            <button onClick={() => remove(c.id)} className="rounded-md px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50">Delete</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <p className="text-[11px] text-slate-400">
            v1 limitations: revenue-share is approximated; no bank-transfer integration; tax is a flat % per staff (no country tax engine).
          </p>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      {children}
    </label>
  );
}
