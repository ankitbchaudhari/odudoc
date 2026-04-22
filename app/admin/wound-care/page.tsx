"use client";

import { useEffect, useState } from "react";
import type {
  WoundRecord,
  WoundAssessment,
  WoundStatus,
  WoundEtiology,
  WoundStage,
  WoundLocation,
  TissueType,
  ExudateAmount,
  ExudateType,
  PeriwoundCondition,
  InfectionSigns,
  WoundStats,
} from "@/lib/hospital/wound-store";
// Inlined from wound-store — importing runtime values pulls persistent-array → Postgres into the client bundle and crashes the page.
const ETIOLOGY_LABEL: Record<WoundEtiology, string> = {
  pressure: "Pressure injury",
  diabetic: "Diabetic foot",
  venous: "Venous ulcer",
  arterial: "Arterial ulcer",
  surgical: "Surgical wound",
  traumatic: "Traumatic",
  burn: "Burn",
  skin_tear: "Skin tear",
  malignant: "Malignant",
  other: "Other",
};
const STAGE_LABEL: Record<WoundStage, string> = {
  stage_1: "Stage 1",
  stage_2: "Stage 2",
  stage_3: "Stage 3",
  stage_4: "Stage 4",
  unstageable: "Unstageable",
  dti: "DTI",
  superficial: "Superficial",
  partial: "Partial thickness",
  full_thickness: "Full thickness",
  na: "N/A",
};
const LOCATION_LABEL: Record<WoundLocation, string> = {
  sacrum: "Sacrum",
  coccyx: "Coccyx",
  heel_left: "L heel",
  heel_right: "R heel",
  ischium_left: "L ischium",
  ischium_right: "R ischium",
  trochanter_left: "L trochanter",
  trochanter_right: "R trochanter",
  occiput: "Occiput",
  elbow_left: "L elbow",
  elbow_right: "R elbow",
  ankle_left: "L ankle",
  ankle_right: "R ankle",
  foot_left: "L foot",
  foot_right: "R foot",
  leg_left: "L leg",
  leg_right: "R leg",
  abdomen: "Abdomen",
  chest: "Chest",
  back: "Back",
  arm_left: "L arm",
  arm_right: "R arm",
  other: "Other",
};
const TISSUE_LABEL: Record<TissueType, string> = {
  epithelial: "Epithelial",
  granulation: "Granulation",
  slough: "Slough",
  eschar: "Eschar",
  muscle: "Muscle",
  tendon: "Tendon",
  bone: "Bone",
};
function assessmentArea(a: WoundAssessment): number | null {
  if (a.lengthCm == null || a.widthCm == null) return null;
  return Math.round(a.lengthCm * a.widthCm * 100) / 100;
}
function woundTrajectory(wound: WoundRecord, assessments: WoundAssessment[]): {
  firstArea: number | null;
  latestArea: number | null;
  deltaPct: number | null;       // + = growing (bad), − = shrinking (healing)
  daysSinceNoted: number;
  assessmentCount: number;
  infected: boolean;
  lastAssessedAt?: string;
} {
  const mine = assessments
    .filter((a) => a.woundId === wound.id && a.organizationId === wound.organizationId)
    .sort((a, b) => (a.assessedAt || "").localeCompare(b.assessedAt || ""));
  const first = mine[0];
  const last = mine[mine.length - 1];
  const firstArea = first ? assessmentArea(first) : null;
  const latestArea = last ? assessmentArea(last) : null;
  let deltaPct: number | null = null;
  if (firstArea != null && latestArea != null && firstArea > 0) {
    deltaPct = Math.round(((latestArea - firstArea) / firstArea) * 100);
  }
  const daysSinceNoted = Math.max(
    0,
    Math.round((Date.now() - new Date(wound.firstNotedAt).getTime()) / 86_400_000)
  );
  const infected = !!last && (last.infection === "local" || last.infection === "systemic");
  return {
    firstArea,
    latestArea,
    deltaPct,
    daysSinceNoted,
    assessmentCount: mine.length,
    infected,
    lastAssessedAt: last?.assessedAt,
  };
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  mrn?: string;
}

