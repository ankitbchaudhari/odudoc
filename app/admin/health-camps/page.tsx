"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  HealthCamp, CampRegistration, CampStatus, CampType, Partnership, RegistrationOutcome, Gender,
} from "@/lib/hospital/health-camps-store";
// Inlined from health-camps-store — importing runtime values pulls persistent-array → Postgres into the client bundle and crashes the page.
const CAMP_TYPE_LABEL: Record<CampType, string> = {
  general: "General", eye: "Eye", dental: "Dental", diabetes: "Diabetes",
  cardiac: "Cardiac", cancer_screening: "Cancer screening", immunization: "Immunization",
  womens_health: "Women's health", pediatric: "Pediatric", geriatric: "Geriatric",
  mental_health: "Mental health", school: "School", corporate: "Corporate",
  cme: "CME / academic", awareness: "Awareness",
};
const STATUS_LABEL: Record<CampStatus, string> = {
  planned: "Planned", approved: "Approved", ongoing: "Ongoing",
  completed: "Completed", cancelled: "Cancelled",
};
const PARTNERSHIP_LABEL: Record<Partnership, string> = {
  standalone: "Standalone", ngo: "NGO", corporate_csr: "Corporate CSR",
  govt: "Government", school: "School", religious_body: "Religious body", community: "Community",
};
const OUTCOME_LABEL: Record<RegistrationOutcome, string> = {
  registered: "Registered", screened: "Screened", referred: "Referred",
  treated_on_site: "Treated on-site", no_show: "No-show", declined: "Declined",
};

const TYPES: CampType[] = ["general", "eye", "dental", "diabetes", "cardiac", "cancer_screening", "immunization", "womens_health", "pediatric", "geriatric", "mental_health", "school", "corporate", "cme", "awareness"];
const STATUSES: CampStatus[] = ["planned", "approved", "ongoing", "completed", "cancelled"];
const PARTNERSHIPS: Partnership[] = ["standalone", "ngo", "corporate_csr", "govt", "school", "religious_body", "community"];
const OUTCOMES: RegistrationOutcome[] = ["registered", "screened", "referred", "treated_on_site", "no_show", "declined"];
const GENDERS: Gender[] = ["male", "female", "other", "unspecified"];

