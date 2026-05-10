"use client";

import { useEffect, useState } from "react";
import { PageHero, StatGrid, StatCard } from "@/components/admin/PageShell";
import type {
  ICUStay,
  ICUObservation,
  StayStatus,
  StayEndReason,
  AdmissionSource,
  ICUReason,
  VentMode,
  SedationAgent,
  Pressor,
  ICUStats,
} from "@/lib/hospital/icu-store";
// Inlined from icu-store — importing runtime values pulls persistent-array → Postgres into the client bundle and crashes the page.
const REASON_LABEL: Record<ICUReason, string> = {
  sepsis: "Sepsis",
  ards: "ARDS",
  post_op: "Post-op",
  cardiac_arrest: "Cardiac arrest",
  stroke: "Stroke",
  mi: "MI",
  respiratory_failure: "Respiratory failure",
  renal_failure: "Renal failure",
  dka: "DKA",
  trauma: "Trauma",
  tbi: "TBI",
  poisoning: "Poisoning",
  gi_bleed: "GI bleed",
  shock: "Shock",
  other: "Other",
};
const VENT_LABEL: Record<VentMode, string> = {
  none: "Room air / none",
  niv: "NIV (BiPAP/CPAP)",
  ac_vc: "AC-VC",
  ac_pc: "AC-PC",
  simv: "SIMV",
  psv: "PSV",
  spont: "Spontaneous",
  hfnc: "HFNC",
  t_piece: "T-piece",
};
const SEDATION_LABEL: Record<SedationAgent, string> = {
  none: "None",
  propofol: "Propofol",
  midazolam: "Midazolam",
  fentanyl: "Fentanyl",
  morphine: "Morphine",
  dexmedetomidine: "Dexmedetomidine",
  ketamine: "Ketamine",
  paralytic: "Paralytic",
  other: "Other",
};
function latestObservation(stay: ICUStay, observations: ICUObservation[]): ICUObservation | null {
  return (
    observations
      .filter((o) => o.stayId === stay.id && o.organizationId === stay.organizationId)
      .sort((a, b) => (b.recordedAt || "").localeCompare(a.recordedAt || ""))[0] || null
  );
}
function stayLengthHours(stay: ICUStay): number {
  const start = new Date(stay.admittedAt).getTime();
  const end = stay.closedAt ? new Date(stay.closedAt).getTime() : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.round((end - start) / 3_600_000);
}
function stayStatusFlags(stay: ICUStay, observations: ICUObservation[]): {
  ventilated: boolean;
  onPressors: boolean;
  pressorCount: number;
  sedated: boolean;
} {
  const last = latestObservation(stay, observations);
  if (!last) {
    return { ventilated: false, onPressors: false, pressorCount: 0, sedated: false };
  }
  const ventilated = !!last.ventMode && last.ventMode !== "none" && last.ventMode !== "hfnc";
  const pressorCount = (last.pressors || []).filter((p) => p.name && p.rate).length;
  const sedated = !!last.sedation && last.sedation !== "none";
  return { ventilated, onPressors: pressorCount > 0, pressorCount, sedated };
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  mrn?: string;
}

const STAY_STATUSES: StayStatus[] = ["active", "closed"];
const REASONS: ICUReason[] = [
  "sepsis", "ards", "post_op", "cardiac_arrest", "stroke", "mi",
  "respiratory_failure", "renal_failure", "dka", "trauma", "tbi",
  "poisoning", "gi_bleed", "shock", "other",
];
const SOURCES: AdmissionSource[] = ["ed", "ward", "ot", "transfer_in", "direct", "other"];
const VENT_MODES: VentMode[] = ["none", "niv", "hfnc", "ac_vc", "ac_pc", "simv", "psv", "spont", "t_piece"];
const SEDATION_AGENTS: SedationAgent[] = [
  "none", "propofol", "midazolam", "fentanyl", "morphine",
  "dexmedetomidine", "ketamine", "paralytic", "other",
];
const END_REASONS: StayEndReason[] = [
  "stepped_down", "transferred", "discharged", "deceased", "dama", "other",
];

const STATUS_COLOR: Record<StayStatus, string> = {
  active: "bg-emerald-100 text-emerald-700",
  closed: "bg-slate-100 text-slate-700",
};

const END_COLOR: Record<StayEndReason, string> = {
  stepped_down: "bg-sky-100 text-sky-700",
  transferred: "bg-amber-100 text-amber-700",
  discharged: "bg-emerald-100 text-emerald-700",
  deceased: "bg-rose-100 text-rose-700",
  dama: "bg-orange-100 text-orange-700",
  other: "bg-slate-100 text-slate-700",
};