const STATUSES: WoundStatus[] = ["open", "healed", "deteriorated", "closed_other"];
const ETIOLOGIES: WoundEtiology[] = [
  "pressure", "diabetic", "venous", "arterial", "surgical",
  "traumatic", "burn", "skin_tear", "malignant", "other",
];
const STAGES: WoundStage[] = [
  "stage_1", "stage_2", "stage_3", "stage_4", "unstageable", "dti",
  "superficial", "partial", "full_thickness", "na",
];
const LOCATIONS: WoundLocation[] = [
  "sacrum", "coccyx", "heel_left", "heel_right", "ischium_left", "ischium_right",
  "trochanter_left", "trochanter_right", "occiput", "elbow_left", "elbow_right",
  "ankle_left", "ankle_right", "foot_left", "foot_right", "leg_left", "leg_right",
  "abdomen", "chest", "back", "arm_left", "arm_right", "other",
];
const TISSUES: TissueType[] = ["epithelial", "granulation", "slough", "eschar", "muscle", "tendon", "bone"];
const EXUDATE_AMOUNTS: ExudateAmount[] = ["none", "scant", "small", "moderate", "large", "copious"];
const EXUDATE_TYPES: ExudateType[] = ["none", "serous", "serosanguinous", "sanguinous", "purulent"];
const PERIWOUND_OPTIONS: PeriwoundCondition[] = ["intact", "erythema", "macerated", "dry", "fragile", "indurated"];
const INFECTION_OPTIONS: InfectionSigns[] = ["none", "suspected", "local", "systemic"];

const STATUS_COLOR: Record<WoundStatus, string> = {
  open: "bg-amber-100 text-amber-700",
  healed: "bg-emerald-100 text-emerald-700",
  deteriorated: "bg-rose-100 text-rose-700",
  closed_other: "bg-slate-100 text-slate-700",
};

const INFECTION_COLOR: Record<InfectionSigns, string> = {
  none: "bg-slate-100 text-slate-600",
  suspected: "bg-amber-100 text-amber-700",
  local: "bg-orange-100 text-orange-700",
  systemic: "bg-rose-100 text-rose-700",
};

