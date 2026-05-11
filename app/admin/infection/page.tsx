"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { PageHero, StatGrid, StatCard } from "@/components/admin/PageShell";

type HAIType = "clabsi" | "cauti" | "vap" | "ssi" | "mdro" | "cdiff" | "other";
type HAIOrganism =
  | "staph_aureus" | "mrsa" | "vre" | "ecoli" | "klebsiella"
  | "pseudomonas" | "acinetobacter" | "enterococcus" | "candida" | "cdiff" | "other";
type HAIStatus = "suspected" | "confirmed" | "ruled_out" | "resolved" | "died" | "discharged";
type IsolationType = "none" | "standard" | "contact" | "droplet" | "airborne" | "protective";

interface HAIEvent {
  id: string;
  eventNumber: string;
  patientId?: string;
  patientNameSnapshot?: string;
  location: string;
  type: HAIType;
  organism?: HAIOrganism;
  organismOther?: string;
  onsetDate: string;
  identifiedDate?: string;
  deviceType?: string;
  deviceInsertedAt?: string;
  cultureSpecimen?: string;
  cultureResult?: string;
  sensitivityPattern?: string;
  isolation: IsolationType;
  isolationStartedAt?: string;
  isolationEndedAt?: string;
  rcaDone: boolean;
  rcaSummary?: string;
  correctiveActions?: string;
  reportedToHic: boolean;
  reportedBy?: string;
  outcome?: string;
  status: HAIStatus;
  notes?: string;
}

interface HHAudit {
  id: string;
  auditNumber: string;
  auditDate: string;
  location: string;
  observer: string;
  roleDoctor: number;
  doctorCompliant: number;
  roleNurse: number;
  nurseCompliant: number;
  roleOther: number;
  otherCompliant: number;
  moment1Before: number;
  moment2Before: number;
  moment3After: number;
  moment4After: number;
  moment5After: number;
  notes?: string;
}

const HAI_TYPES: { v: HAIType; l: string }[] = [
  { v: "clabsi", l: "CLABSI (central-line BSI)" },
  { v: "cauti", l: "CAUTI (catheter UTI)" },
  { v: "vap", l: "VAP (ventilator pneumonia)" },
  { v: "ssi", l: "SSI (surgical site)" },
  { v: "mdro", l: "MDRO colonization/infection" },
  { v: "cdiff", l: "C. difficile" },
  { v: "other", l: "Other" },
];

const ORGANISMS: { v: HAIOrganism; l: string }[] = [
  { v: "staph_aureus", l: "Staph aureus (MSSA)" },
  { v: "mrsa", l: "MRSA" },
  { v: "vre", l: "VRE" },
  { v: "ecoli", l: "E. coli" },
  { v: "klebsiella", l: "Klebsiella" },
  { v: "pseudomonas", l: "Pseudomonas" },
  { v: "acinetobacter", l: "Acinetobacter" },
  { v: "enterococcus", l: "Enterococcus" },
  { v: "candida", l: "Candida" },
  { v: "cdiff", l: "C. difficile" },
  { v: "other", l: "Other" },
];

const STATUSES: { v: HAIStatus; l: string; cls: string }[] = [
  { v: "suspected", l: "Suspected", cls: "bg-amber-100 text-amber-700" },
  { v: "confirmed", l: "Confirmed", cls: "bg-red-100 text-red-700" },
  { v: "ruled_out", l: "Ruled out", cls: "bg-slate-100 text-slate-700" },
  { v: "resolved", l: "Resolved", cls: "bg-emerald-100 text-emerald-700" },
  { v: "discharged", l: "Discharged", cls: "bg-blue-100 text-blue-700" },
  { v: "died", l: "Died", cls: "bg-slate-800 text-white" },
];

const ISOLATIONS: { v: IsolationType; l: string; cls: string }[] = [
  { v: "none", l: "None", cls: "bg-slate-100 text-slate-600" },
  { v: "standard", l: "Standard", cls: "bg-slate-100 text-slate-700" },
  { v: "contact", l: "Contact", cls: "bg-amber-100 text-amber-700" },
  { v: "droplet", l: "Droplet", cls: "bg-orange-100 text-orange-700" },
  { v: "airborne", l: "Airborne", cls: "bg-red-100 text-red-700" },
  { v: "protective", l: "Protective", cls: "bg-emerald-100 text-emerald-700" },
];

