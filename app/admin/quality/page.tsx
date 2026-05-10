"use client";

import { useEffect, useState } from "react";
import { PageHero, StatGrid, StatCard, TabSwitch, FilterChip } from "@/components/admin/PageShell";
import type {
  QualityIndicator, QualityMeasurement,
  IndicatorCategory, IndicatorStatus, Frequency, Direction,
} from "@/lib/hospital/quality-store";
// Inlined from quality-store — importing runtime values pulls persistent-array → Postgres into the client bundle and crashes the page.
const CATEGORY_LABEL: Record<IndicatorCategory, string> = {
  clinical: "Clinical",
  patient_safety: "Patient safety",
  service_quality: "Service quality",
  operational: "Operational",
  financial: "Financial",
  hr_nursing: "HR / Nursing",
  infection_control: "Infection control",
  medication: "Medication",
  nabh_mandatory: "NABH mandatory",
};
const FREQ_LABEL: Record<Frequency, string> = {
  daily: "Daily", weekly: "Weekly", monthly: "Monthly", quarterly: "Quarterly", annual: "Annual",
};
const DIRECTION_LABEL: Record<Direction, string> = {
  lower_better: "Lower is better", higher_better: "Higher is better", on_target: "On target",
};
const STATUS_LABEL: Record<IndicatorStatus, string> = {
  active: "Active", retired: "Retired", draft: "Draft",
};

const CATEGORIES: IndicatorCategory[] = ["clinical", "patient_safety", "service_quality", "operational", "financial", "hr_nursing", "infection_control", "medication", "nabh_mandatory"];
const STATUSES: IndicatorStatus[] = ["active", "retired", "draft"];
const FREQS: Frequency[] = ["daily", "weekly", "monthly", "quarterly", "annual"];
const DIRS: Direction[] = ["lower_better", "higher_better", "on_target"];