export default function WoundCarePage() {
  const [wounds, setWounds] = useState<WoundRecord[]>([]);
  const [asByWound, setAsByWound] = useState<Record<string, WoundAssessment[]>>({});
  const [patients, setPatients] = useState<Patient[]>([]);
  const [stats, setStats] = useState<WoundStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState<WoundStatus | "">("open");
  const [filterEtiology, setFilterEtiology] = useState<WoundEtiology | "">("");
  const [showWoundForm, setShowWoundForm] = useState(false);
  const [editWound, setEditWound] = useState<WoundRecord | null>(null);
  const [addAssessFor, setAddAssessFor] = useState<WoundRecord | null>(null);
  const [editAssess, setEditAssess] = useState<{ wound: WoundRecord; assess: WoundAssessment } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const p = new URLSearchParams();
    if (filterStatus) p.set("status", filterStatus);
    if (filterEtiology) p.set("etiology", filterEtiology);
    const [wRes, patRes] = await Promise.all([
      fetch(`/api/hospital/wound-care?${p.toString()}`, { cache: "no-store" }),
      fetch("/api/patients", { cache: "no-store" }),
    ]);
    if (wRes.ok) {
      const d = await wRes.json();
      const list: WoundRecord[] = d.wounds || [];
      setWounds(list);
      setStats(d.stats || null);
      const byW: Record<string, WoundAssessment[]> = {};
      await Promise.all(
        list.map(async (w) => {
          const r = await fetch(`/api/hospital/wound-care/assessments?woundId=${w.id}`, { cache: "no-store" });
          if (r.ok) {
            const sd = await r.json();
            byW[w.id] = sd.assessments || [];
          }
        })
      );
      setAsByWound(byW);
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
  }, [filterStatus, filterEtiology]);

  async function saveWound(form: Partial<WoundRecord>) {
    const method = editWound ? "PATCH" : "POST";
    const body = editWound ? { id: editWound.id, ...form } : form;
    const res = await fetch("/api/hospital/wound-care", {
      method, headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setShowWoundForm(false);
      setEditWound(null);
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Failed to save");
    }
  }

  async function closeWound(w: WoundRecord, status: WoundStatus) {
    const reason = status === "healed" ? undefined : prompt("Close reason:") || undefined;
    const res = await fetch("/api/hospital/wound-care", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: w.id, status, closeReason: reason }),
    });
    if (res.ok) load();
  }

  async function reopenWound(w: WoundRecord) {
    const res = await fetch("/api/hospital/wound-care", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: w.id, status: "open" }),
    });
    if (res.ok) load();
  }

  async function deleteWound(w: WoundRecord) {
    if (!confirm(`Delete wound ${w.id}? All assessments will be removed.`)) return;
    const res = await fetch("/api/hospital/wound-care", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: w.id }),
    });
    if (res.ok) load();
  }

  async function saveAssess(form: Partial<WoundAssessment>) {
    const isEdit = !!editAssess;
    const method = isEdit ? "PATCH" : "POST";
    const body = isEdit ? { id: editAssess!.assess.id, ...form } : form;
    const res = await fetch("/api/hospital/wound-care/assessments", {
      method, headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setAddAssessFor(null);
      setEditAssess(null);
      load();
    }
  }

  async function deleteAssess(a: WoundAssessment) {
    if (!confirm(`Delete assessment ${a.id}?`)) return;
    const res = await fetch("/api/hospital/wound-care/assessments", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: a.id }),
    });
    if (res.ok) load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Wound Care</h1>
          <p className="text-sm text-slate-500">
            Pressure injuries, diabetic / vascular ulcers, surgical wounds — serial assessments & healing trajectory.
          </p>
        </div>
        <button
          onClick={() => { setEditWound(null); setShowWoundForm(true); }}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
        >
          + New wound
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-9">
          <Stat label="Open wounds" value={stats.openWounds} />
          <Stat label="Pressure" value={stats.pressureInjuries} tone="amber" />
          <Stat label="Stage 3/4/Unst" value={stats.stageIiiIvActive} tone="rose" />
          <Stat label="Infected active" value={stats.infectedActive} tone="rose" />
          <Stat label="Assessments today" value={stats.assessmentsToday} />
          <Stat label="Assessments (mo)" value={stats.assessmentsMonth} />
          <Stat label="Overdue >7d" value={stats.overdueReassessment} tone="amber" />
          <Stat label="Healed (mo)" value={stats.healedMonth} tone="emerald" />
          <Stat label="Avg heal (d)" value={stats.avgTimeToHealDays} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</span>
        <FilterBtn active={filterStatus === ""} onClick={() => setFilterStatus("")} label="All" />
        {STATUSES.map((s) => <FilterBtn key={s} active={filterStatus === s} onClick={() => setFilterStatus(s)} label={s.replace("_", " ")} />)}
        <div className="mx-2 h-6 w-px bg-slate-200" />
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Etiology</span>
        <select value={filterEtiology} onChange={(e) => setFilterEtiology(e.target.value as WoundEtiology | "")} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs">
          <option value="">All</option>
          {ETIOLOGIES.map((e) => <option key={e} value={e}>{ETIOLOGY_LABEL[e]}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">Loading…</div>
      ) : wounds.length === 0 ? (
        <Empty />
      ) : (
        <div className="space-y-3">
          {wounds.map((w) => (
            <WoundCard
              key={w.id}
              wound={w}
              assessments={asByWound[w.id] || []}
              expanded={expanded === w.id}
              onToggle={() => setExpanded(expanded === w.id ? null : w.id)}
              onEdit={() => { setEditWound(w); setShowWoundForm(true); }}
              onDelete={() => deleteWound(w)}
              onAddAssess={() => setAddAssessFor(w)}
              onEditAssess={(assess) => setEditAssess({ wound: w, assess })}
              onDeleteAssess={deleteAssess}
              onHeal={() => closeWound(w, "healed")}
              onDeteriorate={() => closeWound(w, "deteriorated")}
              onCloseOther={() => closeWound(w, "closed_other")}
              onReopen={() => reopenWound(w)}
            />
          ))}
        </div>
      )}

      {showWoundForm && (
        <WoundFormModal
          wound={editWound}
          patients={patients}
          onSave={saveWound}
          onClose={() => { setShowWoundForm(false); setEditWound(null); }}
        />
      )}
      {addAssessFor && (
        <AssessFormModal
          wound={addAssessFor}
          assess={null}
          previous={(asByWound[addAssessFor.id] || [])[0] || null}
          onSave={saveAssess}
          onClose={() => setAddAssessFor(null)}
        />
      )}
      {editAssess && (
        <AssessFormModal
          wound={editAssess.wound}
          assess={editAssess.assess}
          previous={null}
          onSave={saveAssess}
          onClose={() => setEditAssess(null)}
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
// Wound Card
// ============================================================

function WoundCard({
  wound, assessments, expanded, onToggle,
  onEdit, onDelete, onAddAssess, onEditAssess, onDeleteAssess,
  onHeal, onDeteriorate, onCloseOther, onReopen,
}: {
  wound: WoundRecord;
  assessments: WoundAssessment[];
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddAssess: () => void;
  onEditAssess: (a: WoundAssessment) => void;
  onDeleteAssess: (a: WoundAssessment) => void;
  onHeal: () => void;
  onDeteriorate: () => void;
  onCloseOther: () => void;
  onReopen: () => void;
}) {
  const traj = woundTrajectory(wound, assessments);
  const overdue =
    wound.status === "open" &&
    (!traj.lastAssessedAt ||
      new Date(traj.lastAssessedAt).getTime() < Date.now() - 7 * 86_400_000);

  const deltaColor =
    traj.deltaPct == null ? "text-slate-500" :
    traj.deltaPct < -10 ? "text-emerald-700" :
    traj.deltaPct > 10 ? "text-rose-700" : "text-slate-700";

  return (
    <div className={`rounded-xl border bg-white shadow-sm ${overdue ? "border-amber-300 ring-1 ring-amber-200" : traj.infected ? "border-rose-300 ring-1 ring-rose-200" : "border-slate-200"}`}>
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={onToggle} className="font-mono text-sm font-semibold text-primary-700 hover:underline">
                {wound.id}
              </button>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[wound.status]}`}>
                {wound.status.replace("_", " ")}
              </span>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                {ETIOLOGY_LABEL[wound.etiology]}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                {LOCATION_LABEL[wound.location]}
              </span>
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-700">
                {STAGE_LABEL[wound.stage]}
              </span>
              {wound.presentOnAdmission && (
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700">POA</span>
              )}
              {traj.infected && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800">⚠ Infected</span>
              )}
              {overdue && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">Overdue reassess</span>
              )}
            </div>
            <div className="mt-1.5 text-[15px] font-semibold text-slate-900">{wound.patientName}</div>
            <div className="text-xs text-slate-600">
              Noted {fmtDate(wound.firstNotedAt)} · {traj.daysSinceNoted}d ago
              {wound.primaryCareTeam ? ` · ${wound.primaryCareTeam}` : ""}
              {wound.locationNote ? ` · ${wound.locationNote}` : ""}
            </div>

            {/* Trajectory */}
            {traj.assessmentCount > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="font-semibold text-slate-500 uppercase text-[10px]">Trajectory:</span>
                {traj.firstArea != null && (
                  <span className="rounded bg-slate-50 px-2 py-0.5 font-mono">start {traj.firstArea} cm²</span>
                )}
                {traj.latestArea != null && (
                  <span className="rounded bg-slate-50 px-2 py-0.5 font-mono">now {traj.latestArea} cm²</span>
                )}
                {traj.deltaPct != null && (
                  <span className={`rounded px-2 py-0.5 font-mono font-semibold ${deltaColor}`}>
                    {traj.deltaPct > 0 ? "▲" : traj.deltaPct < 0 ? "▼" : "="} {Math.abs(traj.deltaPct)}%
                  </span>
                )}
                <span className="text-slate-500">
                  {traj.assessmentCount} assessment{traj.assessmentCount > 1 ? "s" : ""}
                </span>
                {traj.lastAssessedAt && (
                  <span className="text-slate-500">· last {fmtDate(traj.lastAssessedAt)}</span>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {wound.status === "open" && (
              <>
                <button onClick={onAddAssess} className="rounded-md bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-100">
                  + Assess
                </button>
                <button onClick={onHeal} className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
                  Healed
                </button>
                <button onClick={onDeteriorate} className="rounded-md bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100">
                  Deteriorated
                </button>
                <button onClick={onCloseOther} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200">
                  Close
                </button>
              </>
            )}
            {wound.status !== "open" && (
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
              <KV label="First noted" value={fmtDate(wound.firstNotedAt)} />
              <KV label="POA" value={wound.presentOnAdmission ? "Yes" : "No"} />
              <KV label="Care team" value={wound.primaryCareTeam} />
              <KV label="Closed" value={wound.closedAt ? fmtDate(wound.closedAt) : "—"} />
            </div>

            {wound.cliniciansNote && (
              <div>
                <div className="mb-1 text-xs font-semibold text-slate-500">Clinician note</div>
                <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700">{wound.cliniciansNote}</div>
              </div>
            )}

            {wound.closeReason && (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs">
                <span className="font-semibold text-slate-800">Closed — {wound.status.replace("_", " ")}</span>
                <div className="mt-0.5 text-slate-700">{wound.closeReason}</div>
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-500">Assessments ({assessments.length})</div>
                <button onClick={onAddAssess} className="rounded-md bg-primary-50 px-2 py-0.5 text-[11px] font-semibold text-primary-700 hover:bg-primary-100">
                  + Add
                </button>
              </div>
              {assessments.length === 0 ? (
                <div className="rounded-md bg-slate-50 px-3 py-4 text-center text-xs text-slate-400">No assessments yet</div>
              ) : (
                <div className="space-y-1.5">
                  {assessments.map((a) => (
                    <AssessRow
                      key={a.id}
                      assess={a}
                      onEdit={() => onEditAssess(a)}
                      onDelete={() => onDeleteAssess(a)}
                    />
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

function AssessRow({ assess, onEdit, onDelete }: { assess: WoundAssessment; onEdit: () => void; onDelete: () => void }) {
  const area = assessmentArea(assess);
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-100 bg-slate-50/60 px-3 py-2 text-[11px]">
      <span className="font-mono text-slate-400">{assess.id}</span>
      <span className="font-semibold text-slate-700">{fmtDate(assess.assessedAt)}</span>
      {assess.assessor && <span className="text-slate-500">· {assess.assessor}</span>}
      {assess.lengthCm != null && assess.widthCm != null && (
        <span className="rounded bg-white px-1.5 py-0.5 font-mono ring-1 ring-slate-200">
          {assess.lengthCm}×{assess.widthCm}{assess.depthCm != null ? `×${assess.depthCm}` : ""} cm
        </span>
      )}
      {area != null && (
        <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-mono font-semibold text-indigo-700">
          {area} cm²
        </span>
      )}
      {assess.currentStage && (
        <span className="rounded bg-purple-50 px-1.5 py-0.5 font-semibold text-purple-700">
          {STAGE_LABEL[assess.currentStage]}
        </span>
      )}
      {(assess.tissueTypes || []).slice(0, 3).map((t) => (
        <span key={t} className="rounded bg-white px-1.5 py-0.5 text-slate-600 ring-1 ring-slate-200">{TISSUE_LABEL[t]}</span>
      ))}
      {assess.exudateAmount !== "none" && (
        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-800">
          {assess.exudateAmount} {assess.exudateType}
        </span>
      )}
      {assess.odor && <span className="rounded bg-rose-50 px-1.5 py-0.5 font-semibold text-rose-700">odor</span>}
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${INFECTION_COLOR[assess.infection]}`}>
        {assess.infection === "none" ? "no infection" : assess.infection}
      </span>
      {assess.painScore != null && (
        <span className="rounded bg-white px-1.5 py-0.5 font-mono ring-1 ring-slate-200">pain {assess.painScore}/10</span>
      )}
      {assess.primaryDressing && (
        <span className="rounded bg-sky-50 px-1.5 py-0.5 text-sky-800">{assess.primaryDressing}</span>
      )}
      <span className="flex-1" />
      <button onClick={onEdit} className="rounded bg-white px-2 py-0.5 font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">Edit</button>
      <button onClick={onDelete} className="rounded bg-rose-50 px-2 py-0.5 font-semibold text-rose-700 hover:bg-rose-100">Del</button>
    </div>
  );
}