export default function ICUPage() {
  const [stays, setStays] = useState<ICUStay[]>([]);
  const [obsByStay, setObsByStay] = useState<Record<string, ICUObservation[]>>({});
  const [patients, setPatients] = useState<Patient[]>([]);
  const [stats, setStats] = useState<ICUStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState<StayStatus | "">("active");
  const [filterReason, setFilterReason] = useState<ICUReason | "">("");
  const [showStayForm, setShowStayForm] = useState(false);
  const [editStay, setEditStay] = useState<ICUStay | null>(null);
  const [addObsFor, setAddObsFor] = useState<ICUStay | null>(null);
  const [editObs, setEditObs] = useState<{ stay: ICUStay; obs: ICUObservation } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const p = new URLSearchParams();
    if (filterStatus) p.set("status", filterStatus);
    if (filterReason) p.set("reason", filterReason);
    const [stRes, patRes] = await Promise.all([
      fetch(`/api/hospital/icu?${p.toString()}`, { cache: "no-store" }),
      fetch("/api/patients", { cache: "no-store" }),
    ]);
    if (stRes.ok) {
      const d = await stRes.json();
      const list: ICUStay[] = d.stays || [];
      setStays(list);
      setStats(d.stats || null);
      const obs: Record<string, ICUObservation[]> = {};
      await Promise.all(
        list.map(async (s) => {
          const r = await fetch(`/api/hospital/icu/observations?stayId=${s.id}`, { cache: "no-store" });
          if (r.ok) {
            const sd = await r.json();
            obs[s.id] = sd.observations || [];
          }
        })
      );
      setObsByStay(obs);
    }
    if (patRes.ok) {
      const d = await patRes.json();
      setPatients(d.patients || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterReason]);

  async function saveStay(form: Partial<ICUStay>) {
    const method = editStay ? "PATCH" : "POST";
    const body = editStay ? { id: editStay.id, ...form } : form;
    const res = await fetch("/api/hospital/icu", {
      method, headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setShowStayForm(false);
      setEditStay(null);
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Failed to save");
    }
  }

  async function closeStay(s: ICUStay) {
    const endReason = prompt(
      `Close reason (${END_REASONS.join(", ")}):`,
      "stepped_down"
    ) as StayEndReason | null;
    if (!endReason || !END_REASONS.includes(endReason)) return;
    const endNote = prompt("Discharge note (optional):") || undefined;
    const res = await fetch("/api/hospital/icu", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: s.id, status: "closed", endReason, endNote }),
    });
    if (res.ok) load();
  }

  async function reopenStay(s: ICUStay) {
    const res = await fetch("/api/hospital/icu", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: s.id, status: "active" }),
    });
    if (res.ok) load();
  }

  async function deleteStay(s: ICUStay) {
    if (!confirm(`Delete ICU stay ${s.id}? All observations will be removed.`)) return;
    const res = await fetch("/api/hospital/icu", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: s.id }),
    });
    if (res.ok) load();
  }

  async function saveObs(form: Partial<ICUObservation>) {
    const isEdit = !!editObs;
    const method = isEdit ? "PATCH" : "POST";
    const body = isEdit ? { id: editObs!.obs.id, ...form } : form;
    const res = await fetch("/api/hospital/icu/observations", {
      method, headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setAddObsFor(null);
      setEditObs(null);
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Failed to save");
    }
  }

  async function deleteObs(o: ICUObservation) {
    if (!confirm(`Delete observation ${o.id}?`)) return;
    const res = await fetch("/api/hospital/icu/observations", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: o.id }),
    });
    if (res.ok) load();
  }

  return (
    <div className="space-y-6">
      <PageHero
        icon="🏥"
        eyebrow="Critical Care"
        title="ICU / Critical Care"
        subtitle="Critical care stays, hourly charting, ventilator & pressor tracking, SOFA / APACHE II"
        tone="rose"
        primaryAction={{ label: "+ Admit to ICU", onClick: () => { setEditStay(null); setShowStayForm(true); } }}
      />

      {stats && (
        <StatGrid cols={4}>
          <StatCard label="Active stays" value={stats.activeStays} tone="indigo" icon="🛏️" />
          <StatCard label="Ventilated" value={stats.ventilated} tone="amber" icon="🫁" />
          <StatCard label="On pressors" value={stats.onPressors} tone="rose" icon="💉" />
          <StatCard label="Observations today" value={stats.observationsToday} tone="sky" icon="📊" />
          <StatCard label="Admissions (mo)" value={stats.admissionsMonth} tone="violet" icon="📥" />
          <StatCard label="Deaths 30d" value={stats.mortality30d} tone="rose" icon="🕯️" />
          <StatCard label="Mortality 90d" value={`${stats.mortalityRate90d}%`} tone="fuchsia" icon="📉" />
          <StatCard label="Avg LOS (hr)" value={stats.avgLosHours} tone="emerald" icon="⏱️" />
        </StatGrid>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</span>
        <FilterBtn active={filterStatus === ""} onClick={() => setFilterStatus("")} label="All" />
        {STAY_STATUSES.map((s) => (
          <FilterBtn key={s} active={filterStatus === s} onClick={() => setFilterStatus(s)} label={s} />
        ))}
        <div className="mx-2 h-6 w-px bg-slate-200" />
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reason</span>
        <select
          value={filterReason}
          onChange={(e) => setFilterReason(e.target.value as ICUReason | "")}
          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
        >
          <option value="">All</option>
          {REASONS.map((r) => <option key={r} value={r}>{REASON_LABEL[r]}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">Loading…</div>
      ) : stays.length === 0 ? (
        <Empty />
      ) : (
        <div className="space-y-3">
          {stays.map((s) => (
            <StayCard
              key={s.id}
              stay={s}
              observations={obsByStay[s.id] || []}
              expanded={expanded === s.id}
              onToggle={() => setExpanded(expanded === s.id ? null : s.id)}
              onEdit={() => { setEditStay(s); setShowStayForm(true); }}
              onDelete={() => deleteStay(s)}
              onAddObs={() => setAddObsFor(s)}
              onEditObs={(obs) => setEditObs({ stay: s, obs })}
              onDeleteObs={deleteObs}
              onClose={() => closeStay(s)}
              onReopen={() => reopenStay(s)}
            />
          ))}
        </div>
      )}

      {showStayForm && (
        <StayFormModal
          stay={editStay}
          patients={patients}
          onSave={saveStay}
          onClose={() => { setShowStayForm(false); setEditStay(null); }}
        />
      )}
      {addObsFor && (
        <ObsFormModal
          stay={addObsFor}
          obs={null}
          onSave={saveObs}
          onClose={() => setAddObsFor(null)}
        />
      )}
      {editObs && (
        <ObsFormModal
          stay={editObs.stay}
          obs={editObs.obs}
          onSave={saveObs}
          onClose={() => setEditObs(null)}
        />
      )}

      <style jsx global>{`
        .inp {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgb(226 232 240);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .inp:focus {
          border-color: rgb(56 189 248);
          box-shadow: 0 0 0 3px rgb(186 230 253 / 0.4);
        }
      `}</style>
    </div>
  );
}

// ============================================================
// Stay Card
// ============================================================

function StayCard({
  stay, observations, expanded, onToggle,
  onEdit, onDelete, onAddObs, onEditObs, onDeleteObs, onClose, onReopen,
}: {
  stay: ICUStay;
  observations: ICUObservation[];
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddObs: () => void;
  onEditObs: (o: ICUObservation) => void;
  onDeleteObs: (o: ICUObservation) => void;
  onClose: () => void;
  onReopen: () => void;
}) {
  const last = latestObservation(stay, observations);
  const flags = stayStatusFlags(stay, observations);
  const hours = stayLengthHours(stay);
  const critical = (last?.lactate ?? 0) >= 4 || (last?.map ?? 999) < 65 || (last?.spo2 ?? 100) < 88;

  return (
    <div className={`rounded-xl border bg-white shadow-sm transition ${critical && stay.status === "active" ? "border-rose-300 ring-1 ring-rose-200" : "border-slate-200"}`}>
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={onToggle} className="text-left font-mono text-sm font-semibold text-primary-700 hover:underline">
                {stay.id}
              </button>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[stay.status]}`}>
                {stay.status}
              </span>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                {REASON_LABEL[stay.reason]}
              </span>
              {stay.bed && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                  {stay.bed}
                </span>
              )}
              {flags.ventilated && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                  🫁 Vent
                </span>
              )}
              {flags.onPressors && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800">
                  ❤ {flags.pressorCount} pressor{flags.pressorCount > 1 ? "s" : ""}
                </span>
              )}
              {flags.sedated && (
                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-800">
                  💤 Sedated
                </span>
              )}
              {stay.endReason && (
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${END_COLOR[stay.endReason]}`}>
                  {stay.endReason.replace("_", " ")}
                </span>
              )}
              {critical && stay.status === "active" && (
                <span className="rounded-full bg-rose-200 px-2 py-0.5 text-[11px] font-bold text-rose-900">⚠ Critical</span>
              )}
            </div>
            <div className="mt-1.5 text-[15px] font-semibold text-slate-900">{stay.patientName}</div>
            <div className="text-xs text-slate-600">
              {stay.diagnosis}
              {stay.intensivist ? ` · ${stay.intensivist}` : ""}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              <span>Admitted {fmtDateTime(stay.admittedAt)}</span>
              <span>·</span>
              <span className="font-mono">{hours}h LOS</span>
              {stay.sofaAdmission != null && (
                <>
                  <span>·</span>
                  <span>SOFA {stay.sofaAdmission}</span>
                </>
              )}
              {stay.apacheIi != null && (
                <>
                  <span>·</span>
                  <span>APACHE II {stay.apacheIi}</span>
                </>
              )}
            </div>

            {/* Latest snapshot */}
            {last && stay.status === "active" && (
              <div className="mt-2 flex flex-wrap gap-2 rounded-md bg-slate-50 px-3 py-2 text-[11px] text-slate-700">
                <span className="font-semibold uppercase text-slate-500">Last chart:</span>
                <span>{fmtDateTime(last.recordedAt)}</span>
                {last.heartRate != null && <Vital label="HR" value={`${last.heartRate}`} bad={last.heartRate > 120 || last.heartRate < 50} />}
                {last.bpSystolic != null && last.bpDiastolic != null && (
                  <Vital label="BP" value={`${last.bpSystolic}/${last.bpDiastolic}`} bad={last.bpSystolic < 90} />
                )}
                {last.map != null && <Vital label="MAP" value={`${last.map}`} bad={last.map < 65} />}
                {last.spo2 != null && <Vital label="SpO₂" value={`${last.spo2}%`} bad={last.spo2 < 92} />}
                {last.respRate != null && <Vital label="RR" value={`${last.respRate}`} bad={last.respRate > 24 || last.respRate < 10} />}
                {last.temperature != null && <Vital label="T" value={`${last.temperature}°`} bad={last.temperature > 38.5 || last.temperature < 35.5} />}
                {last.gcs != null && <Vital label="GCS" value={`${last.gcs}`} bad={last.gcs < 9} />}
                {last.lactate != null && <Vital label="Lac" value={`${last.lactate}`} bad={last.lactate >= 2} />}
                {last.ventMode && last.ventMode !== "none" && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-800">
                    {VENT_LABEL[last.ventMode]}{last.fio2 != null ? ` · FiO₂ ${last.fio2}%` : ""}{last.peep != null ? ` · PEEP ${last.peep}` : ""}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {stay.status === "active" && (
              <>
                <button onClick={onAddObs} className="rounded-md bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-100">
                  + Chart
                </button>
                <button onClick={onClose} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200">
                  Close stay
                </button>
              </>
            )}
            {stay.status === "closed" && (
              <button onClick={onReopen} className="rounded-md bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100">
                Reopen
              </button>
            )}
            <button onClick={onEdit} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200">
              Edit
            </button>
            <button onClick={onDelete} className="rounded-md bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100">
              Delete
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 text-xs">
              <KV label="Source" value={stay.admissionSource} />
              <KV label="Bed" value={stay.bed} />
              <KV label="Admitted" value={fmtDateTime(stay.admittedAt)} />
              <KV label="Closed" value={stay.closedAt ? fmtDateTime(stay.closedAt) : "—"} />
            </div>

            {stay.notes && (
              <div>
                <div className="mb-1 text-xs font-semibold text-slate-500">Notes</div>
                <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700">{stay.notes}</div>
              </div>
            )}

            {stay.endNote && (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs">
                <span className="font-semibold text-slate-800">Discharge — {stay.endReason?.replace("_", " ")}</span>
                <div className="mt-0.5 text-slate-700">{stay.endNote}</div>
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-500">Observations ({observations.length})</div>
                <button onClick={onAddObs} className="rounded-md bg-primary-50 px-2 py-0.5 text-[11px] font-semibold text-primary-700 hover:bg-primary-100">
                  + Chart
                </button>
              </div>
              {observations.length === 0 ? (
                <div className="rounded-md bg-slate-50 px-3 py-4 text-center text-xs text-slate-400">No observations yet</div>
              ) : (
                <div className="space-y-1.5">
                  {observations.map((o) => (
                    <ObsRow key={o.id} obs={o} onEdit={() => onEditObs(o)} onDelete={() => onDeleteObs(o)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Vital({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <span className={`rounded px-1.5 py-0.5 font-mono ${bad ? "bg-rose-100 text-rose-800 font-semibold" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}>
      {label} {value}
    </span>
  );
}

function ObsRow({ obs, onEdit, onDelete }: { obs: ICUObservation; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-100 bg-slate-50/60 px-3 py-2 text-[11px]">
      <span className="font-mono text-slate-400">{obs.id}</span>
      <span className="font-semibold text-slate-700">{fmtDateTime(obs.recordedAt)}</span>
      {obs.nurse && <span className="text-slate-500">· {obs.nurse}</span>}
      {obs.heartRate != null && <span className="rounded bg-white px-1.5 py-0.5 font-mono ring-1 ring-slate-200">HR {obs.heartRate}</span>}
      {obs.bpSystolic != null && obs.bpDiastolic != null && <span className="rounded bg-white px-1.5 py-0.5 font-mono ring-1 ring-slate-200">BP {obs.bpSystolic}/{obs.bpDiastolic}</span>}
      {obs.map != null && <span className="rounded bg-white px-1.5 py-0.5 font-mono ring-1 ring-slate-200">MAP {obs.map}</span>}
      {obs.spo2 != null && <span className="rounded bg-white px-1.5 py-0.5 font-mono ring-1 ring-slate-200">SpO₂ {obs.spo2}</span>}
      {obs.gcs != null && <span className="rounded bg-white px-1.5 py-0.5 font-mono ring-1 ring-slate-200">GCS {obs.gcs}</span>}
      {obs.rass != null && <span className="rounded bg-white px-1.5 py-0.5 font-mono ring-1 ring-slate-200">RASS {obs.rass}</span>}
      {obs.ventMode && obs.ventMode !== "none" && (
        <span className="rounded bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-800">
          {VENT_LABEL[obs.ventMode]}{obs.fio2 != null ? ` / FiO₂ ${obs.fio2}%` : ""}
        </span>
      )}
      {obs.pressors && obs.pressors.length > 0 && (
        <span className="rounded bg-rose-50 px-1.5 py-0.5 font-semibold text-rose-800">
          {obs.pressors.map((p) => `${p.name} ${p.rate}`).join(", ")}
        </span>
      )}
      {obs.sedation && obs.sedation !== "none" && (
        <span className="rounded bg-purple-50 px-1.5 py-0.5 font-semibold text-purple-800">
          {SEDATION_LABEL[obs.sedation]}{obs.sedationRate ? ` ${obs.sedationRate}` : ""}
        </span>
      )}
      {obs.urineOutputMl != null && <span className="rounded bg-white px-1.5 py-0.5 font-mono ring-1 ring-slate-200">UO {obs.urineOutputMl}ml</span>}
      {obs.lactate != null && <span className={`rounded px-1.5 py-0.5 font-mono ${obs.lactate >= 2 ? "bg-rose-100 text-rose-800 font-semibold" : "bg-white ring-1 ring-slate-200"}`}>Lac {obs.lactate}</span>}
      <span className="flex-1" />
      <button onClick={onEdit} className="rounded bg-white px-2 py-0.5 font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">Edit</button>
      <button onClick={onDelete} className="rounded bg-rose-50 px-2 py-0.5 font-semibold text-rose-700 hover:bg-rose-100">Del</button>
    </div>
  );
}

// ============================================================
// Stay Form Modal
// ============================================================

function StayFormModal({
  stay, patients, onSave, onClose,
}: {
  stay: ICUStay | null;
  patients: Patient[];
  onSave: (form: Partial<ICUStay>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    patientId: stay?.patientId || "",
    patientName: stay?.patientName || "",
    intensivist: stay?.intensivist || "",
    bed: stay?.bed || "",
    admissionSource: (stay?.admissionSource || "ward") as AdmissionSource,
    reason: (stay?.reason || "sepsis") as ICUReason,
    diagnosis: stay?.diagnosis || "",
    admittedAt: stay?.admittedAt ? stay.admittedAt.slice(0, 16) : new Date().toISOString().slice(0, 16),
    sofaAdmission: stay?.sofaAdmission ?? ("" as number | ""),
    apacheIi: stay?.apacheIi ?? ("" as number | ""),
    notes: stay?.notes || "",
  });

  function pickPatient(id: string) {
    const p = patients.find((x) => x.id === id);
    setForm({
      ...form,
      patientId: id,
      patientName: p ? `${p.firstName} ${p.lastName}` : form.patientName,
    });
  }

  function submit() {
    if (!form.patientId || !form.diagnosis) return alert("Patient and diagnosis required");
    onSave({
      ...form,
      admittedAt: new Date(form.admittedAt).toISOString(),
      sofaAdmission: form.sofaAdmission === "" ? undefined : Number(form.sofaAdmission),
      apacheIi: form.apacheIi === "" ? undefined : Number(form.apacheIi),
      intensivist: form.intensivist.trim() || undefined,
      bed: form.bed.trim() || undefined,
      notes: form.notes.trim() || undefined,
    });
  }

  return (
    <Modal title={stay ? "Edit ICU stay" : "Admit to ICU"} onClose={onClose} wide>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Patient *">
            <select value={form.patientId} onChange={(e) => pickPatient(e.target.value)} className="inp">
              <option value="">Select patient…</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}{p.mrn ? ` (${p.mrn})` : ""}</option>)}
            </select>
          </Field>
          <Field label="Intensivist">
            <input value={form.intensivist} onChange={(e) => setForm({ ...form, intensivist: e.target.value })} className="inp" placeholder="Dr. …" />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Bed">
            <input value={form.bed} onChange={(e) => setForm({ ...form, bed: e.target.value })} className="inp" placeholder="ICU-3" />
          </Field>
          <Field label="Source">
            <select value={form.admissionSource} onChange={(e) => setForm({ ...form, admissionSource: e.target.value as AdmissionSource })} className="inp">
              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Admitted at">
            <input type="datetime-local" value={form.admittedAt} onChange={(e) => setForm({ ...form, admittedAt: e.target.value })} className="inp" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Primary reason *">
            <select value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value as ICUReason })} className="inp">
              {REASONS.map((r) => <option key={r} value={r}>{REASON_LABEL[r]}</option>)}
            </select>
          </Field>
          <Field label="Diagnosis *">
            <input value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} className="inp" placeholder="Septic shock, E. coli UTI" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="SOFA at admission (0-24)">
            <input type="number" min={0} max={24} value={form.sofaAdmission} onChange={(e) => setForm({ ...form, sofaAdmission: e.target.value === "" ? "" : Number(e.target.value) })} className="inp" />
          </Field>
          <Field label="APACHE II (0-71)">
            <input type="number" min={0} max={71} value={form.apacheIi} onChange={(e) => setForm({ ...form, apacheIi: e.target.value === "" ? "" : Number(e.target.value) })} className="inp" />
          </Field>
        </div>
        <Field label="Notes">
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="inp" rows={2} />
        </Field>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <button onClick={onClose} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">Cancel</button>
          <button onClick={submit} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">Save</button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================
// Observation Form Modal
// ============================================================

function ObsFormModal({
  stay, obs, onSave, onClose,
}: {
  stay: ICUStay;
  obs: ICUObservation | null;
  onSave: (form: Partial<ICUObservation>) => void;
  onClose: () => void;
}) {
  type N = number | "";
  const [form, setForm] = useState({
    recordedAt: obs?.recordedAt ? obs.recordedAt.slice(0, 16) : new Date().toISOString().slice(0, 16),
    nurse: obs?.nurse || "",
    heartRate: (obs?.heartRate ?? "") as N,
    bpSystolic: (obs?.bpSystolic ?? "") as N,
    bpDiastolic: (obs?.bpDiastolic ?? "") as N,
    map: (obs?.map ?? "") as N,
    temperature: (obs?.temperature ?? "") as N,
    respRate: (obs?.respRate ?? "") as N,
    spo2: (obs?.spo2 ?? "") as N,
    gcs: (obs?.gcs ?? "") as N,
    rass: (obs?.rass ?? "") as N,
    pupilLeft: obs?.pupilLeft || "",
    pupilRight: obs?.pupilRight || "",
    ventMode: (obs?.ventMode || "none") as VentMode,
    fio2: (obs?.fio2 ?? "") as N,
    peep: (obs?.peep ?? "") as N,
    tidalVolume: (obs?.tidalVolume ?? "") as N,
    ventRate: (obs?.ventRate ?? "") as N,
    pip: (obs?.pip ?? "") as N,
    sedation: (obs?.sedation || "none") as SedationAgent,
    sedationRate: obs?.sedationRate || "",
    urineOutputMl: (obs?.urineOutputMl ?? "") as N,
    drainOutputMl: (obs?.drainOutputMl ?? "") as N,
    ngOutputMl: (obs?.ngOutputMl ?? "") as N,
    fluidInMl: (obs?.fluidInMl ?? "") as N,
    lactate: (obs?.lactate ?? "") as N,
    glucose: (obs?.glucose ?? "") as N,
    sofaCurrent: (obs?.sofaCurrent ?? "") as N,
    notes: obs?.notes || "",
  });
  const [pressors, setPressors] = useState<Pressor[]>(obs?.pressors || []);

  function toNum(v: N): number | undefined {
    if (v === "" || !Number.isFinite(Number(v))) return undefined;
    return Number(v);
  }

  function addPressor() {
    setPressors([...pressors, { name: "noradrenaline", rate: "" }]);
  }
  function updPressor(i: number, patch: Partial<Pressor>) {
    setPressors(pressors.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }
  function rmPressor(i: number) {
    setPressors(pressors.filter((_, idx) => idx !== i));
  }

  // auto-compute MAP if left blank
  const autoMap = form.bpSystolic !== "" && form.bpDiastolic !== ""
    ? Math.round((Number(form.bpSystolic) + 2 * Number(form.bpDiastolic)) / 3)
    : null;

  function submit() {
    onSave({
      stayId: stay.id,
      recordedAt: new Date(form.recordedAt).toISOString(),
      nurse: form.nurse.trim() || undefined,
      heartRate: toNum(form.heartRate),
      bpSystolic: toNum(form.bpSystolic),
      bpDiastolic: toNum(form.bpDiastolic),
      map: toNum(form.map) ?? autoMap ?? undefined,
      temperature: toNum(form.temperature),
      respRate: toNum(form.respRate),
      spo2: toNum(form.spo2),
      gcs: toNum(form.gcs),
      rass: toNum(form.rass),
      pupilLeft: form.pupilLeft.trim() || undefined,
      pupilRight: form.pupilRight.trim() || undefined,
      ventMode: form.ventMode,
      fio2: toNum(form.fio2),
      peep: toNum(form.peep),
      tidalVolume: toNum(form.tidalVolume),
      ventRate: toNum(form.ventRate),
      pip: toNum(form.pip),
      pressors: pressors.filter((p) => p.name && p.rate),
      sedation: form.sedation,
      sedationRate: form.sedationRate.trim() || undefined,
      urineOutputMl: toNum(form.urineOutputMl),
      drainOutputMl: toNum(form.drainOutputMl),
      ngOutputMl: toNum(form.ngOutputMl),
      fluidInMl: toNum(form.fluidInMl),
      lactate: toNum(form.lactate),
      glucose: toNum(form.glucose),
      sofaCurrent: toNum(form.sofaCurrent),
      notes: form.notes.trim() || undefined,
    });
  }

  return (
    <Modal title={obs ? "Edit observation" : `Chart — ${stay.patientName}`} onClose={onClose} wide>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Recorded at">
            <input type="datetime-local" value={form.recordedAt} onChange={(e) => setForm({ ...form, recordedAt: e.target.value })} className="inp" />
          </Field>
          <Field label="Nurse">
            <input value={form.nurse} onChange={(e) => setForm({ ...form, nurse: e.target.value })} className="inp" />
          </Field>
        </div>

        {/* Vitals */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 text-xs font-semibold text-slate-700">Vitals</div>
          <div className="grid grid-cols-4 gap-2">
            <Field label="HR"><NumInp v={form.heartRate} onChange={(n) => setForm({ ...form, heartRate: n })} /></Field>
            <Field label="BP sys"><NumInp v={form.bpSystolic} onChange={(n) => setForm({ ...form, bpSystolic: n })} /></Field>
            <Field label="BP dia"><NumInp v={form.bpDiastolic} onChange={(n) => setForm({ ...form, bpDiastolic: n })} /></Field>
            <Field label={`MAP${autoMap ? ` (auto ${autoMap})` : ""}`}><NumInp v={form.map} onChange={(n) => setForm({ ...form, map: n })} /></Field>
            <Field label="Temp °C"><NumInp v={form.temperature} onChange={(n) => setForm({ ...form, temperature: n })} step="0.1" /></Field>
            <Field label="RR"><NumInp v={form.respRate} onChange={(n) => setForm({ ...form, respRate: n })} /></Field>
            <Field label="SpO₂ %"><NumInp v={form.spo2} onChange={(n) => setForm({ ...form, spo2: n })} /></Field>
            <Field label="Lactate"><NumInp v={form.lactate} onChange={(n) => setForm({ ...form, lactate: n })} step="0.1" /></Field>
          </div>
        </div>

        {/* Neuro */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 text-xs font-semibold text-slate-700">Neuro</div>
          <div className="grid grid-cols-4 gap-2">
            <Field label="GCS (3-15)"><NumInp v={form.gcs} onChange={(n) => setForm({ ...form, gcs: n })} /></Field>
            <Field label="RASS (-5 to +4)"><NumInp v={form.rass} onChange={(n) => setForm({ ...form, rass: n })} /></Field>
            <Field label="Pupil L"><input value={form.pupilLeft} onChange={(e) => setForm({ ...form, pupilLeft: e.target.value })} className="inp text-xs" placeholder="3mm brisk" /></Field>
            <Field label="Pupil R"><input value={form.pupilRight} onChange={(e) => setForm({ ...form, pupilRight: e.target.value })} className="inp text-xs" placeholder="3mm brisk" /></Field>
          </div>
        </div>

        {/* Ventilation */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 text-xs font-semibold text-slate-700">Ventilation</div>
          <div className="grid grid-cols-4 gap-2">
            <Field label="Mode">
              <select value={form.ventMode} onChange={(e) => setForm({ ...form, ventMode: e.target.value as VentMode })} className="inp text-xs">
                {VENT_MODES.map((m) => <option key={m} value={m}>{VENT_LABEL[m]}</option>)}
              </select>
            </Field>
            <Field label="FiO₂ %"><NumInp v={form.fio2} onChange={(n) => setForm({ ...form, fio2: n })} /></Field>
            <Field label="PEEP"><NumInp v={form.peep} onChange={(n) => setForm({ ...form, peep: n })} /></Field>
            <Field label="Vt (mL)"><NumInp v={form.tidalVolume} onChange={(n) => setForm({ ...form, tidalVolume: n })} /></Field>
            <Field label="Vent rate"><NumInp v={form.ventRate} onChange={(n) => setForm({ ...form, ventRate: n })} /></Field>
            <Field label="PIP"><NumInp v={form.pip} onChange={(n) => setForm({ ...form, pip: n })} /></Field>
          </div>
        </div>

        {/* Pressors */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-700">Vasopressors / inotropes</div>
            <button onClick={addPressor} className="rounded bg-white px-2 py-0.5 text-[11px] font-semibold text-primary-700 ring-1 ring-slate-200 hover:bg-primary-50">
              + Add
            </button>
          </div>
          {pressors.length === 0 ? (
            <div className="py-2 text-center text-[11px] text-slate-400">None running</div>
          ) : (
            <div className="space-y-1.5">
              {pressors.map((p, i) => (
                <div key={i} className="grid grid-cols-12 gap-1.5">
                  <input value={p.name} onChange={(e) => updPressor(i, { name: e.target.value })} placeholder="noradrenaline" className="inp col-span-5 text-xs" />
                  <input value={p.rate} onChange={(e) => updPressor(i, { rate: e.target.value })} placeholder="0.1 mcg/kg/min" className="inp col-span-6 text-xs" />
                  <button onClick={() => rmPressor(i)} className="col-span-1 rounded bg-rose-50 text-[11px] text-rose-700 hover:bg-rose-100">×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sedation */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sedation agent">
            <select value={form.sedation} onChange={(e) => setForm({ ...form, sedation: e.target.value as SedationAgent })} className="inp">
              {SEDATION_AGENTS.map((s) => <option key={s} value={s}>{SEDATION_LABEL[s]}</option>)}
            </select>
          </Field>
          <Field label="Sedation rate">
            <input value={form.sedationRate} onChange={(e) => setForm({ ...form, sedationRate: e.target.value })} className="inp" placeholder="50 mcg/kg/min" />
          </Field>
        </div>

        {/* I/O */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 text-xs font-semibold text-slate-700">Intake / Output (this interval)</div>
          <div className="grid grid-cols-4 gap-2">
            <Field label="Urine (mL)"><NumInp v={form.urineOutputMl} onChange={(n) => setForm({ ...form, urineOutputMl: n })} /></Field>
            <Field label="Drain (mL)"><NumInp v={form.drainOutputMl} onChange={(n) => setForm({ ...form, drainOutputMl: n })} /></Field>
            <Field label="NG (mL)"><NumInp v={form.ngOutputMl} onChange={(n) => setForm({ ...form, ngOutputMl: n })} /></Field>
            <Field label="Fluid in (mL)"><NumInp v={form.fluidInMl} onChange={(n) => setForm({ ...form, fluidInMl: n })} /></Field>
            <Field label="Glucose"><NumInp v={form.glucose} onChange={(n) => setForm({ ...form, glucose: n })} /></Field>
            <Field label="SOFA (live)"><NumInp v={form.sofaCurrent} onChange={(n) => setForm({ ...form, sofaCurrent: n })} /></Field>
          </div>
        </div>

        <Field label="Notes">
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="inp" rows={2} />
        </Field>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <button onClick={onClose} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">Cancel</button>
          <button onClick={submit} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">Save chart</button>
        </div>
      </div>
    </Modal>
  );
}

function NumInp({ v, onChange, step }: { v: number | ""; onChange: (n: number | "") => void; step?: string }) {
  return (
    <input
      type="number"
      step={step}
      value={v}
      onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
      className="inp text-xs"
    />
  );
}

// ============================================================
// Helpers
// ============================================================

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: "emerald" | "amber" | "rose" }) {
  const c = tone === "emerald" ? "text-emerald-700" : tone === "amber" ? "text-amber-700" : tone === "rose" ? "text-rose-700" : "text-slate-900";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-0.5 text-xl font-bold ${c}`}>{value}</div>
    </div>
  );
}

function FilterBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-2.5 py-1 text-xs font-semibold capitalize ${active ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
    >
      {label}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function KV({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-sm text-slate-800">{value || "—"}</div>
    </div>
  );
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl ${wide ? "max-w-3xl" : "max-w-lg"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
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

function Empty() {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <div className="text-sm font-semibold text-slate-700">No ICU stays</div>
      <div className="mt-1 text-xs text-slate-500">Admit a patient to ICU to start charting.</div>
    </div>
  );
}

function fmtDateTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
