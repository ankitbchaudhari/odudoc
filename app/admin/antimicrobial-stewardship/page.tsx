"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  AntibioticAgent, StewardshipReview,
  AgentClass, RestrictionTier, AgentRoute,
  ReviewType, ReviewStatus, IndicationType, ApprovalOutcome,
} from "@/lib/hospital/antimicrobial-stewardship-store";
// Inlined from antimicrobial-stewardship-store — importing runtime values pulls persistent-array → Postgres into the client bundle and crashes the page.
const CLASS_LABEL: Record<AgentClass, string> = {
  beta_lactam: "Beta-lactam", cephalosporin: "Cephalosporin", carbapenem: "Carbapenem",
  glycopeptide: "Glycopeptide", fluoroquinolone: "Fluoroquinolone", aminoglycoside: "Aminoglycoside",
  macrolide: "Macrolide", tetracycline: "Tetracycline", oxazolidinone: "Oxazolidinone",
  polymyxin: "Polymyxin", antifungal: "Antifungal", antiviral: "Antiviral",
  antitubercular: "Anti-TB", other: "Other",
};
const TIER_LABEL: Record<RestrictionTier, string> = {
  unrestricted: "Unrestricted", monitored: "Monitored",
  restricted: "Restricted (approval)", reserve: "Reserve (ID only)",
};
const REVIEW_TYPE_LABEL: Record<ReviewType, string> = {
  pre_authorization: "Pre-authorization", prospective_audit: "Prospective audit",
  de_escalation: "De-escalation", iv_to_po_switch: "IV→PO switch",
  duration_review: "Duration review", culture_directed: "Culture-directed",
  empiric_review: "Empiric review", stop_order: "Stop order",
};
const STATUS_LABEL: Record<ReviewStatus, string> = {
  pending: "Pending", approved: "Approved", rejected: "Rejected",
  modified: "Modified", acknowledged: "Acknowledged", withdrawn: "Withdrawn",
};
const INDICATION_LABEL: Record<IndicationType, string> = {
  empiric: "Empiric", definitive: "Definitive",
  surgical_prophylaxis: "Surgical prophylaxis", medical_prophylaxis: "Medical prophylaxis",
  targeted: "Targeted",
};
const OUTCOME_LABEL: Record<ApprovalOutcome, string> = {
  continue: "Continue", de_escalate: "De-escalate", escalate: "Escalate",
  change_agent: "Change agent", stop: "Stop",
  switch_iv_to_po: "Switch IV→PO", no_change: "No change",
};

interface Patient { id: string; firstName: string; lastName: string; }

const CLASSES: AgentClass[] = ["beta_lactam", "cephalosporin", "carbapenem", "glycopeptide", "fluoroquinolone", "aminoglycoside", "macrolide", "tetracycline", "oxazolidinone", "polymyxin", "antifungal", "antiviral", "antitubercular", "other"];
const TIERS: RestrictionTier[] = ["unrestricted", "monitored", "restricted", "reserve"];
const ROUTES: AgentRoute[] = ["iv", "po", "im", "inhaled", "topical", "other"];
const REVIEW_TYPES: ReviewType[] = ["pre_authorization", "prospective_audit", "de_escalation", "iv_to_po_switch", "duration_review", "culture_directed", "empiric_review", "stop_order"];
const REVIEW_STATUSES: ReviewStatus[] = ["pending", "approved", "rejected", "modified", "acknowledged", "withdrawn"];
const INDICATIONS: IndicationType[] = ["empiric", "definitive", "surgical_prophylaxis", "medical_prophylaxis", "targeted"];
const OUTCOMES: ApprovalOutcome[] = ["continue", "de_escalate", "escalate", "change_agent", "stop", "switch_iv_to_po", "no_change"];