export default function HealthCampsPage() {
  const [tab, setTab] = useState<"camps" | "regs">("camps");
  const [camps, setCamps] = useState<HealthCamp[]>([]);
  const [regs, setRegs] = useState<CampRegistration[]>([]);
  const [stats, setStats] = useState<{ upcoming: number; ongoing: number; completedMonth: number; totalReachedMonth: number; screenedMonth: number; referredMonth: number; pendingApproval: number } | null>(null);
  const [showCamp, setShowCamp] = useState(false);
  const [showReg, setShowReg] = useState(false);
  const [editCamp, setEditCamp] = useState<HealthCamp | null>(null);
  const [editReg, setEditReg] = useState<CampRegistration | null>(null);
  const [filterStatus, setFilterStatus] = useState<CampStatus | "">("");
  const [filterCampId, setFilterCampId] = useState<string>("");

  async function load() {
    const res = await fetch("/api/hospital/health-camps", { cache: "no-store" });
    const data = await res.json();
    setCamps(data.camps || []);
    setRegs(data.registrations || []);
    setStats(data.stats || null);
  }
  useEffect(() => { load(); }, []);

  async function removeCamp(id: string) {
    if (!confirm("Delete camp and all its registrations?")) return;
    await fetch("/api/hospital/health-camps", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }
  async function removeReg(id: string) {
    if (!confirm("Delete registration?")) return;
    await fetch("/api/hospital/health-camps", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, kind: "registration" }) });
    load();
  }

  const filteredCamps = useMemo(
    () => camps.filter((c) => (filterStatus ? c.status === filterStatus : true)),
    [camps, filterStatus],
  );
  const filteredRegs = useMemo(
    () => regs.filter((r) => (filterCampId ? r.campId === filterCampId : true)),
    [regs, filterCampId],
  );

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Health Camps & Outreach</h1>
          <p className="text-sm text-slate-500">Plan, run, and report community health events</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setEditCamp(null); setShowCamp(true); }} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">+ Camp</button>
          <button onClick={() => { setEditReg(null); setShowReg(true); }} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">+ Registration</button>
        </div>
      </div>

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          <StatTile label="Upcoming" value={stats.upcoming} tone="indigo" />
          <StatTile label="Ongoing" value={stats.ongoing} tone="emerald" />
          <StatTile label="Pending approval" value={stats.pendingApproval} tone="amber" />
          <StatTile label="Completed (month)" value={stats.completedMonth} tone="slate" />
          <StatTile label="Reached (month)" value={stats.totalReachedMonth} tone="slate" />
          <StatTile label="Screened (month)" value={stats.screenedMonth} tone="slate" />
          <StatTile label="Referred (month)" value={stats.referredMonth} tone="rose" />
        </div>
      )}

      <div className="mb-4 flex items-center gap-2">
        <TabBtn active={tab === "camps"} onClick={() => setTab("camps")}>Camps ({camps.length})</TabBtn>
        <TabBtn active={tab === "regs"} onClick={() => setTab("regs")}>Registrations ({regs.length})</TabBtn>
      </div>

      {tab === "camps" && (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <FilterPill active={filterStatus === ""} onClick={() => setFilterStatus("")}>All</FilterPill>
            {STATUSES.map((s) => (
              <FilterPill key={s} active={filterStatus === s} onClick={() => setFilterStatus(s)}>{STATUS_LABEL[s]}</FilterPill>
            ))}
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Camp</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Venue</th>
                  <th className="px-4 py-3">Partnership</th>
                  <th className="px-4 py-3">Reach</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCamps.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{c.name}</div>
                      <div className="text-xs text-slate-500">{c.id} · {c.coordinatorName}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{CAMP_TYPE_LABEL[c.campType]}</td>
                    <td className="px-4 py-3 text-slate-600">{new Date(c.startAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-slate-700">{c.venueName}{c.city ? `, ${c.city}` : ""}</td>
                    <td className="px-4 py-3 text-slate-700">{PARTNERSHIP_LABEL[c.partnership]}{c.partnerName ? ` · ${c.partnerName}` : ""}</td>
                    <td className="px-4 py-3 text-slate-700">
                      <div className="text-xs">Reg: <b>{c.registeredCount}</b> / Scr: {c.screenedCount}</div>
                      <div className="text-xs text-rose-600">Ref: {c.referredCount} · Tr: {c.treatedOnSiteCount}</div>
                    </td>
                    <td className="px-4 py-3"><Pill status={c.status}>{STATUS_LABEL[c.status]}</Pill></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { setFilterCampId(c.id); setTab("regs"); }} className="mr-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700">View regs</button>
                      <button onClick={() => { setEditCamp(c); setShowCamp(true); }} className="mr-2 text-xs font-semibold text-primary-600 hover:text-primary-700">Edit</button>
                      <button onClick={() => removeCamp(c.id)} className="text-xs font-semibold text-rose-600 hover:text-rose-700">Delete</button>
                    </td>
                  </tr>
                ))}
                {filteredCamps.length === 0 && <tr><td colSpan={8}><Empty>No camps yet.</Empty></td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "regs" && (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <FilterPill active={filterCampId === ""} onClick={() => setFilterCampId("")}>All camps</FilterPill>
            {camps.map((c) => (
              <FilterPill key={c.id} active={filterCampId === c.id} onClick={() => setFilterCampId(c.id)}>{c.name.slice(0, 20)}</FilterPill>
            ))}
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Attendee</th>
                  <th className="px-4 py-3">Camp</th>
                  <th className="px-4 py-3">Demo</th>
                  <th className="px-4 py-3">Vitals</th>
                  <th className="px-4 py-3">Outcome</th>
                  <th className="px-4 py-3">Referral</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRegs.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{r.attendeeName}</div>
                      <div className="text-xs text-slate-500">{r.id}{r.phone ? ` · ${r.phone}` : ""}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{r.campName}</td>
                    <td className="px-4 py-3 text-slate-700 text-xs">{r.age ?? "-"} {r.gender ? `/ ${r.gender[0].toUpperCase()}` : ""}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {r.bpSystolic ? <div>BP {r.bpSystolic}/{r.bpDiastolic ?? "?"}</div> : null}
                      {r.bloodSugarMgDl ? <div>RBS {r.bloodSugarMgDl}</div> : null}
                      {r.bmi ? <div>BMI {r.bmi}</div> : null}
                      {r.visualAcuityOd || r.visualAcuityOs ? <div>VA {r.visualAcuityOd ?? "-"}/{r.visualAcuityOs ?? "-"}</div> : null}
                    </td>
                    <td className="px-4 py-3"><Pill status={r.outcome}>{OUTCOME_LABEL[r.outcome]}</Pill></td>
                    <td className="px-4 py-3 text-xs text-slate-600">{r.referredTo || "-"}{r.followUpDate ? ` · ${r.followUpDate}` : ""}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { setEditReg(r); setShowReg(true); }} className="mr-2 text-xs font-semibold text-primary-600 hover:text-primary-700">Edit</button>
                      <button onClick={() => removeReg(r.id)} className="text-xs font-semibold text-rose-600 hover:text-rose-700">Delete</button>
                    </td>
                  </tr>
                ))}
                {filteredRegs.length === 0 && <tr><td colSpan={7}><Empty>No registrations yet.</Empty></td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showCamp && (
        <CampModal
          initial={editCamp}
          onClose={() => { setShowCamp(false); setEditCamp(null); }}
          onSaved={() => { setShowCamp(false); setEditCamp(null); load(); }}
        />
      )}
      {showReg && (
        <RegModal
          camps={camps}
          initial={editReg}
          defaultCampId={filterCampId || (camps[0]?.id ?? "")}
          onClose={() => { setShowReg(false); setEditReg(null); }}
          onSaved={() => { setShowReg(false); setEditReg(null); load(); }}
        />
      )}
    </div>
  );
}