// ============================================================
// Wound Form Modal
// ============================================================

function WoundFormModal({
  wound, patients, onSave, onClose,
}: {
  wound: WoundRecord | null;
  patients: Patient[];
  onSave: (form: Partial<WoundRecord>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    patientId: wound?.patientId || "",
    patientName: wound?.patientName || "",
    location: (wound?.location || "sacrum") as WoundLocation,
    locationNote: wound?.locationNote || "",
    etiology: (wound?.etiology || "pressure") as WoundEtiology,
    stage: (wound?.stage || "stage_2") as WoundStage,
    firstNotedAt: wound?.firstNotedAt ? wound.firstNotedAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
    presentOnAdmission: wound?.presentOnAdmission ?? false,
    primaryCareTeam: wound?.primaryCareTeam || "",
    cliniciansNote: wound?.cliniciansNote || "",
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
    if (!form.patientId) return alert("Select patient");
    onSave({
      ...form,
      firstNotedAt: new Date(form.firstNotedAt).toISOString(),
      locationNote: form.locationNote.trim() || undefined,
      primaryCareTeam: form.primaryCareTeam.trim() || undefined,
      cliniciansNote: form.cliniciansNote.trim() || undefined,
    });
  }

  return (
    <Modal title={wound ? "Edit wound" : "Register new wound"} onClose={onClose} wide>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Patient *">
            <select value={form.patientId} onChange={(e) => pickPatient(e.target.value)} className="inp">
              <option value="">Select patient…</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}{p.mrn ? ` (${p.mrn})` : ""}</option>)}
            </select>
          </Field>
          <Field label="First noted">
            <input type="date" value={form.firstNotedAt} onChange={(e) => setForm({ ...form, firstNotedAt: e.target.value })} className="inp" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Etiology *">
            <select value={form.etiology} onChange={(e) => setForm({ ...form, etiology: e.target.value as WoundEtiology })} className="inp">
              {ETIOLOGIES.map((e) => <option key={e} value={e}>{ETIOLOGY_LABEL[e]}</option>)}
            </select>
          </Field>
          <Field label="Stage">
            <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value as WoundStage })} className="inp">
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Location *">
            <select value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value as WoundLocation })} className="inp">
              {LOCATIONS.map((l) => <option key={l} value={l}>{LOCATION_LABEL[l]}</option>)}
            </select>
          </Field>
          <Field label="Location note">
            <input value={form.locationNote} onChange={(e) => setForm({ ...form, locationNote: e.target.value })} className="inp" placeholder="5cm lateral to midline" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Care team">
            <input value={form.primaryCareTeam} onChange={(e) => setForm({ ...form, primaryCareTeam: e.target.value })} className="inp" placeholder="Wound care nurse" />
          </Field>
          <Field label="Present on admission">
            <select value={form.presentOnAdmission ? "yes" : "no"} onChange={(e) => setForm({ ...form, presentOnAdmission: e.target.value === "yes" })} className="inp">
              <option value="no">No — hospital acquired</option>
              <option value="yes">Yes — POA</option>
            </select>
          </Field>
        </div>
        <Field label="Clinician note">
          <textarea value={form.cliniciansNote} onChange={(e) => setForm({ ...form, cliniciansNote: e.target.value })} className="inp" rows={3} />
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
// Assessment Form Modal
// ============================================================