export default function QualityPage() {
  const [tab, setTab] = useState<"indicators" | "measurements">("indicators");
  const [indicators, setIndicators] = useState<QualityIndicator[]>([]);
  const [measurements, setMeasurements] = useState<QualityMeasurement[]>([]);
  const [stats, setStats] = useState<{ activeIndicators: number; mandatoryIndicators: number; measurementsMonth: number; missedMonth: number; missedQuarter: number; missedMissingRca: number; performancePct: number } | null>(null);
  const [showInd, setShowInd] = useState(false);
  const [showMeas, setShowMeas] = useState(false);
  const [editInd, setEditInd] = useState<QualityIndicator | null>(null);
  const [editMeas, setEditMeas] = useState<QualityMeasurement | null>(null);
  const [filterCategory, setFilterCategory] = useState<IndicatorCategory | "">("");
  const [missedOnly, setMissedOnly] = useState(false);

  async function load() {
    const qs = new URLSearchParams();
    if (filterCategory) qs.set("category", filterCategory);
    if (missedOnly) qs.set("missedOnly", "1");
    const res = await fetch(`/api/hospital/quality?${qs.toString()}`, { cache: "no-store" });
    const data = await res.json();
    setIndicators(data.indicators || []);
    setMeasurements(data.measurements || []);
    setStats(data.stats || null);
  }
  useEffect(() => { load(); }, [filterCategory, missedOnly]);

  async function removeInd(id: string) {
    if (!confirm("Delete indicator?")) return;
    await fetch("/api/hospital/quality", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }
  async function removeMeas(id: string) {
    if (!confirm("Delete measurement?")) return;
    await fetch("/api/hospital/quality", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, kind: "measurement" }) });
    load();
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHero
        icon="🏆"
        eyebrow="NABH"
        title="Quality Indicators (NABH)"
        subtitle="Definition, targets, periodic measurement, RCA / action plan"
        tone="violet"
        secondaryAction={{ label: "+ Indicator", onClick: () => { setEditInd(null); setShowInd(true); } }}
        primaryAction={{ label: "+ Measurement", onClick: () => { setEditMeas(null); setShowMeas(true); } }}
      />

      {stats && (
        <StatGrid cols={7}>
          <StatCard label="Active indicators" value={stats.activeIndicators} tone="slate" icon="📊" />
          <StatCard label="NABH mandatory" value={stats.mandatoryIndicators} tone="indigo" icon="★" />
          <StatCard label="Measurements (mo)" value={stats.measurementsMonth} tone="teal" icon="📈" />
          <StatCard label="Missed (mo)" value={stats.missedMonth} tone="rose" icon="✕" />
          <StatCard label="Missed (qtr)" value={stats.missedQuarter} tone="orange" icon="⚠" />
          <StatCard label="Missing RCA" value={stats.missedMissingRca} tone="amber" icon="🔍" />
          <StatCard label="Performance %" value={stats.performancePct} tone="emerald" icon="✓" />
        </StatGrid>
      )}

      <TabSwitch
        active={tab}
        onSelect={(k) => setTab(k as "indicators" | "measurements")}
        tabs={[
          { key: "indicators", label: "Indicators", count: indicators.length },
          { key: "measurements", label: "Measurements", count: measurements.length },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        {tab === "indicators" ? (
          <>
            <FilterChip active={filterCategory === ""} onClick={() => setFilterCategory("")}>All categories</FilterChip>
            {CATEGORIES.map((c) => <FilterChip key={c} active={filterCategory === c} onClick={() => setFilterCategory(c)}>{CATEGORY_LABEL[c]}</FilterChip>)}
          </>
        ) : (
          <FilterChip active={missedOnly} onClick={() => setMissedOnly(!missedOnly)}>Missed only</FilterChip>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {tab === "indicators" ? (
          indicators.length === 0 ? <Empty label="No indicators defined." /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Target</th>
                    <th className="px-4 py-3">Dir</th>
                    <th className="px-4 py-3">Freq</th>
                    <th className="px-4 py-3">Owner</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {indicators.map((ind) => (
                    <tr key={ind.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs">{ind.code}</td>
                      <td className="px-4 py-3 font-medium">{ind.name}</td>
                      <td className="px-4 py-3">{CATEGORY_LABEL[ind.category]}</td>
                      <td className="px-4 py-3">{ind.targetValue} {ind.unit}</td>
                      <td className="px-4 py-3 text-xs">{DIRECTION_LABEL[ind.direction]}</td>
                      <td className="px-4 py-3 text-xs">{FREQ_LABEL[ind.frequency]}</td>
                      <td className="px-4 py-3 text-xs">{ind.responsibleOwner || "-"}</td>
                      <td className="px-4 py-3"><Pill tone={ind.status === "active" ? "emerald" : ind.status === "retired" ? "slate" : "amber"}>{STATUS_LABEL[ind.status]}</Pill></td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => { setEditInd(ind); setShowInd(true); }} className="text-xs font-semibold text-primary-600 hover:underline">Edit</button>
                        <button onClick={() => removeInd(ind.id)} className="ml-3 text-xs font-semibold text-rose-600 hover:underline">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : measurements.length === 0 ? <Empty label="No measurements." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Indicator</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">N / D</th>
                  <th className="px-4 py-3">Value</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">Result</th>
                  <th className="px-4 py-3">RCA</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {measurements.map((m) => (
                  <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs">{m.indicatorCode}</td>
                    <td className="px-4 py-3 font-medium">{m.indicatorName}</td>
                    <td className="px-4 py-3">{m.periodLabel}</td>
                    <td className="px-4 py-3 text-xs">{m.numerator} / {m.denominator}</td>
                    <td className="px-4 py-3 font-semibold">{m.value}</td>
                    <td className="px-4 py-3">{m.target}</td>
                    <td className="px-4 py-3"><Pill tone={m.met ? "emerald" : "rose"}>{m.met ? "Met" : "Missed"}</Pill></td>
                    <td className="px-4 py-3 text-xs">{!m.met && !m.rootCauseNote ? <span className="text-amber-600 font-semibold">Missing</span> : (m.rootCauseNote ? "✓" : "-")}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { setEditMeas(m); setShowMeas(true); }} className="text-xs font-semibold text-primary-600 hover:underline">Edit</button>
                      <button onClick={() => removeMeas(m.id)} className="ml-3 text-xs font-semibold text-rose-600 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showInd && <IndicatorModal editing={editInd} onClose={() => setShowInd(false)} onSaved={() => { setShowInd(false); load(); }} />}
      {showMeas && <MeasurementModal indicators={indicators} editing={editMeas} onClose={() => setShowMeas(false)} onSaved={() => { setShowMeas(false); load(); }} />}
    </div>
  );
}

function IndicatorModal({ editing, onClose, onSaved }: { editing: QualityIndicator | null; onClose: () => void; onSaved: () => void; }) {
  const [code, setCode] = useState(editing?.code || "");
  const [name, setName] = useState(editing?.name || "");
  const [description, setDescription] = useState(editing?.description || "");
  const [category, setCategory] = useState<IndicatorCategory>(editing?.category || "clinical");
  const [numeratorDef, setNum] = useState(editing?.numeratorDef || "");
  const [denominatorDef, setDen] = useState(editing?.denominatorDef || "");
  const [unit, setUnit] = useState(editing?.unit || "%");
  const [direction, setDirection] = useState<Direction>(editing?.direction || "lower_better");
  const [targetValue, setTarget] = useState<number | "">(editing?.targetValue ?? "");
  const [benchmarkSource, setBench] = useState(editing?.benchmarkSource || "");
  const [frequency, setFrequency] = useState<Frequency>(editing?.frequency || "monthly");
  const [responsibleOwner, setOwner] = useState(editing?.responsibleOwner || "");
  const [status, setStatus] = useState<IndicatorStatus>(editing?.status || "active");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    if (!code || !name || !numeratorDef || !denominatorDef) { setErr("Fill required fields"); return; }
    setSaving(true); setErr("");
    const payload = {
      id: editing?.id,
      code, name, description: description || undefined,
      category, numeratorDef, denominatorDef, unit, direction,
      targetValue: targetValue === "" ? 0 : Number(targetValue),
      benchmarkSource: benchmarkSource || undefined,
      frequency, responsibleOwner: responsibleOwner || undefined, status,
    };
    const res = await fetch("/api/hospital/quality", { method: editing ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setErr(data.error || "Error"); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 border-b border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold">{editing ? "Edit indicator" : "New indicator"}</h2>
        </div>
        <div className="space-y-4 p-4">
          {err && <div className="rounded border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">{err}</div>}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Code (e.g. IPSG-1)"><input value={code} onChange={(e) => setCode(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Category">
              <select value={category} onChange={(e) => setCategory(e.target.value as IndicatorCategory)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {CATEGORIES.map((v) => <option key={v} value={v}>{CATEGORY_LABEL[v]}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Description"><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Numerator definition"><textarea value={numeratorDef} onChange={(e) => setNum(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Denominator definition"><textarea value={denominatorDef} onChange={(e) => setDen(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Field label="Unit">
              <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="% / per 1000 / days" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </Field>
            <Field label="Direction">
              <select value={direction} onChange={(e) => setDirection(e.target.value as Direction)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {DIRS.map((v) => <option key={v} value={v}>{DIRECTION_LABEL[v]}</option>)}
              </select>
            </Field>
            <Field label="Target value"><input type="number" step="0.01" value={targetValue} onChange={(e) => setTarget(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Frequency">
              <select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {FREQS.map((v) => <option key={v} value={v}>{FREQ_LABEL[v]}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Benchmark source"><input value={benchmarkSource} onChange={(e) => setBench(e.target.value)} placeholder="NABH / JCI / internal" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Owner"><input value={responsibleOwner} onChange={(e) => setOwner(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value as IndicatorStatus)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {STATUSES.map((v) => <option key={v} value={v}>{STATUS_LABEL[v]}</option>)}
              </select>
            </Field>
          </div>
        </div>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white p-4">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Cancel</button>
          <button disabled={saving} onClick={submit} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

function MeasurementModal({ indicators, editing, onClose, onSaved }: { indicators: QualityIndicator[]; editing: QualityMeasurement | null; onClose: () => void; onSaved: () => void; }) {
  const [indicatorId, setIndicatorId] = useState(editing?.indicatorId || "");
  const [periodLabel, setPeriodLabel] = useState(editing?.periodLabel || new Date().toISOString().slice(0, 7));
  const [periodStart, setPeriodStart] = useState(editing?.periodStart?.slice(0, 10) || "");
  const [periodEnd, setPeriodEnd] = useState(editing?.periodEnd?.slice(0, 10) || "");
  const [numerator, setNumerator] = useState<number | "">(editing?.numerator ?? "");
  const [denominator, setDenominator] = useState<number | "">(editing?.denominator ?? "");
  const [rootCauseNote, setRca] = useState(editing?.rootCauseNote || "");
  const [actionPlan, setAction] = useState(editing?.actionPlan || "");
  const [reportedBy, setReportedBy] = useState(editing?.reportedBy || "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const selected = indicators.find((i) => i.id === indicatorId);
  const n = Number(numerator || 0);
  const d = Number(denominator || 0);
  let preview: string = "-";
  if (selected && d > 0) {
    let v = n / d;
    const u = selected.unit.toLowerCase();
    if (u.includes("%")) v *= 100;
    else if (u.includes("per 1000") || u.includes("/1000")) v *= 1000;
    else if (u.includes("per 100") || u.includes("/100")) v *= 100;
    else if (u.includes("per 10000") || u.includes("/10000")) v *= 10000;
    preview = `${Math.round(v * 100) / 100} ${selected.unit} (target ${selected.targetValue} · ${DIRECTION_LABEL[selected.direction]})`;
  }

  async function submit() {
    if (!indicatorId || numerator === "" || denominator === "" || !periodLabel) { setErr("Fill required fields"); return; }
    setSaving(true); setErr("");
    const payload = {
      kind: "measurement",
      id: editing?.id,
      indicatorId,
      periodLabel,
      periodStart: periodStart ? new Date(periodStart).toISOString() : undefined,
      periodEnd: periodEnd ? new Date(periodEnd).toISOString() : undefined,
      numerator: Number(numerator),
      denominator: Number(denominator),
      rootCauseNote: rootCauseNote || undefined,
      actionPlan: actionPlan || undefined,
      reportedBy: reportedBy || undefined,
    };
    const res = await fetch("/api/hospital/quality", { method: editing ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setErr(data.error || "Error"); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 border-b border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold">{editing ? "Edit measurement" : "Record measurement"}</h2>
        </div>
        <div className="space-y-4 p-4">
          {err && <div className="rounded border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">{err}</div>}
          <Field label="Indicator">
            <select value={indicatorId} onChange={(e) => setIndicatorId(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">Select...</option>
              {indicators.filter((i) => i.status === "active").map((i) => <option key={i.id} value={i.id}>{i.code} — {i.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Period label (e.g. 2026-04)"><input value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Period start"><input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Period end"><input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Numerator"><input type="number" step="0.01" value={numerator} onChange={(e) => setNumerator(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Denominator"><input type="number" step="0.01" value={denominator} onChange={(e) => setDenominator(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          </div>
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-800">
            Preview: <span className="font-semibold">{preview}</span>
          </div>
          <Field label="Root cause note (required if target missed)"><textarea value={rootCauseNote} onChange={(e) => setRca(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          <Field label="Action plan"><textarea value={actionPlan} onChange={(e) => setAction(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          <Field label="Reported by"><input value={reportedBy} onChange={(e) => setReportedBy(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
        </div>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white p-4">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Cancel</button>
          <button disabled={saving} onClick={submit} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: number; tone: "slate" | "amber" | "rose" | "emerald" | "indigo" }) {
  const map: Record<string, string> = {
    slate: "bg-slate-50 text-slate-700 ring-slate-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    rose: "bg-rose-50 text-rose-700 ring-rose-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  };
  return (
    <div className={`rounded-lg p-3 ring-1 ${map[tone]}`}>
      <div className="text-xs">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode; }) {
  return <button onClick={onClick} className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${active ? "border-primary-600 text-primary-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>{children}</button>;
}
function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode; }) {
  return <button onClick={onClick} className={`rounded-full px-3 py-1 text-xs font-semibold ${active ? "bg-primary-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}>{children}</button>;
}
function Pill({ tone, children }: { tone: "slate" | "amber" | "emerald" | "rose" | "indigo"; children: React.ReactNode; }) {
  const map: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700",
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
    rose: "bg-rose-100 text-rose-700",
    indigo: "bg-indigo-100 text-indigo-700",
  };
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${map[tone]}`}>{children}</span>;
}
function Field({ label, children }: { label: string; children: React.ReactNode; }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>{children}</label>;
}
function Empty({ label }: { label: string }) {
  return <div className="p-8 text-center text-sm text-slate-500">{label}</div>;
}