function CampModal({ initial, onClose, onSaved }: { initial: HealthCamp | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<HealthCamp>>(
    initial ?? {
      campType: "general", partnership: "standalone", status: "planned",
      startAt: new Date().toISOString().slice(0, 16),
    },
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setBusy(true); setErr("");
    const method = initial ? "PATCH" : "POST";
    const payload: Record<string, unknown> = { ...form };
    if (initial) payload.id = initial.id;
    const res = await fetch("/api/hospital/health-camps", {
      method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) { setErr(data.error || "save_failed"); setBusy(false); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-6">
      <div className="my-8 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-slate-900">{initial ? "Edit camp" : "New camp"}</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Name *"><input className="inp" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Type"><select className="inp" value={form.campType || "general"} onChange={(e) => setForm({ ...form, campType: e.target.value as CampType })}>{TYPES.map((t) => <option key={t} value={t}>{CAMP_TYPE_LABEL[t]}</option>)}</select></Field>
          <Field label="Start *"><input type="datetime-local" className="inp" value={(form.startAt || "").slice(0, 16)} onChange={(e) => setForm({ ...form, startAt: e.target.value })} /></Field>
          <Field label="End"><input type="datetime-local" className="inp" value={(form.endAt || "").slice(0, 16)} onChange={(e) => setForm({ ...form, endAt: e.target.value })} /></Field>
          <Field label="Venue *"><input className="inp" value={form.venueName || ""} onChange={(e) => setForm({ ...form, venueName: e.target.value })} /></Field>
          <Field label="City"><input className="inp" value={form.city || ""} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
          <Field label="State"><input className="inp" value={form.state || ""} onChange={(e) => setForm({ ...form, state: e.target.value })} /></Field>
          <Field label="Address"><input className="inp" value={form.venueAddress || ""} onChange={(e) => setForm({ ...form, venueAddress: e.target.value })} /></Field>
          <Field label="Coordinator *"><input className="inp" value={form.coordinatorName || ""} onChange={(e) => setForm({ ...form, coordinatorName: e.target.value })} /></Field>
          <Field label="Coordinator phone"><input className="inp" value={form.coordinatorPhone || ""} onChange={(e) => setForm({ ...form, coordinatorPhone: e.target.value })} /></Field>
          <Field label="Partnership"><select className="inp" value={form.partnership || "standalone"} onChange={(e) => setForm({ ...form, partnership: e.target.value as Partnership })}>{PARTNERSHIPS.map((p) => <option key={p} value={p}>{PARTNERSHIP_LABEL[p]}</option>)}</select></Field>
          <Field label="Partner name"><input className="inp" value={form.partnerName || ""} onChange={(e) => setForm({ ...form, partnerName: e.target.value })} /></Field>
          <Field label="Target community"><input className="inp" value={form.targetCommunity || ""} onChange={(e) => setForm({ ...form, targetCommunity: e.target.value })} /></Field>
          <Field label="Target count"><input type="number" className="inp" value={form.targetCount ?? ""} onChange={(e) => setForm({ ...form, targetCount: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
          <Field label="Budget (INR)"><input type="number" className="inp" value={form.budgetAmount ?? ""} onChange={(e) => setForm({ ...form, budgetAmount: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
          <Field label="Sponsor amount"><input type="number" className="inp" value={form.sponsorAmount ?? ""} onChange={(e) => setForm({ ...form, sponsorAmount: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
          <Field label="Status"><select className="inp" value={form.status || "planned"} onChange={(e) => setForm({ ...form, status: e.target.value as CampStatus })}>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></Field>
          <Field label="Approved by"><input className="inp" value={form.approvedBy || ""} onChange={(e) => setForm({ ...form, approvedBy: e.target.value })} /></Field>
          <Field label="Outcome summary" full><textarea className="inp" rows={2} value={form.outcomeSummary || ""} onChange={(e) => setForm({ ...form, outcomeSummary: e.target.value })} /></Field>
          <Field label="Lessons learned" full><textarea className="inp" rows={2} value={form.lessonsLearned || ""} onChange={(e) => setForm({ ...form, lessonsLearned: e.target.value })} /></Field>
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

function RegModal({ camps, initial, defaultCampId, onClose, onSaved }: { camps: HealthCamp[]; initial: CampRegistration | null; defaultCampId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<CampRegistration>>(
    initial ?? { campId: defaultCampId, outcome: "registered", gender: "unspecified" },
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setBusy(true); setErr("");
    const method = initial ? "PATCH" : "POST";
    const payload: Record<string, unknown> = { ...form, kind: "registration" };
    if (initial) payload.id = initial.id;
    const res = await fetch("/api/hospital/health-camps", {
      method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) { setErr(data.error || "save_failed"); setBusy(false); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-6">
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-slate-900">{initial ? "Edit registration" : "New registration"}</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Camp *" full>
            <select className="inp" value={form.campId || ""} onChange={(e) => setForm({ ...form, campId: e.target.value })}>
              <option value="">-- Select --</option>
              {camps.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.id})</option>)}
            </select>
          </Field>
          <Field label="Attendee name *"><input className="inp" value={form.attendeeName || ""} onChange={(e) => setForm({ ...form, attendeeName: e.target.value })} /></Field>
          <Field label="Phone"><input className="inp" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Age"><input type="number" className="inp" value={form.age ?? ""} onChange={(e) => setForm({ ...form, age: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
          <Field label="Gender"><select className="inp" value={form.gender || "unspecified"} onChange={(e) => setForm({ ...form, gender: e.target.value as Gender })}>{GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}</select></Field>
          <Field label="Address" full><input className="inp" value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <Field label="BP systolic"><input type="number" className="inp" value={form.bpSystolic ?? ""} onChange={(e) => setForm({ ...form, bpSystolic: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
          <Field label="BP diastolic"><input type="number" className="inp" value={form.bpDiastolic ?? ""} onChange={(e) => setForm({ ...form, bpDiastolic: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
          <Field label="Blood sugar (mg/dL)"><input type="number" className="inp" value={form.bloodSugarMgDl ?? ""} onChange={(e) => setForm({ ...form, bloodSugarMgDl: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
          <Field label="BMI"><input type="number" step="0.1" className="inp" value={form.bmi ?? ""} onChange={(e) => setForm({ ...form, bmi: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
          <Field label="VA (OD)"><input className="inp" value={form.visualAcuityOd || ""} onChange={(e) => setForm({ ...form, visualAcuityOd: e.target.value })} /></Field>
          <Field label="VA (OS)"><input className="inp" value={form.visualAcuityOs || ""} onChange={(e) => setForm({ ...form, visualAcuityOs: e.target.value })} /></Field>
          <Field label="Outcome"><select className="inp" value={form.outcome || "registered"} onChange={(e) => setForm({ ...form, outcome: e.target.value as RegistrationOutcome })}>{OUTCOMES.map((o) => <option key={o} value={o}>{OUTCOME_LABEL[o]}</option>)}</select></Field>
          <Field label="Referred to"><input className="inp" value={form.referredTo || ""} onChange={(e) => setForm({ ...form, referredTo: e.target.value })} /></Field>
          <Field label="Follow-up date"><input type="date" className="inp" value={form.followUpDate || ""} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} /></Field>
          <Field label="Converted patient ID"><input className="inp" value={form.convertedPatientId || ""} onChange={(e) => setForm({ ...form, convertedPatientId: e.target.value })} /></Field>
          <Field label="Screening findings" full><textarea className="inp" rows={2} value={form.screeningFindings || ""} onChange={(e) => setForm({ ...form, screeningFindings: e.target.value })} /></Field>
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
  const t: Record<string, string> = {
    slate: "bg-slate-50 text-slate-700", amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700", emerald: "bg-emerald-50 text-emerald-700",
    indigo: "bg-indigo-50 text-indigo-700",
  };
  return (
    <div className={`rounded-xl p-4 ${t[tone]}`}>
      <div className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`rounded-lg px-4 py-2 text-sm font-semibold ${active ? "bg-primary-600 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>{children}</button>;
}
function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`rounded-full border px-3 py-1 text-xs font-semibold ${active ? "border-primary-600 bg-primary-50 text-primary-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{children}</button>;
}
function Pill({ status, children }: { status: string; children: React.ReactNode }) {
  const map: Record<string, string> = {
    planned: "bg-slate-100 text-slate-700",
    approved: "bg-indigo-100 text-indigo-700",
    ongoing: "bg-emerald-100 text-emerald-700",
    completed: "bg-slate-100 text-slate-700",
    cancelled: "bg-rose-100 text-rose-700",
    registered: "bg-slate-100 text-slate-700",
    screened: "bg-indigo-100 text-indigo-700",
    referred: "bg-amber-100 text-amber-700",
    treated_on_site: "bg-emerald-100 text-emerald-700",
    no_show: "bg-rose-100 text-rose-700",
    declined: "bg-rose-100 text-rose-700",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${map[status] || "bg-slate-100 text-slate-700"}`}>{children}</span>;
}
function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return <label className={`block ${full ? "md:col-span-2" : ""}`}><div className="mb-1 text-xs font-semibold text-slate-600">{label}</div>{children}</label>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="p-8 text-center text-sm text-slate-500">{children}</div>;
}
