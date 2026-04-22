"use client";

import { useEffect, useState } from "react";
import type {
  FormularyDrug, DosageForm, DrugCategory, ScheduleClass,
  FormularyStatus, PregnancyCategory,
} from "@/lib/hospital/formulary-store";
// Inlined from formulary-store — importing runtime values pulls persistent-array → Postgres into the client bundle and crashes the page.
const DOSAGE_LABEL: Record<DosageForm, string> = {
  tablet: "Tablet", capsule: "Capsule", syrup: "Syrup", suspension: "Suspension",
  injection: "Injection", infusion: "Infusion", drops: "Drops", cream: "Cream",
  ointment: "Ointment", patch: "Patch", spray: "Spray", inhaler: "Inhaler",
  suppository: "Suppository", other: "Other",
};
const CATEGORY_LABEL: Record<DrugCategory, string> = {
  antibiotic: "Antibiotic", analgesic: "Analgesic", antihypertensive: "Antihypertensive",
  antidiabetic: "Antidiabetic", antiemetic: "Antiemetic", anticoagulant: "Anticoagulant",
  antifungal: "Antifungal", antiviral: "Antiviral", antipsychotic: "Antipsychotic",
  antidepressant: "Antidepressant", sedative: "Sedative", opioid: "Opioid",
  nsaid: "NSAID", steroid: "Steroid", vaccine: "Vaccine",
  iv_fluid: "IV fluid", electrolyte: "Electrolyte", other: "Other",
};
const SCHEDULE_LABEL: Record<ScheduleClass, string> = {
  OTC: "OTC", H: "Schedule H", H1: "Schedule H1", X: "Schedule X",
  G: "Schedule G", N: "Schedule N", narcotic: "Narcotic",
};
const STATUS_LABEL: Record<FormularyStatus, string> = {
  active: "Active", non_formulary: "Non-formulary", restricted: "Restricted",
  discontinued: "Discontinued", pending_pac: "Pending P&T",
};

const DOSAGE_FORMS: DosageForm[] = ["tablet", "capsule", "syrup", "suspension", "injection", "infusion", "drops", "cream", "ointment", "patch", "spray", "inhaler", "suppository", "other"];
const CATEGORIES: DrugCategory[] = ["antibiotic", "analgesic", "antihypertensive", "antidiabetic", "antiemetic", "anticoagulant", "antifungal", "antiviral", "antipsychotic", "antidepressant", "sedative", "opioid", "nsaid", "steroid", "vaccine", "iv_fluid", "electrolyte", "other"];
const SCHEDULES: ScheduleClass[] = ["OTC", "H", "H1", "X", "G", "N", "narcotic"];
const STATUSES: FormularyStatus[] = ["active", "non_formulary", "restricted", "discontinued", "pending_pac"];
const PREG_CATS: (PregnancyCategory | "")[] = ["", "A", "B", "C", "D", "X", "N"];