function AssessFormModal({
  wound, assess, previous, onSave, onClose,
}: {
  wound: WoundRecord;
  assess: WoundAssessment | null;
  previous: WoundAssessment | null;
  onSave: (form: Partial<WoundAssessment>) => void;
  onClose: () => void;
}) {
  type N = number | "";
  // Carry forward from last assessment so serial charting is fast
  const src = assess || previous;
  const [form, setForm] = useState({
    assessedAt: assess?.assessedAt ? assess.assessedAt.slice(0, 16) : new Date().toISOString().slice(0, 16),
    assessor: assess?.assessor || "",
    lengthCm: (src?.lengthCm ?? "") as N,
    widthCm: (src?.widthCm ?? "") as N,
    depthCm: (src?.depthCm ?? "") as N,
    undermining: src?.undermining || "",
    tunneling: src?.tunneling || "",
    granulationPct: (src?.granulationPct ?? "") as N,
    sloughPct: (src?.sloughPct ?? "") as N,
    escharPct: (src?.escharPct ?? "") as N,
    exudateAmount: (src?.exudateAmount || "small") as ExudateAmount,
    exudateType: (src?.exudateType || "serous") as ExudateType,
    odor: src?.odor ?? false,
    periwound: (src?.periwound || "intact") as PeriwoundCondition,
    infection: (src?.infection || "none") as InfectionSigns,
    painScore: (src?.painScore ?? "") as N,
    cleansed: src?.cleansed || "Normal saline",
    debridement: src?.debridement || "none",
    primaryDressing: src?.primaryDressing || "",
    secondaryDressing: src?.secondaryDressing || "",
    dressingChangeFrequency: src?.dressingChangeFrequency || "daily",
    currentStage: (src?.currentStage || wound.stage) as WoundStage,
    notes: assess?.notes || "",
  });
  const [tissues, setTissues] = useState<TissueType[]>(assess?.tissueTypes || src?.tissueTypes || ["granulation"]);

  function toggleTissue(t: TissueType) {
    setTissues(tissues.includes(t) ? tissues.filter((x) => x !== t) : [...tissues, t]);
  }

  function toNum(v: N): number | undefined {
    if (v === "" || !Number.isFinite(Number(v))) return undefined;
    return Number(v);
  }

  const area = form.lengthCm !== "" && form.widthCm !== ""
    ? Math.round(Number(form.lengthCm) * Number(form.widthCm) * 100) / 100
    : null;
  const prevArea = previous && !assess ? assessmentArea(previous) : null;
  const deltaPct = area != null && prevArea != null && prevArea > 0
    ? Math.round(((area - prevArea) / prevArea) * 100)
    : null;

  function submit() {
    onSave({
      woundId: wound.id,
      assessedAt: new Date(form.assessedAt).toISOString(),
      assessor: form.assessor.trim() || undefined,
      lengthCm: toNum(form.lengthCm),
      widthCm: toNum(form.widthCm),
      depthCm: toNum(form.depthCm),
      undermining: form.undermining.trim() || undefined,
      tunneling: form.tunneling.trim() || undefined,
      tissueTypes: tissues,
      granulationPct: toNum(form.granulationPct),
      sloughPct: toNum(form.sloughPct),
      escharPct: toNum(form.escharPct),
      exudateAmount: form.exudateAmount,
      exudateType: form.exudateType,
      odor: form.odor,
      periwound: form.periwound,
      infection: form.infection,
      painScore: toNum(form.painScore),
      cleansed: form.cleansed.trim() || undefined,
      debridement: form.debridement.trim() || undefined,
      primaryDressing: form.primaryDressing.trim() || undefined,
      secondaryDressing: form.secondaryDressing.trim() || undefined,
      dressingChangeFrequency: form.dressingChangeFrequency.trim() || undefined,
      currentStage: form.currentStage,
      notes: form.notes.trim() || undefined,
    });
  }

  return (
    <Modal title={assess ? "Edit assessment" : `Assess — ${LOCATION_LABEL[wound.location]} (${wound.patientName})`} onClose={onClose} wide>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Assessed at">
            <input type="datetime-local" value={form.assessedAt} onChange={(e) => setForm({ ...form, assessedAt: e.target.value })} className="inp" />
          </Field>
          <Field label="Assessor">
            <input value={form.assessor} onChange={(e) => setForm({ ...form, assessor: e.target.value })} className="inp" />
          </Field>
        </div>

        {/* Dimensions */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 text-xs font-semibold text-slate-700">Dimensions (cm)</div>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Length">
              <input type="number" step="0.1" value={form.lengthCm} onChange={(e) => setForm({ ...form, lengthCm: e.target.value === "" ? "" : Number(e.target.value) })} className="inp" />
            </Field>
            <Field label="Width">
              <input type="number" step="0.1" value={form.widthCm} onChange={(e) => setForm({ ...form, widthCm: e.target.value === "" ? "" : Number(e.target.value) })} className="inp" />
            </Field>
            <Field label="Depth">
              <input type="number" step="0.1" value={form.depthCm} onChange={(e) => setForm({ ...form, depthCm: e.target.value === "" ? "" : Number(e.target.value) })} className="inp" />
            </Field>
            <Field label="Undermining">
              <input value={form.undermining} onChange={(e) => setForm({ ...form, undermining: e.target.value })} className="inp" placeholder="2cm @ 3 o'clock" />
            </Field>
            <Field label="Tunneling">
              <input value={form.tunneling} onChange={(e) => setForm({ ...form, tunneling: e.target.value })} className="inp" placeholder="1cm @ 12 o'clock" />
            </Field>
            <Field label="Current stage">
              <select value={form.currentStage} onChange={(e) => setForm({ ...form, currentStage: e.target.value as WoundStage })} className="inp">
                {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
              </select>
            </Field>
          </div>
          {area != null && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-slate-600">Area:</span>
              <span className="rounded bg-indigo-100 px-2 py-0.5 font-mono font-semibold text-indigo-800">{area} cm²</span>
              {deltaPct != null && (
                <span className={`rounded px-2 py-0.5 font-mono font-semibold ${deltaPct < -10 ? "bg-emerald-100 text-emerald-800" : deltaPct > 10 ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-700"}`}>
                  {deltaPct > 0 ? "▲" : deltaPct < 0 ? "▼" : "="} {Math.abs(deltaPct)}% vs last
                </span>
              )}
            </div>
          )}
        </div>

        {/* Wound bed */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 text-xs font-semibold text-slate-700">Wound bed</div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {TISSUES.map((t) => (
              <button
                key={t}
                onClick={() => toggleTissue(t)}
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  tissues.includes(t) ? "bg-indigo-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                }`}
              >
                {TISSUE_LABEL[t]}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Granulation %">
              <input type="number" min={0} max={100} value={form.granulationPct} onChange={(e) => setForm({ ...form, granulationPct: e.target.value === "" ? "" : Number(e.target.value) })} className="inp" />
            </Field>
            <Field label="Slough %">
              <input type="number" min={0} max={100} value={form.sloughPct} onChange={(e) => setForm({ ...form, sloughPct: e.target.value === "" ? "" : Number(e.target.value) })} className="inp" />
            </Field>
            <Field label="Eschar %">
              <input type="number" min={0} max={100} value={form.escharPct} onChange={(e) => setForm({ ...form, escharPct: e.target.value === "" ? "" : Number(e.target.value) })} className="inp" />
            </Field>
          </div>
        </div>

        {/* Exudate / peri / infection / pain */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Exudate amount">
            <select value={form.exudateAmount} onChange={(e) => setForm({ ...form, exudateAmount: e.target.value as ExudateAmount })} className="inp">
              {EXUDATE_AMOUNTS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </Field>
          <Field label="Exudate type">
            <select value={form.exudateType} onChange={(e) => setForm({ ...form, exudateType: e.target.value as ExudateType })} className="inp">
              {EXUDATE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Peri-wound">
            <select value={form.periwound} onChange={(e) => setForm({ ...form, periwound: e.target.value as PeriwoundCondition })} className="inp">
              {PERIWOUND_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Infection">
            <select value={form.infection} onChange={(e) => setForm({ ...form, infection: e.target.value as InfectionSigns })} className="inp">
              {INFECTION_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </Field>
          <Field label="Pain (0-10)">
            <input type="number" min={0} max={10} value={form.painScore} onChange={(e) => setForm({ ...form, painScore: e.target.value === "" ? "" : Number(e.target.value) })} className="inp" />
          </Field>
          <Field label="Odor">
            <select value={form.odor ? "yes" : "no"} onChange={(e) => setForm({ ...form, odor: e.target.value === "yes" })} className="inp">
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </Field>
        </div>

        {/* Treatment */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 text-xs font-semibold text-slate-700">Treatment this visit</div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Cleansed with">
              <input value={form.cleansed} onChange={(e) => setForm({ ...form, cleansed: e.target.value })} className="inp" />
            </Field>
            <Field label="Debridement">
              <input value={form.debridement} onChange={(e) => setForm({ ...form, debridement: e.target.value })} className="inp" placeholder="none / sharp / autolytic / enzymatic" />
            </Field>
            <Field label="Primary dressing">
              <input value={form.primaryDressing} onChange={(e) => setForm({ ...form, primaryDressing: e.target.value })} className="inp" placeholder="Foam / alginate / hydrocolloid" />
            </Field>
            <Field label="Secondary dressing">
              <input value={form.secondaryDressing} onChange={(e) => setForm({ ...form, secondaryDressing: e.target.value })} className="inp" />
            </Field>
            <Field label="Change frequency">
              <input value={form.dressingChangeFrequency} onChange={(e) => setForm({ ...form, dressingChangeFrequency: e.target.value })} className="inp" placeholder="daily / q2d" />
            </Field>
          </div>
        </div>

        <Field label="Notes">
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="inp" rows={2} />
        </Field>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <button onClick={onClose} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">Cancel</button>
          <button onClick={submit} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">Save assessment</button>
        </div>
      </div>
    </Modal>
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
      <div className="text-sm font-semibold text-slate-700">No wounds registered</div>
      <div className="mt-1 text-xs text-slate-500">Register a wound to start serial assessments.</div>
    </div>
  );
}

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}
