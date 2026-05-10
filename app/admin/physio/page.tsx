"use client";

import { useEffect, useState } from "react";
import { PageHero, StatGrid, StatCard } from "@/components/admin/PageShell";
import type {
  PhysioPlan,
  PhysioSession,
  PlanStatus,
  SessionStatus,
  BodyRegion,
  TherapyModality,
  PhysioStats,
} from "@/lib/hospital/physio-store";
// Inlined from physio-store — importing runtime values pulls persistent-array → Postgres into the client bundle and crashes the page.
const MODALITY_LABEL: Record<TherapyModality, string> = {
  manual: "Manual therapy",
  exercise: "Therapeutic exercise",
  electrotherapy: "Electrotherapy / TENS",
  ultrasound: "Ultrasound",
  traction: "Traction",
  hydrotherapy: "Hydrotherapy",
  cryo: "Cryotherapy",
  heat: "Heat therapy",
  taping: "Taping / strapping",
  gait_training: "Gait training",
  respiratory: "Respiratory / chest physio",
  neurodev: "Neuro-developmental",
  other: "Other",
};
const REGION_LABEL: Record<BodyRegion, string> = {
  neck: "Neck / cervical",
  shoulder: "Shoulder",
  upper_back: "Upper back / thoracic",
  lower_back: "Lower back / lumbar",
  hip: "Hip",
  knee: "Knee",
  ankle: "Ankle / foot",
  wrist: "Wrist / hand",
  elbow: "Elbow",
  whole_body: "Whole body / multi-site",
  neuro: "Neurological",
  cardio_resp: "Cardio-respiratory",
  other: "Other",
};
function planProgress(plan: PhysioPlan, sessions: PhysioSession[]): {
  delivered: number;
  scheduled: number;
  missed: number;
  remaining: number;
  avgPainDrop: number | null;
  progressPct: number;
} {
  const planSessions = sessions.filter(
    (s) => s.planId === plan.id && s.organizationId === plan.organizationId
  );
  const delivered = planSessions.filter(
    (s) => s.status === "completed" || s.status === "attended"
  ).length;
  const scheduled = planSessions.filter(
    (s) => s.status === "scheduled"
  ).length;
  const missed = planSessions.filter((s) => s.status === "missed").length;
  const remaining = Math.max(0, plan.prescribedSessions - delivered);
  const drops = planSessions
    .filter(
      (s) =>
        s.vasPainPre !== undefined &&
        s.vasPainPost !== undefined &&
        (s.status === "completed" || s.status === "attended")
    )
    .map((s) => s.vasPainPre! - s.vasPainPost!);
  const avgPainDrop = drops.length
    ? Math.round(
        (drops.reduce((a, b) => a + b, 0) / drops.length) * 10
      ) / 10
    : null;
  const progressPct = plan.prescribedSessions
    ? Math.min(100, Math.round((delivered / plan.prescribedSessions) * 100))
    : 0;
  return { delivered, scheduled, missed, remaining, avgPainDrop, progressPct };
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  mrn?: string;
}

const PLAN_STATUSES: PlanStatus[] = ["active", "completed", "discontinued"];
const SESSION_STATUSES: SessionStatus[] = [
  "scheduled",
  "attended",
  "completed",
  "missed",
  "cancelled",
];
const REGIONS: BodyRegion[] = [
  "neck",
  "shoulder",
  "upper_back",
  "lower_back",
  "hip",
  "knee",
  "ankle",
  "wrist",
  "elbow",
  "whole_body",
  "neuro",
  "cardio_resp",
  "other",
];
const MODALITIES: TherapyModality[] = [
  "manual",
  "exercise",
  "electrotherapy",
  "ultrasound",
  "traction",
  "hydrotherapy",
  "cryo",
  "heat",
  "taping",
  "gait_training",
  "respiratory",
  "neurodev",
  "other",
];

const PLAN_COLOR: Record<PlanStatus, string> = {
  active: "bg-emerald-100 text-emerald-700",
  completed: "bg-slate-100 text-slate-700",
  discontinued: "bg-rose-100 text-rose-700",
};

const SESSION_COLOR: Record<SessionStatus, string> = {
  scheduled: "bg-sky-100 text-sky-700",
  attended: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  missed: "bg-rose-100 text-rose-700",
  cancelled: "bg-slate-100 text-slate-500",
};