export default function FormularyPage() {
  const [drugs, setDrugs] = useState<FormularyDrug[]>([]);
  const [stats, setStats] = useState<{ total: number; active: number; restricted: number; nonFormulary: number; pendingPac: number; highAlert: number; lasa: number; narcotic: number } | null>(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<DrugCategory | "">("");
  const [filterStatus, setFilterStatus] = useState<FormularyStatus | "">("");
  const [highAlertOnly, setHighAlertOnly] = useState(false);
  const [lasaOnly, setLasaOnly] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<FormularyDrug | null>(null);

  async function load() {
    const qs = new URLSearchParams();
    if (search) qs.set("search", search);
    if (filterCategory) qs.set("category", filterCategory);
    if (filterStatus) qs.set("status", filterStatus);
    if (highAlertOnly) qs.set("highAlert", "1");
    if (lasaOnly) qs.set("lasa", "1");
    const res = await fetch(`/api/hospital/formulary?${qs.toString()}`, { cache: "no-store" });
    const data = await res.json();
    setDrugs(data.drugs || []);
    setStats(data.stats || null);
  }
  useEffect(() => { load(); }, [search, filterCategory, filterStatus, highAlertOnly, lasaOnly]);

  async function remove(id: string) {
    if (!confirm("Delete drug?")) return;
    await fetch("/api/hospital/formulary", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pharmacy Formulary</h1>
          <p className="text-sm text-slate-500">Drug master — generics, strengths, schedule class, P&T restrictions, LASA / high-alert flags</p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true); }} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">+ Add drug</button>
      </div>

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
          <StatTile label="Total" value={stats.total} tone="slate" />
          <StatTile label="Active" value={stats.active} tone="emerald" />
          <StatTile label="Restricted" value={stats.restricted} tone="amber" />
          <StatTile label="Non-formulary" value={stats.nonFormulary} tone="slate" />
          <StatTile label="Pending P&T" value={stats.pendingPac} tone="indigo" />
          <StatTile label="High-alert" value={stats.highAlert} tone="rose" />
          <StatTile label="LASA" value={stats.lasa} tone="rose" />
          <StatTile label="Narcotic" value={stats.narcotic} tone="rose" />
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search generic / brand / ATC..." className="w-72 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value as DrugCategory | "")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as FormularyStatus | "")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">All status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <FilterPill active={highAlertOnly} onClick={() => setHighAlertOnly(!highAlertOnly)}>High-alert only</FilterPill>
        <FilterPill active={lasaOnly} onClick={() => setLasaOnly(!lasaOnly)}>LASA only</FilterPill>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {drugs.length === 0 ? <Empty label="No drugs." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Generic (brand)</th>
                  <th className="px-4 py-3">Strength · Form</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Schedule</th>
                  <th className="px-4 py-3">Preg</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Flags</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {drugs.map((d) => (
                  <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{d.id}</td>
                    <td className="px-4 py-3"><div className="font-medium">{d.genericName}</div><div className="text-xs text-slate-500">{d.brandNames?.join(", ") || ""}</div></td>
                    <td className="px-4 py-3 text-xs">{d.strength} · {DOSAGE_LABEL[d.dosageForm]}</td>
                    <td className="px-4 py-3 text-xs">{CATEGORY_LABEL[d.category]}</td>
                    <td className="px-4 py-3 text-xs">{SCHEDULE_LABEL[d.scheduleClass]}</td>
                    <td className="px-4 py-3 text-xs">{d.pregnancyCategory || "-"}</td>
                    <td className="px-4 py-3 text-xs">{d.unitPrice ? `${d.currency || "INR"} ${d.unitPrice}` : "-"}</td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex flex-wrap gap-1">
                        {d.highAlert && <Pill tone="rose">HIGH</Pill>}
                        {d.lasa && <Pill tone="rose">LASA</Pill>}
                        {d.narcotic && <Pill tone="rose">NARC</Pill>}
                        {d.refrigeration && <Pill tone="indigo">2-8°C</Pill>}
                        {d.requiresPac && <Pill tone="amber">P&T</Pill>}
                      </div>
                    </td>
                    <td className="px-4 py-3"><Pill tone={d.status === "active" ? "emerald" : d.status === "restricted" ? "amber" : d.status === "pending_pac" ? "indigo" : "slate"}>{STATUS_LABEL[d.status]}</Pill></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { setEditing(d); setShowModal(true); }} className="text-xs font-semibold text-primary-600 hover:underline">Edit</button>
                      <button onClick={() => remove(d.id)} className="ml-3 text-xs font-semibold text-rose-600 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && <DrugModal editing={editing} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />}
    </div>
  );
}

function DrugModal({ editing, onClose, onSaved }: { editing: FormularyDrug | null; onClose: () => void; onSaved: () => void; }) {
  const [genericName, setGN] = useState(editing?.genericName || "");
  const [brandNamesStr, setBN] = useState(editing?.brandNames?.join(", ") || "");
  const [strength, setStrength] = useState(editing?.strength || "");
  const [dosageForm, setDF] = useState<DosageForm>(editing?.dosageForm || "tablet");
  const [routeOfAdmin, setROA] = useState(editing?.routeOfAdmin || "");
  const [category, setCategory] = useState<DrugCategory>(editing?.category || "other");
  const [atcCode, setATC] = useState(editing?.atcCode || "");
  const [scheduleClass, setSC] = useState<ScheduleClass>(editing?.scheduleClass || "OTC");
  const [status, setStatus] = useState<FormularyStatus>(editing?.status || "active");
  const [pregnancyCategory, setPC] = useState<PregnancyCategory | "">(editing?.pregnancyCategory || "");
  const [indications, setIndications] = useState(editing?.indications || "");
  const [contraindications, setContra] = useState(editing?.contraindications || "");
  const [commonAdverseEffects, setADE] = useState(editing?.commonAdverseEffects || "");
  const [typicalAdultDose, setTAD] = useState(editing?.typicalAdultDose || "");
  const [typicalPediatricDose, setTPD] = useState(editing?.typicalPediatricDose || "");
  const [maxDailyDose, setMDD] = useState(editing?.maxDailyDose || "");
  const [renalAdjustment, setRA] = useState(editing?.renalAdjustment || "");
  const [hepaticAdjustment, setHA] = useState(editing?.hepaticAdjustment || "");
  const [interactionsNote, setIN] = useState(editing?.interactionsNote || "");
  const [monitoringRequired, setMR] = useState(editing?.monitoringRequired || "");
  const [unitPrice, setUP] = useState<number | "">(editing?.unitPrice ?? "");
  const [currency, setCurrency] = useState(editing?.currency || "INR");
  const [restrictedPrescribers, setRP] = useState(editing?.restrictedPrescribers || "");
  const [requiresPac, setRPac] = useState(!!editing?.requiresPac);
  const [lasa, setLasa] = useState(!!editing?.lasa);
  const [highAlert, setHighAlert] = useState(!!editing?.highAlert);
  const [narcotic, setNarcotic] = useState(!!editing?.narcotic);
  const [refrigeration, setRefrig] = useState(!!editing?.refrigeration);
  const [notes, setNotes] = useState(editing?.notes || "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    if (!genericName || !strength) { setErr("Generic name and strength required"); return; }
    setSaving(true); setErr("");
    const brandNames = brandNamesStr.split(",").map((s) => s.trim()).filter(Boolean);
    const payload = {
      id: editing?.id,
      genericName, brandNames, strength, dosageForm,
      routeOfAdmin: routeOfAdmin || undefined,
      category, atcCode: atcCode || undefined,
      scheduleClass, status,
      pregnancyCategory: pregnancyCategory || undefined,
      indications: indications || undefined,
      contraindications: contraindications || undefined,
      commonAdverseEffects: commonAdverseEffects || undefined,
      typicalAdultDose: typicalAdultDose || undefined,
      typicalPediatricDose: typicalPediatricDose || undefined,
      maxDailyDose: maxDailyDose || undefined,
      renalAdjustment: renalAdjustment || undefined,
      hepaticAdjustment: hepaticAdjustment || undefined,
      interactionsNote: interactionsNote || undefined,
      monitoringRequired: monitoringRequired || undefined,
      unitPrice: unitPrice === "" ? undefined : Number(unitPrice),
      currency: currency || undefined,
      restrictedPrescribers: restrictedPrescribers || undefined,
      requiresPac, lasa, highAlert, narcotic, refrigeration,
      notes: notes || undefined,
    };
    const res = await fetch("/api/hospital/formulary", { method: editing ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setErr(data.error || "Error"); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 border-b border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold">{editing ? "Edit drug" : "Add drug to formulary"}</h2>
        </div>
        <div className="space-y-4 p-4">
          {err && <div className="rounded border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">{err}</div>}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Generic name"><input value={genericName} onChange={(e) => setGN(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Brand names (comma-sep)"><input value={brandNamesStr} onChange={(e) => setBN(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Strength"><input value={strength} onChange={(e) => setStrength(e.target.value)} placeholder="500 mg" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Dosage form">
              <select value={dosageForm} onChange={(e) => setDF(e.target.value as DosageForm)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {DOSAGE_FORMS.map((f) => <option key={f} value={f}>{DOSAGE_LABEL[f]}</option>)}
              </select>
            </Field>
            <Field label="Route"><input value={routeOfAdmin} onChange={(e) => setROA(e.target.value)} placeholder="oral / IV / IM / SC" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Category">
              <select value={category} onChange={(e) => setCategory(e.target.value as DrugCategory)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
              </select>
            </Field>
            <Field label="ATC code"><input value={atcCode} onChange={(e) => setATC(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Schedule">
              <select value={scheduleClass} onChange={(e) => setSC(e.target.value as ScheduleClass)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {SCHEDULES.map((s) => <option key={s} value={s}>{SCHEDULE_LABEL[s]}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value as FormularyStatus)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </Field>
            <Field label="Pregnancy category">
              <select value={pregnancyCategory} onChange={(e) => setPC(e.target.value as PregnancyCategory | "")} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {PREG_CATS.map((c) => <option key={c} value={c}>{c || "—"}</option>)}
              </select>
            </Field>
            <Field label="Unit price"><input type="number" step="0.01" value={unitPrice} onChange={(e) => setUP(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Currency"><input value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Indications"><textarea value={indications} onChange={(e) => setIndications(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Contraindications"><textarea value={contraindications} onChange={(e) => setContra(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Adverse effects"><textarea value={commonAdverseEffects} onChange={(e) => setADE(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Interactions"><textarea value={interactionsNote} onChange={(e) => setIN(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Adult dose"><input value={typicalAdultDose} onChange={(e) => setTAD(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Pediatric dose"><input value={typicalPediatricDose} onChange={(e) => setTPD(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Max daily dose"><input value={maxDailyDose} onChange={(e) => setMDD(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Renal adjustment"><input value={renalAdjustment} onChange={(e) => setRA(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Hepatic adjustment"><input value={hepaticAdjustment} onChange={(e) => setHA(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Monitoring required"><input value={monitoringRequired} onChange={(e) => setMR(e.target.value)} placeholder="INR / troughs / K+" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          </div>

          <Field label="Restricted prescribers"><input value={restrictedPrescribers} onChange={(e) => setRP(e.target.value)} placeholder="ICU only / Infectious disease" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 text-xs font-semibold uppercase text-slate-600">Flags</div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={highAlert} onChange={(e) => setHighAlert(e.target.checked)} />High-alert</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={lasa} onChange={(e) => setLasa(e.target.checked)} />LASA</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={narcotic} onChange={(e) => setNarcotic(e.target.checked)} />Narcotic</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={refrigeration} onChange={(e) => setRefrig(e.target.checked)} />Refrigerate</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={requiresPac} onChange={(e) => setRPac(e.target.checked)} />P&T per order</label>
            </div>
          </div>

          <Field label="Notes"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
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
  return <div className={`rounded-lg p-3 ring-1 ${map[tone]}`}><div className="text-xs">{label}</div><div className="mt-1 text-2xl font-bold">{value}</div></div>;
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