export default function AntimicrobialStewardshipPage() {
  const [tab, setTab] = useState<"agents" | "reviews">("reviews");
  const [agents, setAgents] = useState<AntibioticAgent[]>([]);
  const [reviews, setReviews] = useState<StewardshipReview[]>([]);
  const [stats, setStats] = useState<{ formularyActive: number; restrictedCount: number; pending: number; approvedMonth: number; deEscMonth: number; ivPoMonth: number; acceptanceRate: number; costSavedMonth: number } | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showAgent, setShowAgent] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [editAgent, setEditAgent] = useState<AntibioticAgent | null>(null);
  const [editReview, setEditReview] = useState<StewardshipReview | null>(null);
  const [fTier, setFTier] = useState<RestrictionTier | "">("");
  const [fStatus, setFStatus] = useState<ReviewStatus | "">("");

  async function load() {
    const res = await fetch("/api/hospital/antimicrobial-stewardship", { cache: "no-store" });
    const data = await res.json();
    setAgents(data.agents || []);
    setReviews(data.reviews || []);
    setStats(data.stats || null);
  }
  async function loadPatients() {
    try {
      const res = await fetch("/api/patients", { cache: "no-store" });
      const data = await res.json();
      setPatients(data.patients || []);
    } catch {}
  }
  useEffect(() => { load(); loadPatients(); }, []);

  async function del(id: string, kind?: string) {
    if (!confirm("Delete?")) return;
    await fetch("/api/hospital/antimicrobial-stewardship", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, kind }) });
    load();
  }

  const filteredAgents = useMemo(() => agents.filter((a) => (fTier ? a.restrictionTier === fTier : true)), [agents, fTier]);
  const filteredReviews = useMemo(() => reviews.filter((r) => (fStatus ? r.status === fStatus : true)), [reviews, fStatus]);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Antimicrobial Stewardship</h1>
          <p className="text-sm text-slate-500">Formulary restrictions · Prescribing review · De-escalation · IV→PO switch</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setEditAgent(null); setShowAgent(true); }} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">+ Agent</button>
          <button onClick={() => { setEditReview(null); setShowReview(true); }} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">+ Review</button>
        </div>
      </div>

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
          <StatTile label="Active formulary" value={stats.formularyActive} tone="slate" />
          <StatTile label="Restricted / Reserve" value={stats.restrictedCount} tone="rose" />
          <StatTile label="Pending" value={stats.pending} tone="amber" />
          <StatTile label="Approved (mo)" value={stats.approvedMonth} tone="emerald" />
          <StatTile label="De-escalations" value={stats.deEscMonth} tone="emerald" />
          <StatTile label="IV→PO" value={stats.ivPoMonth} tone="indigo" />
          <StatTile label="Acceptance %" value={stats.acceptanceRate} tone="emerald" />
          <StatTile label="Savings (mo)" value={Math.round(stats.costSavedMonth)} tone="slate" />
        </div>
      )}

      <div className="mb-4 flex items-center gap-2">
        <TabBtn active={tab === "reviews"} onClick={() => setTab("reviews")}>Reviews ({reviews.length})</TabBtn>
        <TabBtn active={tab === "agents"} onClick={() => setTab("agents")}>Formulary ({agents.length})</TabBtn>
      </div>

      {tab === "agents" && (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <FilterPill active={fTier === ""} onClick={() => setFTier("")}>All tiers</FilterPill>
            {TIERS.map((t) => <FilterPill key={t} active={fTier === t} onClick={() => setFTier(t)}>{TIER_LABEL[t]}</FilterPill>)}
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Agent</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Routes</th>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3">DDD (g)</th>
                  <th className="px-4 py-3">Default dose</th>
                  <th className="px-4 py-3">Active</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAgents.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{a.name}</div>
                      <div className="text-xs text-slate-500">{a.id}{a.genericName ? ` · ${a.genericName}` : ""}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">{CLASS_LABEL[a.agentClass]}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{a.route.join(", ").toUpperCase()}</td>
                    <td className="px-4 py-3"><Pill status={a.restrictionTier}>{TIER_LABEL[a.restrictionTier]}</Pill></td>
                    <td className="px-4 py-3 text-xs text-slate-700">{a.ddd ?? "-"}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{a.defaultAdultDose || "-"}</td>
                    <td className="px-4 py-3 text-xs">{a.activeOnFormulary ? "✓" : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { setEditAgent(a); setShowAgent(true); }} className="mr-2 text-xs font-semibold text-primary-600 hover:text-primary-700">Edit</button>
                      <button onClick={() => del(a.id)} className="text-xs font-semibold text-rose-600 hover:text-rose-700">Delete</button>
                    </td>
                  </tr>
                ))}
                {filteredAgents.length === 0 && <tr><td colSpan={8}><Empty>No agents yet.</Empty></td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "reviews" && (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <FilterPill active={fStatus === ""} onClick={() => setFStatus("")}>All</FilterPill>
            {REVIEW_STATUSES.map((s) => <FilterPill key={s} active={fStatus === s} onClick={() => setFStatus(s)}>{STATUS_LABEL[s]}</FilterPill>)}
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Agent</th>
                  <th className="px-4 py-3">Indication</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Outcome</th>
                  <th className="px-4 py-3">Accepted</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReviews.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{r.patientName}</div>
                      <div className="text-xs text-slate-500">{r.id}{r.ward ? ` · ${r.ward}` : ""}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      <div className="font-semibold">{r.agentName}</div>
                      <div className="text-slate-500">{r.dose || "-"}{r.route ? ` ${r.route.toUpperCase()}` : ""}{r.frequency ? ` · ${r.frequency}` : ""}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">{INDICATION_LABEL[r.indication]}{r.durationDaysAtReview ? ` · d${r.durationDaysAtReview}` : ""}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{REVIEW_TYPE_LABEL[r.reviewType]}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{OUTCOME_LABEL[r.outcome]}</td>
                    <td className="px-4 py-3 text-xs">{r.interventionAccepted === undefined ? "-" : r.interventionAccepted ? "✓" : "✗"}</td>
                    <td className="px-4 py-3"><Pill status={r.status}>{STATUS_LABEL[r.status]}</Pill></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { setEditReview(r); setShowReview(true); }} className="mr-2 text-xs font-semibold text-primary-600 hover:text-primary-700">Edit</button>
                      <button onClick={() => del(r.id, "review")} className="text-xs font-semibold text-rose-600 hover:text-rose-700">Delete</button>
                    </td>
                  </tr>
                ))}
                {filteredReviews.length === 0 && <tr><td colSpan={8}><Empty>No reviews.</Empty></td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showAgent && <AgentModal initial={editAgent} onClose={() => { setShowAgent(false); setEditAgent(null); }} onSaved={() => { setShowAgent(false); setEditAgent(null); load(); }} />}
      {showReview && <ReviewModal agents={agents} patients={patients} initial={editReview} onClose={() => { setShowReview(false); setEditReview(null); }} onSaved={() => { setShowReview(false); setEditReview(null); load(); }} />}
    </div>
  );
}