export default function PhysioPage() {
  const [plans, setPlans] = useState<PhysioPlan[]>([]);
  const [sessionsByPlan, setSessionsByPlan] = useState<Record<string, PhysioSession[]>>({});
  const [patients, setPatients] = useState<Patient[]>([]);
  const [stats, setStats] = useState<PhysioStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState<PlanStatus | "">("");
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editPlan, setEditPlan] = useState<PhysioPlan | null>(null);
  const [addSessionFor, setAddSessionFor] = useState<PhysioPlan | null>(null);
  const [editSession, setEditSession] = useState<{ plan: PhysioPlan; session: PhysioSession } | null>(null);
  const [recordFor, setRecordFor] = useState<{ plan: PhysioPlan; session: PhysioSession } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const p = new URLSearchParams();
    if (filterStatus) p.set("status", filterStatus);
    const [planRes, patRes] = await Promise.all([
      fetch(`/api/hospital/physio?${p.toString()}`, { cache: "no-store" }),
      fetch("/api/patients", { cache: "no-store" }),
    ]);
    if (planRes.ok) {
      const d = await planRes.json();
      const planList: PhysioPlan[] = d.plans || [];
      setPlans(planList);
      setStats(d.stats || null);
      // Pre-fetch sessions for every plan
      const sess: Record<string, PhysioSession[]> = {};
      await Promise.all(
        planList.map(async (pl) => {
          const r = await fetch(`/api/hospital/physio/sessions?planId=${pl.id}`, { cache: "no-store" });
          if (r.ok) {
            const sd = await r.json();
            sess[pl.id] = sd.sessions || [];
          }
        })
      );
      setSessionsByPlan(sess);
    }
    if (patRes.ok) {
      const d = await patRes.json();
      setPatients(d.patients || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [filterStatus]);

  async function savePlan(input: Record<string, unknown>) {
    const method = editPlan ? "PATCH" : "POST";
    const body = editPlan ? { id: editPlan.id, ...input } : input;
    const res = await fetch("/api/hospital/physio", {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(`Save failed: ${d.error || res.status}`);
      return;
    }
    setShowPlanForm(false);
    setEditPlan(null);
    await load();
  }

  async function patchPlan(id: string, patch: Record<string, unknown>) {
    await fetch("/api/hospital/physio", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    await load();
  }

  async function deletePlan(id: string) {
    if (!confirm("Delete this plan and all its sessions?")) return;
    await fetch("/api/hospital/physio", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  async function saveSession(input: Record<string, unknown>, existingId?: string) {
    const method = existingId ? "PATCH" : "POST";
    const body = existingId ? { id: existingId, ...input } : input;
    const res = await fetch("/api/hospital/physio/sessions", {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(`Save failed: ${d.error || res.status}`);
      return;
    }
    setAddSessionFor(null);
    setEditSession(null);
    setRecordFor(null);
    await load();
  }

  async function patchSession(id: string, patch: Record<string, unknown>) {
    await fetch("/api/hospital/physio/sessions", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    await load();
  }

  async function deleteSession(id: string) {
    if (!confirm("Delete this session?")) return;
    await fetch("/api/hospital/physio/sessions", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  return (
    <div className="space-y-6">
      <PageHero
        icon="🏃"
        eyebrow="Rehabilitation"
        title="Physiotherapy & Rehabilitation"
        subtitle="Treatment plans, session tracking & pain outcome (VAS) monitoring"
        tone="emerald"
        primaryAction={{ label: "+ New plan", onClick: () => { setEditPlan(null); setShowPlanForm(true); } }}
      />

      {stats && (
        <StatGrid cols={4}>
          <StatCard label="Active plans" value={stats.activePlans} tone="emerald" icon="📋" />
          <StatCard label="Today's sessions" value={stats.sessionsToday} tone="sky" icon="📅" />
          <StatCard label="Sessions (month)" value={stats.sessionsThisMonth} tone="indigo" icon="📊" />
          <StatCard label="Completed (month)" value={stats.completedThisMonth} tone="teal" icon="✓" />
          <StatCard label="No-show rate" value={`${stats.noShowRatePct}%`} tone={stats.noShowRatePct > 15 ? "rose" : "slate"} hint="this month" icon="👻" />
          <StatCard label="Avg pain drop" value={stats.avgPainDropThisMonth.toFixed(1)} tone="violet" hint="VAS Δ / session" icon="📉" />
          <StatCard label="Plans completed" value={stats.plansCompletedThisMonth} tone="fuchsia" hint="this month" icon="🏁" />
        </StatGrid>
      )}

      <Section>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as PlanStatus | "")}
            className="inp"
          >
            <option value="">All plan statuses</option>
            {PLAN_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <span className="ml-auto text-xs text-slate-500">
            {loading ? "Loading…" : `${plans.length} plan(s)`}
          </span>
        </div>

        {plans.length === 0 ? (
          <Empty label="No treatment plans yet. Create the first one." />
        ) : (
          <div className="space-y-3">
            {plans.map((pl) => (
              <PlanCard
                key={pl.id}
                plan={pl}
                sessions={sessionsByPlan[pl.id] || []}
                expanded={expanded === pl.id}
                onToggle={() => setExpanded(expanded === pl.id ? null : pl.id)}
                onEdit={() => {
                  setEditPlan(pl);
                  setShowPlanForm(true);
                }}
                onComplete={() => patchPlan(pl.id, { status: "completed" })}
                onDiscontinue={() => {
                  const note = prompt("Discharge / discontinuation note?") || "";
                  patchPlan(pl.id, { status: "discontinued", dischargeNote: note });
                }}
                onReopen={() => patchPlan(pl.id, { status: "active" })}
                onDelete={() => deletePlan(pl.id)}
                onAddSession={() => setAddSessionFor(pl)}
                onEditSession={(s) => setEditSession({ plan: pl, session: s })}
                onRecord={(s) => setRecordFor({ plan: pl, session: s })}
                onDeleteSession={(id) => deleteSession(id)}
                onPatchSession={patchSession}
              />
            ))}
          </div>
        )}
      </Section>

      {showPlanForm && (
        <PlanFormModal
          initial={editPlan}
          patients={patients}
          onSave={savePlan}
          onClose={() => {
            setShowPlanForm(false);
            setEditPlan(null);
          }}
        />
      )}

      {(addSessionFor || editSession) && (
        <SessionFormModal
          plan={addSessionFor || editSession!.plan}
          session={editSession?.session || null}
          onSave={(input) => saveSession(input, editSession?.session.id)}
          onClose={() => {
            setAddSessionFor(null);
            setEditSession(null);
          }}
        />
      )}

      {recordFor && (
        <RecordSessionModal
          plan={recordFor.plan}
          session={recordFor.session}
          onSave={(input) => saveSession({ ...input, status: "completed" }, recordFor.session.id)}
          onClose={() => setRecordFor(null)}
        />
      )}

      <style jsx global>{`
        .inp {
          width: 100%;
          border: 1px solid rgb(226 232 240);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: rgb(15 23 42);
          background: white;
          outline: none;
          transition: border-color 0.15s;
        }
        .inp:focus {
          border-color: rgb(99 102 241);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
        }
      `}</style>
    </div>
  );
}

function PlanCard({
  plan,
  sessions,
  expanded,
  onToggle,
  onEdit,
  onComplete,
  onDiscontinue,
  onReopen,
  onDelete,
  onAddSession,
  onEditSession,
  onRecord,
  onDeleteSession,
  onPatchSession,
}: {
  plan: PhysioPlan;
  sessions: PhysioSession[];
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onComplete: () => void;
  onDiscontinue: () => void;
  onReopen: () => void;
  onDelete: () => void;
  onAddSession: () => void;
  onEditSession: (s: PhysioSession) => void;
  onRecord: (s: PhysioSession) => void;
  onDeleteSession: (id: string) => void;
  onPatchSession: (id: string, patch: Record<string, unknown>) => void;
}) {
  const prog = planProgress(plan, sessions);
  const overdue =
    plan.status === "active" &&
    plan.expectedEndAt &&
    new Date(plan.expectedEndAt).getTime() < Date.now();
  return (
    <div
      className={`rounded-xl border p-4 ${
        overdue ? "border-amber-300 bg-amber-50/40" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <button onClick={onToggle} className="text-left hover:text-primary-700">
            <div className="font-mono text-[11px] text-slate-500">{plan.planNumber}</div>
            <div className="text-base font-semibold text-slate-900">{plan.patientName}</div>
          </button>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-600">
            {plan.patientMRN && <span>{plan.patientMRN}</span>}
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700">
              {REGION_LABEL[plan.bodyRegion]}
            </span>
            <span className="text-slate-700">{plan.diagnosis}</span>
            {plan.therapist && <span>· Therapist: {plan.therapist}</span>}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-2 w-48 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-primary-500"
                style={{ width: `${prog.progressPct}%` }}
              />
            </div>
            <span className="text-[11px] text-slate-600">
              {prog.delivered}/{plan.prescribedSessions} delivered
              {prog.scheduled > 0 && ` · ${prog.scheduled} scheduled`}
              {prog.missed > 0 && (
                <span className="font-semibold text-rose-600">
                  {" "}· {prog.missed} missed
                </span>
              )}
            </span>
            {prog.avgPainDrop !== null && (
              <span className="text-[11px] font-semibold text-emerald-700">
                ▼ VAS {prog.avgPainDrop.toFixed(1)}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${PLAN_COLOR[plan.status]}`}>
            {plan.status}
          </span>
          {overdue && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
              Past due
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
        <button
          onClick={onAddSession}
          className="rounded bg-primary-600 px-3 py-1 text-[12px] font-semibold text-white hover:bg-primary-700"
        >
          + Session
        </button>
        {plan.status === "active" && (
          <>
            <button
              onClick={onComplete}
              className="rounded bg-emerald-600 px-3 py-1 text-[12px] font-semibold text-white hover:bg-emerald-700"
            >
              Discharge — complete
            </button>
            <button
              onClick={onDiscontinue}
              className="rounded bg-rose-100 px-3 py-1 text-[12px] font-semibold text-rose-700 hover:bg-rose-200"
            >
              Discontinue
            </button>
          </>
        )}
        {plan.status !== "active" && (
          <button
            onClick={onReopen}
            className="rounded bg-slate-100 px-3 py-1 text-[12px] font-semibold text-slate-700 hover:bg-slate-200"
          >
            Reopen
          </button>
        )}
        <button
          onClick={onEdit}
          className="rounded border border-slate-200 px-3 py-1 text-[12px] font-semibold text-slate-700 hover:bg-slate-100"
        >
          Edit plan
        </button>
        <button
          onClick={onDelete}
          className="rounded border border-slate-200 px-3 py-1 text-[12px] font-semibold text-rose-600 hover:bg-rose-50"
        >
          Delete
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3 rounded-lg bg-slate-50 p-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KV k="Started" v={new Date(plan.startedAt).toLocaleDateString()} />
            <KV k="Expected end" v={plan.expectedEndAt ? new Date(plan.expectedEndAt).toLocaleDateString() : "—"} />
            <KV k="Ended" v={plan.endedAt ? new Date(plan.endedAt).toLocaleDateString() : "—"} />
            <KV k="Referred by" v={plan.referredBy || "—"} />
          </div>
          {plan.goals && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500">Goals</div>
              <div className="text-sm text-slate-700">{plan.goals}</div>
            </div>
          )}
          {plan.precautions && (
            <div className="rounded bg-amber-50 p-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Precautions</div>
              <div className="text-sm text-amber-900">{plan.precautions}</div>
            </div>
          )}
          {plan.dischargeNote && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500">Discharge note</div>
              <div className="text-sm text-slate-700">{plan.dischargeNote}</div>
            </div>
          )}

          <div>
            <div className="mb-2 text-[10px] uppercase tracking-wide text-slate-500">
              Sessions ({sessions.length})
            </div>
            {sessions.length === 0 ? (
              <div className="rounded border border-dashed border-slate-300 bg-white p-4 text-center text-sm text-slate-500">
                No sessions booked yet.
              </div>
            ) : (
              <div className="space-y-1.5">
                {sessions.map((s) => (
                  <SessionRow
                    key={s.id}
                    session={s}
                    onRecord={() => onRecord(s)}
                    onMarkAttended={() => onPatchSession(s.id, { status: "attended" })}
                    onMarkMissed={() => onPatchSession(s.id, { status: "missed" })}
                    onEdit={() => onEditSession(s)}
                    onDelete={() => onDeleteSession(s.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SessionRow({
  session,
  onRecord,
  onMarkAttended,
  onMarkMissed,
  onEdit,
  onDelete,
}: {
  session: PhysioSession;
  onRecord: () => void;
  onMarkAttended: () => void;
  onMarkMissed: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const s = session;
  const painDrop =
    s.vasPainPre !== undefined && s.vasPainPost !== undefined
      ? s.vasPainPre - s.vasPainPost
      : null;
  return (
    <div className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-white px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-mono text-[11px] text-slate-500">{s.sessionNumber}</span>
          <span className="text-slate-800">
            {new Date(s.scheduledAt).toLocaleString()}
          </span>
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${SESSION_COLOR[s.status]}`}>
            {s.status}
          </span>
          {s.therapist && <span className="text-[12px] text-slate-500">· {s.therapist}</span>}
          {s.durationMin && <span className="text-[12px] text-slate-500">· {s.durationMin}m</span>}
          {painDrop !== null && (
            <span className={`text-[11px] font-semibold ${painDrop > 0 ? "text-emerald-700" : "text-rose-600"}`}>
              VAS {s.vasPainPre}→{s.vasPainPost}
            </span>
          )}
        </div>
        {s.modalities.length > 0 && (
          <div className="mt-0.5 flex flex-wrap gap-1">
            {s.modalities.map((m) => (
              <span key={m} className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
                {MODALITY_LABEL[m]}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-shrink-0 flex-wrap justify-end gap-1">
        {s.status === "scheduled" && (
          <>
            <button
              onClick={onRecord}
              className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
            >
              Record
            </button>
            <button
              onClick={onMarkAttended}
              className="rounded bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-200"
            >
              Attended
            </button>
            <button
              onClick={onMarkMissed}
              className="rounded bg-rose-100 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-200"
            >
              No-show
            </button>
          </>
        )}
        {s.status === "attended" && (
          <button
            onClick={onRecord}
            className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
          >
            Record outcome
          </button>
        )}
        <button onClick={onEdit} className="rounded border border-slate-200 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-100">
          Edit
        </button>
        <button onClick={onDelete} className="rounded border border-slate-200 px-2 py-1 text-[11px] text-rose-600 hover:bg-rose-50">
          Delete
        </button>
      </div>
    </div>
  );
}

function PlanFormModal({
  initial,
  patients,
  onSave,
  onClose,
}: {
  initial: PhysioPlan | null;
  patients: Patient[];
  onSave: (input: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    patientId: initial?.patientId || "",
    patientName: initial?.patientName || "",
    patientMRN: initial?.patientMRN || "",
    diagnosis: initial?.diagnosis || "",
    bodyRegion: initial?.bodyRegion || ("lower_back" as BodyRegion),
    therapist: initial?.therapist || "",
    referredBy: initial?.referredBy || "",
    goals: initial?.goals || "",
    precautions: initial?.precautions || "",
    prescribedSessions: initial?.prescribedSessions ?? 6,
    startedAt: initial?.startedAt
      ? initial.startedAt.slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    expectedEndAt: initial?.expectedEndAt?.slice(0, 10) || "",
  });

  function submit() {
    if (!form.patientName.trim() || !form.diagnosis.trim()) {
      alert("Patient name and diagnosis are required");
      return;
    }
    onSave({
      patientId: form.patientId || undefined,
      patientName: form.patientName.trim(),
      patientMRN: form.patientMRN.trim() || undefined,
      diagnosis: form.diagnosis.trim(),
      bodyRegion: form.bodyRegion,
      therapist: form.therapist.trim() || undefined,
      referredBy: form.referredBy.trim() || undefined,
      goals: form.goals.trim() || undefined,
      precautions: form.precautions.trim() || undefined,
      prescribedSessions: Number(form.prescribedSessions),
      startedAt: new Date(form.startedAt).toISOString(),
      expectedEndAt: form.expectedEndAt
        ? new Date(form.expectedEndAt).toISOString()
        : undefined,
    });
  }

  return (
    <Modal title={initial ? "Edit plan" : "New physio plan"} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Patient">
          <select
            value={form.patientId}
            onChange={(e) => {
              const p = patients.find((x) => x.id === e.target.value);
              setForm({
                ...form,
                patientId: e.target.value,
                patientName: p ? `${p.firstName} ${p.lastName}` : form.patientName,
                patientMRN: p?.mrn || form.patientMRN,
              });
            }}
            className="inp"
          >
            <option value="">— Manual entry —</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName} {p.mrn ? `· ${p.mrn}` : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Patient name *">
          <input value={form.patientName}
            onChange={(e) => setForm({ ...form, patientName: e.target.value })} className="inp" />
        </Field>
        <Field label="MRN">
          <input value={form.patientMRN}
            onChange={(e) => setForm({ ...form, patientMRN: e.target.value })} className="inp" />
        </Field>
        <Field label="Diagnosis *">
          <input value={form.diagnosis}
            onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} className="inp" />
        </Field>
        <Field label="Body region">
          <select value={form.bodyRegion}
            onChange={(e) => setForm({ ...form, bodyRegion: e.target.value as BodyRegion })}
            className="inp">
            {REGIONS.map((r) => <option key={r} value={r}>{REGION_LABEL[r]}</option>)}
          </select>
        </Field>
        <Field label="Therapist">
          <input value={form.therapist}
            onChange={(e) => setForm({ ...form, therapist: e.target.value })} className="inp" />
        </Field>
        <Field label="Referred by">
          <input value={form.referredBy}
            onChange={(e) => setForm({ ...form, referredBy: e.target.value })} className="inp" />
        </Field>
        <Field label="Prescribed sessions">
          <input type="number" min={1} value={form.prescribedSessions}
            onChange={(e) => setForm({ ...form, prescribedSessions: Number(e.target.value) })}
            className="inp" />
        </Field>
        <Field label="Started">
          <input type="date" value={form.startedAt}
            onChange={(e) => setForm({ ...form, startedAt: e.target.value })} className="inp" />
        </Field>
        <Field label="Expected end">
          <input type="date" value={form.expectedEndAt}
            onChange={(e) => setForm({ ...form, expectedEndAt: e.target.value })} className="inp" />
        </Field>
        <div className="col-span-2">
          <Field label="Goals">
            <textarea rows={2} value={form.goals}
              onChange={(e) => setForm({ ...form, goals: e.target.value })} className="inp" />
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="Precautions / contraindications">
            <textarea rows={2} value={form.precautions}
              onChange={(e) => setForm({ ...form, precautions: e.target.value })} className="inp" />
          </Field>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2 border-t border-slate-200 pt-4">
        <button onClick={onClose}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
          Cancel
        </button>
        <button onClick={submit}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
          {initial ? "Save" : "Create plan"}
        </button>
      </div>
    </Modal>
  );
}

function SessionFormModal({
  plan,
  session,
  onSave,
  onClose,
}: {
  plan: PhysioPlan;
  session: PhysioSession | null;
  onSave: (input: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    scheduledAt: session?.scheduledAt
      ? session.scheduledAt.slice(0, 16)
      : new Date().toISOString().slice(0, 16),
    therapist: session?.therapist || plan.therapist || "",
    durationMin: session?.durationMin ?? 45,
    status: session?.status || ("scheduled" as SessionStatus),
  });

  function submit() {
    onSave({
      planId: plan.id,
      scheduledAt: new Date(form.scheduledAt).toISOString(),
      therapist: form.therapist.trim() || undefined,
      durationMin: Number.isFinite(Number(form.durationMin)) ? Number(form.durationMin) : undefined,
      status: form.status,
    });
  }

  return (
    <Modal title={session ? "Edit session" : `Book session — ${plan.patientName}`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Scheduled at">
          <input type="datetime-local" value={form.scheduledAt}
            onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} className="inp" />
        </Field>
        <Field label="Duration (min)">
          <input type="number" value={form.durationMin}
            onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })} className="inp" />
        </Field>
        <Field label="Therapist">
          <input value={form.therapist}
            onChange={(e) => setForm({ ...form, therapist: e.target.value })} className="inp" />
        </Field>
        <Field label="Status">
          <select value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as SessionStatus })}
            className="inp">
            {SESSION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      <div className="mt-5 flex justify-end gap-2 border-t border-slate-200 pt-4">
        <button onClick={onClose}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
          Cancel
        </button>
        <button onClick={submit}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
          {session ? "Save" : "Book"}
        </button>
      </div>
    </Modal>
  );
}

function RecordSessionModal({
  plan,
  session,
  onSave,
  onClose,
}: {
  plan: PhysioPlan;
  session: PhysioSession;
  onSave: (input: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    durationMin: session.durationMin ?? 45,
    vasPainPre: session.vasPainPre ?? "",
    vasPainPost: session.vasPainPost ?? "",
    modalities: session.modalities || [],
    exercises: session.exercises || "",
    homeProgram: session.homeProgram || "",
    notes: session.notes || "",
  });

  function toggleMod(m: TherapyModality) {
    setForm((f) => ({
      ...f,
      modalities: f.modalities.includes(m)
        ? f.modalities.filter((x) => x !== m)
        : [...f.modalities, m],
    }));
  }

  const drop =
    form.vasPainPre !== "" && form.vasPainPost !== ""
      ? Number(form.vasPainPre) - Number(form.vasPainPost)
      : null;

  function submit() {
    onSave({
      durationMin: Number(form.durationMin),
      vasPainPre: form.vasPainPre !== "" ? Number(form.vasPainPre) : undefined,
      vasPainPost: form.vasPainPost !== "" ? Number(form.vasPainPost) : undefined,
      modalities: form.modalities,
      exercises: form.exercises.trim() || undefined,
      homeProgram: form.homeProgram.trim() || undefined,
      notes: form.notes.trim() || undefined,
    });
  }

  return (
    <Modal title={`Record session — ${session.sessionNumber}`} onClose={onClose}>
      <div className="mb-3 rounded-lg bg-slate-50 p-3 text-sm">
        <span className="font-semibold text-slate-900">{plan.patientName}</span>
        <span className="ml-2 text-slate-500">· {plan.diagnosis}</span>
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Duration (min)">
            <input type="number" value={form.durationMin}
              onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })} className="inp" />
          </Field>
          <Field label="VAS pain pre (0-10)">
            <input type="number" min={0} max={10} value={form.vasPainPre}
              onChange={(e) => setForm({ ...form, vasPainPre: e.target.value })} className="inp" />
          </Field>
          <Field label="VAS pain post (0-10)">
            <input type="number" min={0} max={10} value={form.vasPainPost}
              onChange={(e) => setForm({ ...form, vasPainPost: e.target.value })} className="inp" />
          </Field>
        </div>
        {drop !== null && (
          <div className={`rounded p-2 text-sm ${drop > 0 ? "bg-emerald-50 text-emerald-800" : drop < 0 ? "bg-rose-50 text-rose-800" : "bg-slate-50 text-slate-700"}`}>
            Pain change: <span className="font-bold">{drop > 0 ? "▼" : drop < 0 ? "▲" : "—"} {Math.abs(drop)} point(s)</span>
          </div>
        )}

        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            Modalities applied
          </div>
          <div className="flex flex-wrap gap-2">
            {MODALITIES.map((m) => {
              const on = form.modalities.includes(m);
              return (
                <button key={m} type="button" onClick={() => toggleMod(m)}
                  className={`rounded-full px-2.5 py-1 text-[12px] font-medium transition ${
                    on ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}>
                  {MODALITY_LABEL[m]}
                </button>
              );
            })}
          </div>
        </div>

        <Field label="Exercises performed">
          <textarea rows={2} value={form.exercises}
            onChange={(e) => setForm({ ...form, exercises: e.target.value })} className="inp" />
        </Field>
        <Field label="Home program issued">
          <textarea rows={2} value={form.homeProgram}
            onChange={(e) => setForm({ ...form, homeProgram: e.target.value })} className="inp" />
        </Field>
        <Field label="Session notes">
          <textarea rows={3} value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })} className="inp" />
        </Field>
      </div>
      <div className="mt-5 flex justify-end gap-2 border-t border-slate-200 pt-4">
        <button onClick={onClose}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
          Cancel
        </button>
        <button onClick={submit}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
          Record & complete
        </button>
      </div>
    </Modal>
  );
}

// ---------- helpers ----------

function Stat({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: "slate" | "emerald" | "amber" | "rose" | "blue";
}) {
  const colors: Record<string, string> = {
    slate: "text-slate-900",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    rose: "text-rose-600",
    blue: "text-blue-600",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${colors[color]}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-5">{children}</section>;
}

function Empty({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
      {label}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{k}</div>
      <div className="text-sm text-slate-800">{v}</div>
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-12"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