function fmtDate(s?: string): string {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}
function statusPill(s: HAIStatus): string {
  return STATUSES.find((x) => x.v === s)?.cls || "";
}
function isolationPill(s: IsolationType): string {
  return ISOLATIONS.find((x) => x.v === s)?.cls || "";
}
function compPct(a: HHAudit): number {
  const opps = a.roleDoctor + a.roleNurse + a.roleOther;
  if (opps === 0) return 0;
  const comp = a.doctorCompliant + a.nurseCompliant + a.otherCompliant;
  return Math.round((comp / opps) * 1000) / 10;
}

export default function InfectionPage() {
  const [tab, setTab] = useState<"hai" | "hh">("hai");
  const [events, setEvents] = useState<HAIEvent[]>([]);
  const [audits, setAudits] = useState<HHAudit[]>([]);
  const [loading, setLoading] = useState(true);

  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<Record<string, string>>({});

  const [showAuditForm, setShowAuditForm] = useState(false);
  const [editingAuditId, setEditingAuditId] = useState<string | null>(null);
  const [auditForm, setAuditForm] = useState<Record<string, string>>({});

  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [fStatus, setFStatus] = useState("");
  const [fType, setFType] = useState("");
  const [fLocation, setFLocation] = useState("");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (fStatus) qs.set("status", fStatus);
      if (fType) qs.set("type", fType);
      if (fLocation) qs.set("location", fLocation);
      if (fFrom) qs.set("from", fFrom);
      if (fTo) qs.set("to", fTo);
      const [eRes, aRes] = await Promise.all([
        fetch(`/api/hospital/infection?${qs.toString()}`, { cache: "no-store" }),
        fetch(`/api/hospital/infection/audits`, { cache: "no-store" }),
      ]);
      if (eRes.ok) setEvents((await eRes.json()).events || []);
      if (aRes.ok) setAudits((await aRes.json()).audits || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fStatus, fType, fLocation, fFrom, fTo]);

  const stats = useMemo(() => {
    const thisMonth = new Date().toISOString().slice(0, 7);
    const active = events.filter((e) => e.status === "suspected" || e.status === "confirmed").length;
    const mtd = events.filter((e) => e.onsetDate.startsWith(thisMonth)).length;
    const mdro = events.filter((e) => e.type === "mdro" && (e.status === "suspected" || e.status === "confirmed")).length;
    // Monthly compliance: avg over audits this month
    const monthAudits = audits.filter((a) => a.auditDate.startsWith(thisMonth));
    const pcts = monthAudits.map(compPct);
    const hhAvg = pcts.length === 0 ? null : Math.round((pcts.reduce((a, b) => a + b, 0) / pcts.length) * 10) / 10;
    return { active, mtd, mdro, hhAvg };
  }, [events, audits]);

  function openEventForm(e?: HAIEvent) {
    if (e) {
      setEditingEventId(e.id);
      setEventForm({
        patientNameSnapshot: e.patientNameSnapshot || "",
        location: e.location,
        type: e.type,
        organism: e.organism || "",
        organismOther: e.organismOther || "",
        onsetDate: e.onsetDate,
        identifiedDate: e.identifiedDate || "",
        deviceType: e.deviceType || "",
        deviceInsertedAt: e.deviceInsertedAt?.slice(0, 10) || "",
        cultureSpecimen: e.cultureSpecimen || "",
        cultureResult: e.cultureResult || "",
        sensitivityPattern: e.sensitivityPattern || "",
        isolation: e.isolation,
        rcaDone: e.rcaDone ? "1" : "0",
        rcaSummary: e.rcaSummary || "",
        correctiveActions: e.correctiveActions || "",
        reportedToHic: e.reportedToHic ? "1" : "0",
        reportedBy: e.reportedBy || "",
        outcome: e.outcome || "",
        status: e.status,
        notes: e.notes || "",
      });
    } else {
      setEditingEventId(null);
      setEventForm({
        type: "clabsi",
        isolation: "contact",
        status: "suspected",
        onsetDate: new Date().toISOString().slice(0, 10),
        rcaDone: "0",
        reportedToHic: "0",
      });
    }
    setShowEventForm(true);
  }

  async function saveEvent() {
    if (!eventForm.location?.trim()) {
      alert("Location is required");
      return;
    }
    const body: Record<string, unknown> = {
      patientNameSnapshot: eventForm.patientNameSnapshot,
      location: eventForm.location,
      type: eventForm.type,
      organism: eventForm.organism || undefined,
      organismOther: eventForm.organismOther,
      onsetDate: eventForm.onsetDate,
      identifiedDate: eventForm.identifiedDate,
      deviceType: eventForm.deviceType,
      deviceInsertedAt: eventForm.deviceInsertedAt,
      cultureSpecimen: eventForm.cultureSpecimen,
      cultureResult: eventForm.cultureResult,
      sensitivityPattern: eventForm.sensitivityPattern,
      isolation: eventForm.isolation,
      rcaDone: eventForm.rcaDone === "1",
      rcaSummary: eventForm.rcaSummary,
      correctiveActions: eventForm.correctiveActions,
      reportedToHic: eventForm.reportedToHic === "1",
      reportedBy: eventForm.reportedBy,
      outcome: eventForm.outcome,
      status: eventForm.status,
      notes: eventForm.notes,
    };
    const res = await fetch("/api/hospital/infection", {
      method: editingEventId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(editingEventId ? { id: editingEventId, ...body } : body),
    });
    if (res.ok) {
      setShowEventForm(false);
      setEditingEventId(null);
      setEventForm({});
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      alert(`Failed: ${d.error || res.statusText}`);
    }
  }

  async function deleteEvent(id: string) {
    if (!confirm("Delete this HAI record? This removes surveillance data.")) return;
    await fetch("/api/hospital/infection", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  function openAuditForm(a?: HHAudit) {
    if (a) {
      setEditingAuditId(a.id);
      setAuditForm({
        auditDate: a.auditDate,
        location: a.location,
        observer: a.observer,
        roleDoctor: String(a.roleDoctor),
        doctorCompliant: String(a.doctorCompliant),
        roleNurse: String(a.roleNurse),
        nurseCompliant: String(a.nurseCompliant),
        roleOther: String(a.roleOther),
        otherCompliant: String(a.otherCompliant),
        moment1Before: String(a.moment1Before),
        moment2Before: String(a.moment2Before),
        moment3After: String(a.moment3After),
        moment4After: String(a.moment4After),
        moment5After: String(a.moment5After),
        notes: a.notes || "",
      });
    } else {
      setEditingAuditId(null);
      setAuditForm({
        auditDate: new Date().toISOString().slice(0, 10),
      });
    }
    setShowAuditForm(true);
  }

  async function saveAudit() {
    if (!auditForm.location?.trim() || !auditForm.observer?.trim()) {
      alert("Location and observer are required");
      return;
    }
    const num = (k: string) => (auditForm[k] ? Number(auditForm[k]) : 0);
    const body: Record<string, unknown> = {
      auditDate: auditForm.auditDate,
      location: auditForm.location,
      observer: auditForm.observer,
      roleDoctor: num("roleDoctor"),
      doctorCompliant: num("doctorCompliant"),
      roleNurse: num("roleNurse"),
      nurseCompliant: num("nurseCompliant"),
      roleOther: num("roleOther"),
      otherCompliant: num("otherCompliant"),
      moment1Before: num("moment1Before"),
      moment2Before: num("moment2Before"),
      moment3After: num("moment3After"),
      moment4After: num("moment4After"),
      moment5After: num("moment5After"),
      notes: auditForm.notes,
    };
    const res = await fetch("/api/hospital/infection/audits", {
      method: editingAuditId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(editingAuditId ? { id: editingAuditId, ...body } : body),
    });
    if (res.ok) {
      setShowAuditForm(false);
      setEditingAuditId(null);
      setAuditForm({});
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      alert(`Failed: ${d.error || res.statusText}`);
    }
  }

  async function deleteAudit(id: string) {
    if (!confirm("Delete this audit?")) return;
    await fetch("/api/hospital/infection/audits", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <PageHero
        icon="🦠"
        eyebrow="HAI Surveillance"
        title="Infection Control"
        subtitle="HAI surveillance (CLABSI / CAUTI / VAP / SSI / MDRO) and WHO 5-moments hand hygiene compliance"
        tone="rose"
        primaryAction={
          tab === "hai"
            ? { label: "+ New HAI Event", onClick: () => openEventForm() }
            : { label: "+ New Audit", onClick: () => openAuditForm() }
        }
      />

      <StatGrid cols={4}>
        <StatCard label="Active HAI" value={stats.active} tone={stats.active > 0 ? "rose" : "slate"} icon="🔴" />
        <StatCard label="Events this month" value={stats.mtd} tone={stats.mtd > 0 ? "amber" : "slate"} icon="📅" />
        <StatCard label="Active MDRO" value={stats.mdro} tone={stats.mdro > 0 ? "rose" : "emerald"} icon="⚠️" />
        <StatCard label="HH compliance (MTD)" value={stats.hhAvg === null ? "—" : `${stats.hhAvg}%`} tone={stats.hhAvg === null ? "slate" : stats.hhAvg >= 80 ? "emerald" : stats.hhAvg >= 60 ? "amber" : "rose"} icon="🧼" />
      </StatGrid>

      <div className="flex gap-1 border-b border-slate-200">
        {(["hai", "hh"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t ? "border-b-2 border-primary-600 text-primary-700" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {t === "hai" ? "HAI Surveillance" : "Hand Hygiene Audits"}
          </button>
        ))}
      </div>

      {tab === "hai" && (
        <Section>
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <Field label="Status">
              <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="inp">
                <option value="">All</option>
                {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
              </select>
            </Field>
            <Field label="Type">
              <select value={fType} onChange={(e) => setFType(e.target.value)} className="inp">
                <option value="">All</option>
                {HAI_TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
            </Field>
            <Field label="Location">
              <input value={fLocation} onChange={(e) => setFLocation(e.target.value)} className="inp" placeholder="e.g. ICU" />
            </Field>
            <Field label="From">
              <input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} className="inp" />
            </Field>
            <Field label="To">
              <input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} className="inp" />
            </Field>
            {(fStatus || fType || fLocation || fFrom || fTo) && (
              <button onClick={() => { setFStatus(""); setFType(""); setFLocation(""); setFFrom(""); setFTo(""); }} className="text-sm text-slate-500 hover:text-slate-800">
                Clear
              </button>
            )}
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">Loading…</div>
          ) : events.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">No HAI events recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-3">Event #</th>
                    <th className="py-2 pr-3">Onset</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Organism</th>
                    <th className="py-2 pr-3">Location</th>
                    <th className="py-2 pr-3">Patient</th>
                    <th className="py-2 pr-3">Isolation</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {events.map((e) => {
                    const isOpen = expandedId === e.id;
                    return (
                      <Fragment key={e.id}>
                        <tr className="hover:bg-slate-50">
                          <td className="py-2 pr-3 font-mono text-xs text-slate-600">{e.eventNumber}</td>
                          <td className="py-2 pr-3 text-slate-700">{fmtDate(e.onsetDate)}</td>
                          <td className="py-2 pr-3 text-slate-700">{HAI_TYPES.find((t) => t.v === e.type)?.l}</td>
                          <td className="py-2 pr-3 text-slate-700">
                            {e.organism === "other" ? e.organismOther || "Other" : e.organism ? ORGANISMS.find((o) => o.v === e.organism)?.l : "—"}
                          </td>
                          <td className="py-2 pr-3 text-slate-700">{e.location}</td>
                          <td className="py-2 pr-3 text-slate-700">{e.patientNameSnapshot || "—"}</td>
                          <td className="py-2 pr-3">
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${isolationPill(e.isolation)}`}>
                              {ISOLATIONS.find((i) => i.v === e.isolation)?.l}
                            </span>
                          </td>
                          <td className="py-2 pr-3">
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusPill(e.status)}`}>
                              {STATUSES.find((s) => s.v === e.status)?.l}
                            </span>
                          </td>
                          <td className="py-2 pr-3 text-right">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => setExpandedId(isOpen ? null : e.id)} className="rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-200">{isOpen ? "Hide" : "Details"}</button>
                              <button onClick={() => openEventForm(e)} className="rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-200">Edit</button>
                              <button onClick={() => deleteEvent(e.id)} className="rounded bg-red-50 px-2 py-1 text-[11px] text-red-600 hover:bg-red-100">Delete</button>
                            </div>
                          </td>
                        </tr>
                        {isOpen && (
                          <tr>
                            <td colSpan={9} className="bg-slate-50 px-3 py-3">
                              <div className="grid grid-cols-2 gap-x-8 gap-y-2 md:grid-cols-3">
                                <KV label="Identified" value={fmtDate(e.identifiedDate)} />
                                <KV label="Device" value={e.deviceType || "—"} />
                                <KV label="Device inserted" value={fmtDate(e.deviceInsertedAt)} />
                                <KV label="Culture specimen" value={e.cultureSpecimen || "—"} />
                                <KV label="Culture result" value={e.cultureResult || "—"} />
                                <KV label="Sensitivity" value={e.sensitivityPattern || "—"} />
                                <KV label="Isolation started" value={fmtDate(e.isolationStartedAt)} />
                                <KV label="Isolation ended" value={fmtDate(e.isolationEndedAt)} />
                                <KV label="RCA done" value={e.rcaDone ? "Yes" : "No"} />
                                <KV label="Reported to HIC" value={e.reportedToHic ? `Yes — ${e.reportedBy || ""}` : "Not reported"} />
                                <KV label="Outcome" value={e.outcome || "—"} />
                                {e.rcaSummary && <KV label="RCA summary" value={e.rcaSummary} />}
                                {e.correctiveActions && <KV label="Actions" value={e.correctiveActions} />}
                                {e.notes && <KV label="Notes" value={e.notes} />}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}

      {tab === "hh" && (
        <Section>
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">Loading…</div>
          ) : audits.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">No audits recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-3">Audit #</th>
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Location</th>
                    <th className="py-2 pr-3">Observer</th>
                    <th className="py-2 pr-3">Doctors</th>
                    <th className="py-2 pr-3">Nurses</th>
                    <th className="py-2 pr-3">Other</th>
                    <th className="py-2 pr-3">Compliance</th>
                    <th className="py-2 pr-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {audits.map((a) => {
                    const pct = compPct(a);
                    const pctCls = pct >= 80 ? "text-emerald-700" : pct >= 60 ? "text-amber-700" : "text-red-700";
                    return (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="py-2 pr-3 font-mono text-xs text-slate-600">{a.auditNumber}</td>
                        <td className="py-2 pr-3 text-slate-700">{fmtDate(a.auditDate)}</td>
                        <td className="py-2 pr-3 text-slate-700">{a.location}</td>
                        <td className="py-2 pr-3 text-slate-700">{a.observer}</td>
                        <td className="py-2 pr-3 text-slate-600">{a.doctorCompliant}/{a.roleDoctor}</td>
                        <td className="py-2 pr-3 text-slate-600">{a.nurseCompliant}/{a.roleNurse}</td>
                        <td className="py-2 pr-3 text-slate-600">{a.otherCompliant}/{a.roleOther}</td>
                        <td className={`py-2 pr-3 font-semibold ${pctCls}`}>{pct}%</td>
                        <td className="py-2 pr-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => openAuditForm(a)} className="rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-200">Edit</button>
                            <button onClick={() => deleteAudit(a.id)} className="rounded bg-red-50 px-2 py-1 text-[11px] text-red-600 hover:bg-red-100">Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}

      {/* HAI form */}
      {showEventForm && (
        <Modal onClose={() => setShowEventForm(false)} title={editingEventId ? "Edit HAI Event" : "New HAI Event"}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Patient name">
              <input value={eventForm.patientNameSnapshot || ""} onChange={(e) => setEventForm({ ...eventForm, patientNameSnapshot: e.target.value })} className="inp" />
            </Field>
            <Field label="Location *">
              <input value={eventForm.location || ""} onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })} className="inp" placeholder="ICU / Ward 3B / OT-1" />
            </Field>
            <Field label="Infection type">
              <select value={eventForm.type || "clabsi"} onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })} className="inp">
                {HAI_TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
            </Field>
            <Field label="Organism">
              <select value={eventForm.organism || ""} onChange={(e) => setEventForm({ ...eventForm, organism: e.target.value })} className="inp">
                <option value="">—</option>
                {ORGANISMS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </Field>
            {eventForm.organism === "other" && (
              <Field label="Organism (other)">
                <input value={eventForm.organismOther || ""} onChange={(e) => setEventForm({ ...eventForm, organismOther: e.target.value })} className="inp" />
              </Field>
            )}
            <Field label="Onset date">
              <input type="date" value={eventForm.onsetDate || ""} onChange={(e) => setEventForm({ ...eventForm, onsetDate: e.target.value })} className="inp" />
            </Field>
            <Field label="Identified date">
              <input type="date" value={eventForm.identifiedDate || ""} onChange={(e) => setEventForm({ ...eventForm, identifiedDate: e.target.value })} className="inp" />
            </Field>
            <Field label="Device type">
              <input value={eventForm.deviceType || ""} onChange={(e) => setEventForm({ ...eventForm, deviceType: e.target.value })} className="inp" placeholder="Central line / Foley / Ventilator" />
            </Field>
            <Field label="Device inserted">
              <input type="date" value={eventForm.deviceInsertedAt || ""} onChange={(e) => setEventForm({ ...eventForm, deviceInsertedAt: e.target.value })} className="inp" />
            </Field>
            <Field label="Culture specimen">
              <input value={eventForm.cultureSpecimen || ""} onChange={(e) => setEventForm({ ...eventForm, cultureSpecimen: e.target.value })} className="inp" placeholder="Blood / Urine / Sputum" />
            </Field>
            <Field label="Culture result">
              <input value={eventForm.cultureResult || ""} onChange={(e) => setEventForm({ ...eventForm, cultureResult: e.target.value })} className="inp" />
            </Field>
            <Field label="Sensitivity pattern" span={2}>
              <textarea value={eventForm.sensitivityPattern || ""} onChange={(e) => setEventForm({ ...eventForm, sensitivityPattern: e.target.value })} className="inp" rows={2} placeholder="S: Meropenem, Colistin / R: Ceftriaxone" />
            </Field>
            <Field label="Isolation">
              <select value={eventForm.isolation || "standard"} onChange={(e) => setEventForm({ ...eventForm, isolation: e.target.value })} className="inp">
                {ISOLATIONS.map((i) => <option key={i.v} value={i.v}>{i.l}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={eventForm.status || "suspected"} onChange={(e) => setEventForm({ ...eventForm, status: e.target.value })} className="inp">
                {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
              </select>
            </Field>
            <Field label="RCA done?">
              <select value={eventForm.rcaDone || "0"} onChange={(e) => setEventForm({ ...eventForm, rcaDone: e.target.value })} className="inp">
                <option value="0">No</option>
                <option value="1">Yes</option>
              </select>
            </Field>
            <Field label="Reported to HIC?">
              <select value={eventForm.reportedToHic || "0"} onChange={(e) => setEventForm({ ...eventForm, reportedToHic: e.target.value })} className="inp">
                <option value="0">No</option>
                <option value="1">Yes</option>
              </select>
            </Field>
            <Field label="Reported by">
              <input value={eventForm.reportedBy || ""} onChange={(e) => setEventForm({ ...eventForm, reportedBy: e.target.value })} className="inp" />
            </Field>
            <Field label="Outcome">
              <input value={eventForm.outcome || ""} onChange={(e) => setEventForm({ ...eventForm, outcome: e.target.value })} className="inp" placeholder="Resolved with Rx / step-down" />
            </Field>
            <Field label="RCA summary" span={2}>
              <textarea value={eventForm.rcaSummary || ""} onChange={(e) => setEventForm({ ...eventForm, rcaSummary: e.target.value })} className="inp" rows={2} />
            </Field>
            <Field label="Corrective actions (CAPA)" span={2}>
              <textarea value={eventForm.correctiveActions || ""} onChange={(e) => setEventForm({ ...eventForm, correctiveActions: e.target.value })} className="inp" rows={2} />
            </Field>
            <Field label="Notes" span={2}>
              <textarea value={eventForm.notes || ""} onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })} className="inp" rows={2} />
            </Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowEventForm(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={saveEvent} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
              {editingEventId ? "Save" : "Create event"}
            </button>
          </div>
        </Modal>
      )}

      {/* Audit form */}
      {showAuditForm && (
        <Modal onClose={() => setShowAuditForm(false)} title={editingAuditId ? "Edit Audit" : "New Hand Hygiene Audit"}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Audit date">
              <input type="date" value={auditForm.auditDate || ""} onChange={(e) => setAuditForm({ ...auditForm, auditDate: e.target.value })} className="inp" />
            </Field>
            <Field label="Location *">
              <input value={auditForm.location || ""} onChange={(e) => setAuditForm({ ...auditForm, location: e.target.value })} className="inp" placeholder="ICU / Ward / OPD" />
            </Field>
            <Field label="Observer *" span={2}>
              <input value={auditForm.observer || ""} onChange={(e) => setAuditForm({ ...auditForm, observer: e.target.value })} className="inp" />
            </Field>
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">By role (opportunities / compliant)</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Doctors — opportunities">
                <input type="number" min={0} value={auditForm.roleDoctor || ""} onChange={(e) => setAuditForm({ ...auditForm, roleDoctor: e.target.value })} className="inp" />
              </Field>
              <Field label="Doctors — compliant">
                <input type="number" min={0} value={auditForm.doctorCompliant || ""} onChange={(e) => setAuditForm({ ...auditForm, doctorCompliant: e.target.value })} className="inp" />
              </Field>
              <Field label="Nurses — opportunities">
                <input type="number" min={0} value={auditForm.roleNurse || ""} onChange={(e) => setAuditForm({ ...auditForm, roleNurse: e.target.value })} className="inp" />
              </Field>
              <Field label="Nurses — compliant">
                <input type="number" min={0} value={auditForm.nurseCompliant || ""} onChange={(e) => setAuditForm({ ...auditForm, nurseCompliant: e.target.value })} className="inp" />
              </Field>
              <Field label="Other staff — opportunities">
                <input type="number" min={0} value={auditForm.roleOther || ""} onChange={(e) => setAuditForm({ ...auditForm, roleOther: e.target.value })} className="inp" />
              </Field>
              <Field label="Other staff — compliant">
                <input type="number" min={0} value={auditForm.otherCompliant || ""} onChange={(e) => setAuditForm({ ...auditForm, otherCompliant: e.target.value })} className="inp" />
              </Field>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">WHO 5 moments — observed count per moment</div>
            <div className="grid grid-cols-5 gap-2">
              <Field label="1. Before pt contact">
                <input type="number" min={0} value={auditForm.moment1Before || ""} onChange={(e) => setAuditForm({ ...auditForm, moment1Before: e.target.value })} className="inp" />
              </Field>
              <Field label="2. Before aseptic">
                <input type="number" min={0} value={auditForm.moment2Before || ""} onChange={(e) => setAuditForm({ ...auditForm, moment2Before: e.target.value })} className="inp" />
              </Field>
              <Field label="3. After body fluid">
                <input type="number" min={0} value={auditForm.moment3After || ""} onChange={(e) => setAuditForm({ ...auditForm, moment3After: e.target.value })} className="inp" />
              </Field>
              <Field label="4. After pt contact">
                <input type="number" min={0} value={auditForm.moment4After || ""} onChange={(e) => setAuditForm({ ...auditForm, moment4After: e.target.value })} className="inp" />
              </Field>
              <Field label="5. After surroundings">
                <input type="number" min={0} value={auditForm.moment5After || ""} onChange={(e) => setAuditForm({ ...auditForm, moment5After: e.target.value })} className="inp" />
              </Field>
            </div>
          </div>

          <div className="mt-3">
            <Field label="Notes">
              <textarea value={auditForm.notes || ""} onChange={(e) => setAuditForm({ ...auditForm, notes: e.target.value })} className="inp" rows={2} />
            </Field>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowAuditForm(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={saveAudit} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
              {editingAuditId ? "Save" : "Create audit"}
            </button>
          </div>
        </Modal>
      )}

      <style jsx>{`
        .inp {
          width: 100%;
          border: 1px solid rgb(226 232 240);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 13px;
          background: white;
          color: rgb(15 23 42);
        }
        .inp:focus {
          outline: none;
          border-color: rgb(14 165 233);
          box-shadow: 0 0 0 3px rgb(186 230 253 / 0.4);
        }
      `}</style>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone: "emerald" | "amber" | "red" | "blue" | "slate" }) {
  const toneCls: Record<string, string> = {
    emerald: "text-emerald-700 bg-emerald-50 ring-emerald-200",
    amber: "text-amber-700 bg-amber-50 ring-amber-200",
    red: "text-red-700 bg-red-50 ring-red-200",
    blue: "text-blue-700 bg-blue-50 ring-blue-200",
    slate: "text-slate-700 bg-slate-50 ring-slate-200",
  };
  return (
    <div className={`rounded-xl p-4 ring-1 ${toneCls[tone]}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-5">{children}</div>;
}

function Field({ label, children, span }: { label: string; children: React.ReactNode; span?: number }) {
  return (
    <label className={span === 2 ? "col-span-2 block" : "block"}>
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-[13px] text-slate-700">{value}</div>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