function AgentModal({ initial, onClose, onSaved }: { initial: AntibioticAgent | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<AntibioticAgent>>(
    initial ?? { agentClass: "beta_lactam", restrictionTier: "unrestricted", route: ["iv"], activeOnFormulary: true, requiresCulture: false },
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function toggleRoute(r: AgentRoute) {
    const list = new Set(form.route || []);
    if (list.has(r)) list.delete(r); else list.add(r);
    setForm({ ...form, route: Array.from(list) });
  }

  async function submit() {
    setBusy(true); setErr("");
    const method = initial ? "PATCH" : "POST";
    const payload: Record<string, unknown> = { ...form };
    if (initial) payload.id = initial.id;
    const res = await fetch("/api/hospital/antimicrobial-stewardship", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setErr(data.error || "save_failed"); setBusy(false); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-6">
      <div className="my-8 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-slate-900">{initial ? "Edit agent" : "New antibiotic agent"}</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Name *"><input className="inp" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Generic name"><input className="inp" value={form.genericName || ""} onChange={(e) => setForm({ ...form, genericName: e.target.value })} /></Field>
          <Field label="Brand names"><input className="inp" value={form.brandNames || ""} onChange={(e) => setForm({ ...form, brandNames: e.target.value })} /></Field>
          <Field label="Class"><select className="inp" value={form.agentClass || "beta_lactam"} onChange={(e) => setForm({ ...form, agentClass: e.target.value as AgentClass })}>{CLASSES.map((c) => <option key={c} value={c}>{CLASS_LABEL[c]}</option>)}</select></Field>
          <Field label="Restriction tier"><select className="inp" value={form.restrictionTier || "unrestricted"} onChange={(e) => setForm({ ...form, restrictionTier: e.target.value as RestrictionTier })}>{TIERS.map((t) => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}</select></Field>
          <Field label="WHO DDD (g)"><input type="number" step="0.01" className="inp" value={form.ddd ?? ""} onChange={(e) => setForm({ ...form, ddd: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
          <Field label="Default adult dose"><input className="inp" value={form.defaultAdultDose || ""} onChange={(e) => setForm({ ...form, defaultAdultDose: e.target.value })} /></Field>
          <Field label="Default ped dose"><input className="inp" value={form.defaultPedDose || ""} onChange={(e) => setForm({ ...form, defaultPedDose: e.target.value })} /></Field>
          <Field label="Max empiric days"><input type="number" className="inp" value={form.maxEmpiricDays ?? ""} onChange={(e) => setForm({ ...form, maxEmpiricDays: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
          <Field label="Formulary notes" full><textarea className="inp" rows={2} value={form.formularyNotes || ""} onChange={(e) => setForm({ ...form, formularyNotes: e.target.value })} /></Field>
          <Field label="Indication guide" full><textarea className="inp" rows={2} value={form.indicationGuide || ""} onChange={(e) => setForm({ ...form, indicationGuide: e.target.value })} /></Field>
        </div>
        <div className="mt-4">
          <div className="mb-2 text-sm font-semibold text-slate-800">Routes</div>
          <div className="flex flex-wrap gap-2">
            {ROUTES.map((r) => {
              const active = (form.route || []).includes(r);
              return <button key={r} onClick={() => toggleRoute(r)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${active ? "border-primary-600 bg-primary-50 text-primary-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{r.toUpperCase()}</button>;
            })}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!form.activeOnFormulary} onChange={(e) => setForm({ ...form, activeOnFormulary: e.target.checked })} /> Active on formulary</label>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!form.requiresCulture} onChange={(e) => setForm({ ...form, requiresCulture: e.target.checked })} /> Requires culture before use</label>
        </div>

        {err && <div className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{err}</div>}
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={busy} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">{busy ? "Saving..." : "Save"}</button>
        </div>
      </div>
      <style jsx>{`.inp { width: 100%; border-radius: 0.5rem; border: 1px solid rgb(226 232 240); padding: 0.5rem 0.75rem; font-size: 0.875rem; }`}</style>
    </div>
  );
}

function ReviewModal({ agents, patients, initial, onClose, onSaved }: { agents: AntibioticAgent[]; patients: Patient[]; initial: StewardshipReview | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<StewardshipReview>>(
    initial ?? {
      reviewType: "prospective_audit", status: "pending", outcome: "no_change",
      indication: "empiric",
      reviewDate: new Date().toISOString().slice(0, 10),
      cultureAvailable: false,
    },
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function onPatient(id: string) {
    const p = patients.find((x) => x.id === id);
    setForm({ ...form, patientId: id, patientName: p ? `${p.firstName} ${p.lastName}` : form.patientName });
  }
  function onAgent(id: string) {
    const a = agents.find((x) => x.id === id);
    setForm({ ...form, agentId: id || undefined, agentName: a?.name || form.agentName, agentClass: a?.agentClass });
  }

  async function submit() {
    setBusy(true); setErr("");
    const method = initial ? "PATCH" : "POST";
    const payload: Record<string, unknown> = { ...form, kind: "review" };
    if (initial) payload.id = initial.id;
    const res = await fetch("/api/hospital/antimicrobial-stewardship", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setErr(data.error || "save_failed"); setBusy(false); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-6">
      <div className="my-8 w-full max-w-5xl rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-slate-900">{initial ? "Edit review" : "New stewardship review"}</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Patient *">
            <select className="inp" value={form.patientId || ""} onChange={(e) => onPatient(e.target.value)}>
              <option value="">-- Select --</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.id})</option>)}
            </select>
          </Field>
          <Field label="Admission ID"><input className="inp" value={form.admissionId || ""} onChange={(e) => setForm({ ...form, admissionId: e.target.value })} /></Field>
          <Field label="Ward"><input className="inp" value={form.ward || ""} onChange={(e) => setForm({ ...form, ward: e.target.value })} /></Field>
          <Field label="Review date *"><input type="date" className="inp" value={(form.reviewDate || "").slice(0, 10)} onChange={(e) => setForm({ ...form, reviewDate: e.target.value })} /></Field>
          <Field label="Reviewed by *"><input className="inp" value={form.reviewedBy || ""} onChange={(e) => setForm({ ...form, reviewedBy: e.target.value })} /></Field>
          <Field label="Review type"><select className="inp" value={form.reviewType || "prospective_audit"} onChange={(e) => setForm({ ...form, reviewType: e.target.value as ReviewType })}>{REVIEW_TYPES.map((t) => <option key={t} value={t}>{REVIEW_TYPE_LABEL[t]}</option>)}</select></Field>
          <Field label="Prescriber"><input className="inp" value={form.prescriberName || ""} onChange={(e) => setForm({ ...form, prescriberName: e.target.value })} /></Field>
          <Field label="Prescriber dept"><input className="inp" value={form.prescriberDepartment || ""} onChange={(e) => setForm({ ...form, prescriberDepartment: e.target.value })} /></Field>

          <Field label="Agent (formulary)">
            <select className="inp" value={form.agentId || ""} onChange={(e) => onAgent(e.target.value)}>
              <option value="">-- Select --</option>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
          <Field label="Agent name *"><input className="inp" value={form.agentName || ""} onChange={(e) => setForm({ ...form, agentName: e.target.value })} /></Field>
          <Field label="Dose"><input className="inp" value={form.dose || ""} onChange={(e) => setForm({ ...form, dose: e.target.value })} /></Field>
          <Field label="Route"><select className="inp" value={form.route || ""} onChange={(e) => setForm({ ...form, route: (e.target.value || undefined) as AgentRoute })}><option value="">-</option>{ROUTES.map((r) => <option key={r} value={r}>{r.toUpperCase()}</option>)}</select></Field>
          <Field label="Frequency"><input className="inp" placeholder="q8h" value={form.frequency || ""} onChange={(e) => setForm({ ...form, frequency: e.target.value })} /></Field>
          <Field label="Start date"><input type="date" className="inp" value={(form.startDate || "").slice(0, 10)} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
          <Field label="Day of therapy"><input type="number" className="inp" value={form.durationDaysAtReview ?? ""} onChange={(e) => setForm({ ...form, durationDaysAtReview: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>

          <Field label="Indication"><select className="inp" value={form.indication || "empiric"} onChange={(e) => setForm({ ...form, indication: e.target.value as IndicationType })}>{INDICATIONS.map((i) => <option key={i} value={i}>{INDICATION_LABEL[i]}</option>)}</select></Field>
          <Field label="Indication details" full><input className="inp" value={form.indicationDetails || ""} onChange={(e) => setForm({ ...form, indicationDetails: e.target.value })} /></Field>
          <Field label="Suspected pathogen"><input className="inp" value={form.suspectedPathogen || ""} onChange={(e) => setForm({ ...form, suspectedPathogen: e.target.value })} /></Field>

          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!form.cultureAvailable} onChange={(e) => setForm({ ...form, cultureAvailable: e.target.checked })} /> Culture available</label>
          <Field label="Culture / sensitivity" full><textarea className="inp" rows={2} value={form.cultureSensitivity || ""} onChange={(e) => setForm({ ...form, cultureSensitivity: e.target.value })} /></Field>

          <Field label="WBC (×10⁹/L)"><input type="number" step="0.1" className="inp" value={form.wbc ?? ""} onChange={(e) => setForm({ ...form, wbc: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
          <Field label="CRP (mg/L)"><input type="number" step="0.1" className="inp" value={form.crp ?? ""} onChange={(e) => setForm({ ...form, crp: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
          <Field label="Procalcitonin"><input type="number" step="0.01" className="inp" value={form.procalcitonin ?? ""} onChange={(e) => setForm({ ...form, procalcitonin: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
          <Field label="Temp °C"><input type="number" step="0.1" className="inp" value={form.temperatureC ?? ""} onChange={(e) => setForm({ ...form, temperatureC: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
          <Field label="Clinical response"><select className="inp" value={form.clinicalResponse || ""} onChange={(e) => setForm({ ...form, clinicalResponse: (e.target.value || undefined) as StewardshipReview["clinicalResponse"] })}><option value="">-</option><option value="improving">Improving</option><option value="unchanged">Unchanged</option><option value="worsening">Worsening</option><option value="unclear">Unclear</option></select></Field>

          <Field label="Outcome"><select className="inp" value={form.outcome || "no_change"} onChange={(e) => setForm({ ...form, outcome: e.target.value as ApprovalOutcome })}>{OUTCOMES.map((o) => <option key={o} value={o}>{OUTCOME_LABEL[o]}</option>)}</select></Field>
          <Field label="Status"><select className="inp" value={form.status || "pending"} onChange={(e) => setForm({ ...form, status: e.target.value as ReviewStatus })}>{REVIEW_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></Field>
          <Field label="Cost saving (est.)"><input type="number" className="inp" value={form.costSavingEstimate ?? ""} onChange={(e) => setForm({ ...form, costSavingEstimate: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>

          <Field label="Recommended agent"><input className="inp" value={form.recommendedAgent || ""} onChange={(e) => setForm({ ...form, recommendedAgent: e.target.value })} /></Field>
          <Field label="Recommended dose"><input className="inp" value={form.recommendedDose || ""} onChange={(e) => setForm({ ...form, recommendedDose: e.target.value })} /></Field>
          <Field label="Rec. duration (days)"><input type="number" className="inp" value={form.recommendedDurationDays ?? ""} onChange={(e) => setForm({ ...form, recommendedDurationDays: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>

          <Field label="Adverse event" full><input className="inp" value={form.adverseEvent || ""} onChange={(e) => setForm({ ...form, adverseEvent: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!form.interventionAccepted} onChange={(e) => setForm({ ...form, interventionAccepted: e.target.checked })} /> Intervention accepted</label>
          <Field label="Acknowledged by"><input className="inp" value={form.acknowledgedBy || ""} onChange={(e) => setForm({ ...form, acknowledgedBy: e.target.value })} /></Field>
          <Field label="Notes" full><textarea className="inp" rows={2} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        </div>

        {err && <div className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{err}</div>}
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={busy} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">{busy ? "Saving..." : "Save"}</button>
        </div>
      </div>
      <style jsx>{`.inp { width: 100%; border-radius: 0.5rem; border: 1px solid rgb(226 232 240); padding: 0.5rem 0.75rem; font-size: 0.875rem; }`}</style>
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: number; tone: "slate" | "amber" | "rose" | "emerald" | "indigo" }) {
  const t: Record<string, string> = { slate: "bg-slate-50 text-slate-700", amber: "bg-amber-50 text-amber-700", rose: "bg-rose-50 text-rose-700", emerald: "bg-emerald-50 text-emerald-700", indigo: "bg-indigo-50 text-indigo-700" };
  return <div className={`rounded-xl p-4 ${t[tone]}`}><div className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</div><div className="mt-1 text-2xl font-bold">{value}</div></div>;
}
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`rounded-lg px-4 py-2 text-sm font-semibold ${active ? "bg-primary-600 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>{children}</button>;
}
function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`rounded-full border px-3 py-1 text-xs font-semibold ${active ? "border-primary-600 bg-primary-50 text-primary-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{children}</button>;
}
function Pill({ status, children }: { status: string; children: React.ReactNode }) {
  const map: Record<string, string> = {
    unrestricted: "bg-emerald-100 text-emerald-700", monitored: "bg-amber-100 text-amber-700",
    restricted: "bg-rose-100 text-rose-700", reserve: "bg-rose-200 text-rose-800",
    pending: "bg-amber-100 text-amber-700", approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-rose-100 text-rose-700", modified: "bg-indigo-100 text-indigo-700",
    acknowledged: "bg-slate-100 text-slate-700", withdrawn: "bg-slate-100 text-slate-500",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${map[status] || "bg-slate-100 text-slate-700"}`}>{children}</span>;
}
function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return <label className={`block ${full ? "md:col-span-3" : ""}`}><div className="mb-1 text-xs font-semibold text-slate-600">{label}</div>{children}</label>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="p-8 text-center text-sm text-slate-500">{children}</div>;
}
