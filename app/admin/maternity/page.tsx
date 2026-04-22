"use client";

import { useEffect, useState } from "react";
import type {
  Delivery,
  DeliveryStatus,
  DeliveryMode,
  Anesthesia,
  PerinealCondition,
  DeliveryOutcome,
  Complication,
  Sex,
  NewbornRecord,
  MaternityStats,
} from "@/lib/hospital/maternity-store";
// Inlined from maternity-store — importing runtime values pulls persistent-array → Postgres into the client bundle and crashes the page.
const MODE_LABEL: Record<DeliveryMode, string> = {
  normal: "Normal vaginal",
  c_section_elective: "C-section (elective)",
  c_section_emergency: "C-section (emergency)",
  vacuum: "Assisted — vacuum",
  forceps: "Assisted — forceps",
  breech: "Breech delivery",
};
const ANESTHESIA_LABEL: Record<Anesthesia, string> = {
  none: "None",
  local: "Local infiltration",
  epidural: "Epidural",
  spinal: "Spinal",
  general: "General",
};
const PERINEUM_LABEL: Record<PerinealCondition, string> = {
  intact: "Intact",
  episiotomy: "Episiotomy",
  tear_1: "1st degree tear",
  tear_2: "2nd degree tear",
  tear_3: "3rd degree tear",
  tear_4: "4th degree tear",
};
const OUTCOME_LABEL: Record<DeliveryOutcome, string> = {
  live_birth: "Live birth",
  stillbirth: "Stillbirth",
  mother_death: "Maternal death",
  neonatal_death: "Neonatal death",
  maternal_and_neonatal_death: "Maternal + neonatal death",
};
const COMPLICATION_LABEL: Record<Complication, string> = {
  pph: "Postpartum hemorrhage",
  obstructed_labor: "Obstructed labor",
  shoulder_dystocia: "Shoulder dystocia",
  cord_prolapse: "Cord prolapse",
  eclampsia: "Eclampsia",
  pre_eclampsia: "Pre-eclampsia",
  placenta_previa: "Placenta previa",
  abruption: "Placental abruption",
  retained_placenta: "Retained placenta",
  uterine_rupture: "Uterine rupture",
  fetal_distress: "Fetal distress",
  meconium: "Meconium-stained liquor",
  other: "Other",
};
function stageMinutes(d: Delivery): {
  stage1?: number;
  stage2?: number;
  stage3?: number;
} {
  const diff = (a?: string, b?: string): number | undefined => {
    if (!a || !b) return undefined;
    const x = new Date(b).getTime() - new Date(a).getTime();
    return Number.isFinite(x) && x >= 0 ? Math.round(x / 60000) : undefined;
  };
  return {
    stage1: diff(d.laborOnsetAt, d.firstStageEndAt),
    stage2: diff(d.firstStageEndAt, d.deliveredAt),
    stage3: diff(d.deliveredAt, d.placentaAt),
  };
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  mrn?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  gender?: string;
}

const STATUSES: DeliveryStatus[] = [
  "admitted",
  "in_labor",
  "delivered",
  "discharged",
  "referred",
];
const MODES: DeliveryMode[] = [
  "normal",
  "c_section_elective",
  "c_section_emergency",
  "vacuum",
  "forceps",
  "breech",
];
const ANESTHESIAS: Anesthesia[] = ["none", "local", "epidural", "spinal", "general"];
const PERINEUMS: PerinealCondition[] = [
  "intact",
  "episiotomy",
  "tear_1",
  "tear_2",
  "tear_3",
  "tear_4",
];
const OUTCOMES: DeliveryOutcome[] = [
  "live_birth",
  "stillbirth",
  "mother_death",
  "neonatal_death",
  "maternal_and_neonatal_death",
];
const COMPLICATIONS: Complication[] = [
  "pph",
  "obstructed_labor",
  "shoulder_dystocia",
  "cord_prolapse",
  "eclampsia",
  "pre_eclampsia",
  "placenta_previa",
  "abruption",
  "retained_placenta",
  "uterine_rupture",
  "fetal_distress",
  "meconium",
  "other",
];

const STATUS_COLOR: Record<DeliveryStatus, string> = {
  admitted: "bg-sky-100 text-sky-700",
  in_labor: "bg-amber-100 text-amber-800 animate-pulse",
  delivered: "bg-emerald-100 text-emerald-700",
  discharged: "bg-slate-100 text-slate-700",
  referred: "bg-purple-100 text-purple-700",
};

const MODE_COLOR: Record<DeliveryMode, string> = {
  normal: "bg-emerald-100 text-emerald-700",
  c_section_elective: "bg-sky-100 text-sky-700",
  c_section_emergency: "bg-rose-100 text-rose-700",
  vacuum: "bg-amber-100 text-amber-800",
  forceps: "bg-amber-100 text-amber-800",
  breech: "bg-purple-100 text-purple-700",
};

export default function MaternityPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [stats, setStats] = useState<MaternityStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState<DeliveryStatus | "">("");
  const [activeOnly, setActiveOnly] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editDelivery, setEditDelivery] = useState<Delivery | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const p = new URLSearchParams();
    if (filterStatus) p.set("status", filterStatus);
    const [dRes, pRes] = await Promise.all([
      fetch(`/api/hospital/maternity?${p.toString()}`, { cache: "no-store" }),
      fetch("/api/patients", { cache: "no-store" }),
    ]);
    if (dRes.ok) {
      const d = await dRes.json();
      let list: Delivery[] = d.deliveries || [];
      if (activeOnly) {
        list = list.filter(
          (x) => x.status === "in_labor" || x.status === "admitted"
        );
      }
      setDeliveries(list);
      setStats(d.stats || null);
    }
    if (pRes.ok) {
      const d = await pRes.json();
      // Only show female patients in the picker
      setPatients(
        (d.patients || []).filter(
          (p: Patient) => !p.gender || p.gender === "female"
        )
      );
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [filterStatus, activeOnly]);

  async function saveDelivery(input: Record<string, unknown>) {
    const method = editDelivery ? "PATCH" : "POST";
    const body = editDelivery ? { id: editDelivery.id, ...input } : input;
    const res = await fetch("/api/hospital/maternity", {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(`Save failed: ${d.error || res.status}`);
      return;
    }
    setShowForm(false);
    setEditDelivery(null);
    await load();
  }

  async function patchDelivery(id: string, patch: Record<string, unknown>) {
    await fetch("/api/hospital/maternity", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    await load();
  }

  async function deleteDelivery(id: string) {
    if (!confirm("Delete this register entry? (Legal record — use caution.)")) return;
    await fetch("/api/hospital/maternity", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Labor & Delivery Register
          </h1>
          <p className="text-sm text-slate-500">
            Maternal + newborn outcomes, partograph stage timings & complication audit
          </p>
        </div>
        <button
          onClick={() => {
            setEditDelivery(null);
            setShowForm(true);
          }}
          className="rounded-lg bg-primary-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-700"
        >
          + New admission
        </button>
      </header>

      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
          <Stat label="Active labor" value={stats.activeLabor} color={stats.activeLabor > 0 ? "amber" : "slate"} />
          <Stat label="Delivered today" value={stats.deliveriesToday} color="emerald" />
          <Stat label="Delivered (month)" value={stats.deliveriesThisMonth} color="slate"
            sub={`${stats.normalPct}% NVD · ${stats.csectionPct}% CS`} />
          <Stat label="Avg blood loss" value={`${stats.avgBloodLossMl}ml`} color={stats.avgBloodLossMl > 500 ? "rose" : "slate"} sub="completed deliveries" />
          <Stat label="Complications" value={stats.complicationsThisMonth} color={stats.complicationsThisMonth > 0 ? "amber" : "slate"} sub="this month" />
          <Stat label="Stillbirths" value={stats.stillbirthsThisMonth} color={stats.stillbirthsThisMonth > 0 ? "rose" : "slate"} sub="this month" />
          <Stat label="Neonatal deaths" value={stats.neonatalDeathsThisMonth} color={stats.neonatalDeathsThisMonth > 0 ? "rose" : "slate"} sub="this month" />
          <Stat label="NICU admits" value={stats.nicuAdmitsThisMonth} color="blue" sub="this month" />
        </div>
      )}

      <Section>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as DeliveryStatus | "")}
            className="inp"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace("_", " ")}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
            />
            Active labor only
          </label>
          <span className="ml-auto text-xs text-slate-500">
            {loading ? "Loading…" : `${deliveries.length} record(s)`}
          </span>
        </div>

        {deliveries.length === 0 ? (
          <Empty label="No deliveries in register yet." />
        ) : (
          <div className="space-y-2">
            {deliveries.map((d) => (
              <DeliveryRow
                key={d.id}
                d={d}
                expanded={expanded === d.id}
                onToggle={() => setExpanded(expanded === d.id ? null : d.id)}
                onStartLabor={() => patchDelivery(d.id, { status: "in_labor" })}
                onMarkDelivered={() => {
                  setEditDelivery(d);
                  setShowForm(true);
                }}
                onDischarge={() => patchDelivery(d.id, { status: "discharged" })}
                onEdit={() => {
                  setEditDelivery(d);
                  setShowForm(true);
                }}
                onDelete={() => deleteDelivery(d.id)}
              />
            ))}
          </div>
        )}
      </Section>

      {showForm && (
        <DeliveryFormModal
          initial={editDelivery}
          patients={patients}
          onSave={saveDelivery}
          onClose={() => {
            setShowForm(false);
            setEditDelivery(null);
          }}
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

function DeliveryRow({
  d,
  expanded,
  onToggle,
  onStartLabor,
  onMarkDelivered,
  onDischarge,
  onEdit,
  onDelete,
}: {
  d: Delivery;
  expanded: boolean;
  onToggle: () => void;
  onStartLabor: () => void;
  onMarkDelivered: () => void;
  onDischarge: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const stages = stageMinutes(d);
  const gpal =
    d.gravidity !== undefined
      ? `G${d.gravidity}P${d.parity ?? 0}L${d.livingChildren ?? 0}A${d.abortions ?? 0}`
      : undefined;
  return (
    <div
      className={`rounded-xl border p-4 ${
        d.status === "in_labor"
          ? "border-amber-300 bg-amber-50/50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <button onClick={onToggle} className="text-left hover:text-primary-700">
            <div className="font-mono text-[11px] text-slate-500">
              {d.registerNumber}
            </div>
            <div className="text-base font-semibold text-slate-900">
              {d.motherName}
              {d.motherAge !== undefined && (
                <span className="ml-2 text-[12px] font-normal text-slate-500">
                  {d.motherAge}y
                </span>
              )}
            </div>
          </button>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-600">
            {d.motherMRN && <span>{d.motherMRN}</span>}
            {d.motherBloodGroup && (
              <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                {d.motherBloodGroup}
              </span>
            )}
            {gpal && <span className="font-mono text-slate-700">{gpal}</span>}
            {d.gestationalAgeWeeks !== undefined && (
              <span>GA {d.gestationalAgeWeeks}
                {d.gestationalAgeDays ? `+${d.gestationalAgeDays}` : ""}w</span>
            )}
            {d.room && <span>📍 {d.room}</span>}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[12px] text-slate-500">
            <span>Admitted {new Date(d.admittedAt).toLocaleString()}</span>
            {d.deliveredAt && <span>Delivered {new Date(d.deliveredAt).toLocaleString()}</span>}
            {d.newborns.length > 0 && (
              <span className="font-semibold text-emerald-700">
                👶 {d.newborns.length} baby{d.newborns.length > 1 ? "ies" : ""}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[d.status]}`}>
            {d.status.replace("_", " ")}
          </span>
          {d.deliveryMode && (
            <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${MODE_COLOR[d.deliveryMode]}`}>
              {MODE_LABEL[d.deliveryMode]}
            </span>
          )}
          {d.outcome && d.outcome !== "live_birth" && (
            <span className="rounded bg-rose-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
              {OUTCOME_LABEL[d.outcome]}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
        {d.status === "admitted" && (
          <button
            onClick={onStartLabor}
            className="rounded bg-amber-500 px-3 py-1 text-[12px] font-semibold text-white hover:bg-amber-600"
          >
            Start labor
          </button>
        )}
        {(d.status === "admitted" || d.status === "in_labor") && (
          <button
            onClick={onMarkDelivered}
            className="rounded bg-emerald-600 px-3 py-1 text-[12px] font-semibold text-white hover:bg-emerald-700"
          >
            Record delivery
          </button>
        )}
        {d.status === "delivered" && (
          <button
            onClick={onDischarge}
            className="rounded bg-slate-800 px-3 py-1 text-[12px] font-semibold text-white hover:bg-slate-900"
          >
            Discharge
          </button>
        )}
        <button
          onClick={onEdit}
          className="rounded border border-slate-200 px-3 py-1 text-[12px] font-semibold text-slate-700 hover:bg-slate-100"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="rounded border border-slate-200 px-3 py-1 text-[12px] font-semibold text-rose-600 hover:bg-rose-50"
        >
          Delete
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-4 rounded-lg bg-slate-50 p-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KV k="Stage I" v={stages.stage1 !== undefined ? `${stages.stage1} min` : "—"} />
            <KV k="Stage II" v={stages.stage2 !== undefined ? `${stages.stage2} min` : "—"} />
            <KV k="Stage III" v={stages.stage3 !== undefined ? `${stages.stage3} min` : "—"} />
            <KV k="Blood loss" v={d.bloodLossMl !== undefined ? `${d.bloodLossMl} ml` : "—"} />
            <KV k="Anesthesia" v={d.anesthesia ? ANESTHESIA_LABEL[d.anesthesia] : "—"} />
            <KV k="Perineum" v={d.perineum ? PERINEUM_LABEL[d.perineum] : "—"} />
            <KV k="Obstetrician" v={d.obstetrician || "—"} />
            <KV k="Midwife" v={d.midwife || "—"} />
            <KV k="Pediatrician" v={d.pediatrician || "—"} />
          </div>
          {d.complications.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500">Complications</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {d.complications.map((c) => (
                  <span key={c} className="rounded bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                    {COMPLICATION_LABEL[c]}
                  </span>
                ))}
              </div>
            </div>
          )}
          {d.newborns.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500">Newborns</div>
              <div className="mt-2 space-y-2">
                {d.newborns.map((n, i) => (
                  <NewbornCard key={n.id} n={n} idx={i + 1} />
                ))}
              </div>
            </div>
          )}
          {d.notes && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500">Notes</div>
              <div className="text-sm text-slate-700">{d.notes}</div>
            </div>
          )}
          {d.referredTo && (
            <div className="rounded bg-purple-50 p-2 text-sm text-purple-800">
              <span className="font-semibold">Referred to {d.referredTo}:</span>{" "}
              {d.referralReason || "—"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NewbornCard({ n, idx }: { n: NewbornRecord; idx: number }) {
  const apgar =
    n.apgar1 !== undefined
      ? `${n.apgar1}/${n.apgar5 ?? "—"}/${n.apgar10 ?? "—"}`
      : "—";
  const lowApgar5 = n.apgar5 !== undefined && n.apgar5 < 7;
  return (
    <div className={`rounded border p-2 ${n.alive ? "border-slate-200 bg-white" : "border-rose-300 bg-rose-50"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-slate-900">
          Baby {idx}{n.babyName ? ` — ${n.babyName}` : ""}
        </span>
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
          n.sex === "male" ? "bg-sky-100 text-sky-700" :
          n.sex === "female" ? "bg-pink-100 text-pink-700" :
          "bg-slate-100 text-slate-700"
        }`}>
          {n.sex}
        </span>
        {!n.alive && (
          <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
            Stillborn
          </span>
        )}
        {n.resuscitationNeeded && (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
            Resuscitation
          </span>
        )}
        {n.nicuAdmitted && (
          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800">
            NICU
          </span>
        )}
      </div>
      <div className="mt-1 grid grid-cols-2 gap-1 text-[11px] text-slate-600 md:grid-cols-5">
        <span><span className="text-slate-400">Weight:</span> {n.weightG ? `${n.weightG}g` : "—"}</span>
        <span><span className="text-slate-400">Length:</span> {n.lengthCm ? `${n.lengthCm}cm` : "—"}</span>
        <span><span className="text-slate-400">HC:</span> {n.headCircumCm ? `${n.headCircumCm}cm` : "—"}</span>
        <span className={lowApgar5 ? "font-semibold text-rose-700" : ""}>
          <span className="text-slate-400">APGAR:</span> {apgar}
        </span>
        <span><span className="text-slate-400">Cert:</span> {n.birthCertNo || "—"}</span>
      </div>
      {n.notes && <div className="mt-1 text-[11px] text-slate-600">{n.notes}</div>}
    </div>
  );
}

function DeliveryFormModal({
  initial,
  patients,
  onSave,
  onClose,
}: {
  initial: Delivery | null;
  patients: Patient[];
  onSave: (input: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    motherId: initial?.motherId || "",
    motherName: initial?.motherName || "",
    motherMRN: initial?.motherMRN || "",
    motherAge: initial?.motherAge ?? "",
    motherBloodGroup: initial?.motherBloodGroup || "",
    gravidity: initial?.gravidity ?? "",
    parity: initial?.parity ?? "",
    livingChildren: initial?.livingChildren ?? "",
    abortions: initial?.abortions ?? "",
    gestationalAgeWeeks: initial?.gestationalAgeWeeks ?? "",
    gestationalAgeDays: initial?.gestationalAgeDays ?? "",
    lmp: initial?.lmp?.slice(0, 10) || "",
    status: initial?.status || ("admitted" as DeliveryStatus),
    admittedAt: initial?.admittedAt
      ? initial.admittedAt.slice(0, 16)
      : new Date().toISOString().slice(0, 16),
    laborOnsetAt: initial?.laborOnsetAt?.slice(0, 16) || "",
    firstStageEndAt: initial?.firstStageEndAt?.slice(0, 16) || "",
    deliveredAt: initial?.deliveredAt?.slice(0, 16) || "",
    placentaAt: initial?.placentaAt?.slice(0, 16) || "",
    deliveryMode: initial?.deliveryMode || "",
    anesthesia: initial?.anesthesia || "",
    perineum: initial?.perineum || "",
    bloodLossMl: initial?.bloodLossMl ?? "",
    complications: initial?.complications || [],
    obstetrician: initial?.obstetrician || "",
    midwife: initial?.midwife || "",
    pediatrician: initial?.pediatrician || "",
    room: initial?.room || "",
    outcome: initial?.outcome || "",
    referralReason: initial?.referralReason || "",
    referredTo: initial?.referredTo || "",
    newborns: initial?.newborns || [],
    notes: initial?.notes || "",
  });

  function toggleComp(c: Complication) {
    setForm((f) => ({
      ...f,
      complications: f.complications.includes(c)
        ? f.complications.filter((x) => x !== c)
        : [...f.complications, c],
    }));
  }

  function addNewborn() {
    setForm((f) => ({
      ...f,
      newborns: [
        ...f.newborns,
        {
          id: `nb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
          sex: "female",
          bornAt: f.deliveredAt
            ? new Date(f.deliveredAt).toISOString()
            : new Date().toISOString(),
          alive: true,
          resuscitationNeeded: false,
          nicuAdmitted: false,
        } as NewbornRecord,
      ],
    }));
  }

  function updateNewborn(idx: number, patch: Partial<NewbornRecord>) {
    setForm((f) => ({
      ...f,
      newborns: f.newborns.map((n, i) => (i === idx ? { ...n, ...patch } : n)),
    }));
  }

  function removeNewborn(idx: number) {
    setForm((f) => ({
      ...f,
      newborns: f.newborns.filter((_, i) => i !== idx),
    }));
  }

  function submit() {
    if (!form.motherName.trim()) {
      alert("Mother's name is required");
      return;
    }
    onSave({
      motherId: form.motherId || undefined,
      motherName: form.motherName.trim(),
      motherMRN: form.motherMRN.trim() || undefined,
      motherAge: form.motherAge !== "" ? Number(form.motherAge) : undefined,
      motherBloodGroup: form.motherBloodGroup.trim() || undefined,
      gravidity: form.gravidity !== "" ? Number(form.gravidity) : undefined,
      parity: form.parity !== "" ? Number(form.parity) : undefined,
      livingChildren: form.livingChildren !== "" ? Number(form.livingChildren) : undefined,
      abortions: form.abortions !== "" ? Number(form.abortions) : undefined,
      gestationalAgeWeeks: form.gestationalAgeWeeks !== "" ? Number(form.gestationalAgeWeeks) : undefined,
      gestationalAgeDays: form.gestationalAgeDays !== "" ? Number(form.gestationalAgeDays) : undefined,
      lmp: form.lmp || undefined,
      status: form.status,
      admittedAt: new Date(form.admittedAt).toISOString(),
      laborOnsetAt: form.laborOnsetAt ? new Date(form.laborOnsetAt).toISOString() : undefined,
      firstStageEndAt: form.firstStageEndAt ? new Date(form.firstStageEndAt).toISOString() : undefined,
      deliveredAt: form.deliveredAt ? new Date(form.deliveredAt).toISOString() : undefined,
      placentaAt: form.placentaAt ? new Date(form.placentaAt).toISOString() : undefined,
      deliveryMode: form.deliveryMode || undefined,
      anesthesia: form.anesthesia || undefined,
      perineum: form.perineum || undefined,
      bloodLossMl: form.bloodLossMl !== "" ? Number(form.bloodLossMl) : undefined,
      complications: form.complications,
      obstetrician: form.obstetrician.trim() || undefined,
      midwife: form.midwife.trim() || undefined,
      pediatrician: form.pediatrician.trim() || undefined,
      room: form.room.trim() || undefined,
      outcome: form.outcome || undefined,
      referralReason: form.referralReason.trim() || undefined,
      referredTo: form.referredTo.trim() || undefined,
      newborns: form.newborns,
      notes: form.notes.trim() || undefined,
    });
  }

  return (
    <Modal title={initial ? `Edit — ${initial.registerNumber}` : "New maternity admission"} onClose={onClose} wide>
      <div className="space-y-5">
        <SubHeading>Mother</SubHeading>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="col-span-2 md:col-span-2">
            <Field label="Patient link">
              <select
                value={form.motherId}
                onChange={(e) => {
                  const p = patients.find((x) => x.id === e.target.value);
                  if (p) {
                    const age = p.dateOfBirth
                      ? Math.floor(
                          (Date.now() - new Date(p.dateOfBirth).getTime()) /
                            (365.25 * 24 * 3600 * 1000)
                        )
                      : undefined;
                    setForm({
                      ...form,
                      motherId: p.id,
                      motherName: `${p.firstName} ${p.lastName}`,
                      motherMRN: p.mrn || form.motherMRN,
                      motherAge: age ?? form.motherAge,
                      motherBloodGroup: p.bloodGroup || form.motherBloodGroup,
                    });
                  } else {
                    setForm({ ...form, motherId: "" });
                  }
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
          </div>
          <Field label="Mother name *">
            <input value={form.motherName}
              onChange={(e) => setForm({ ...form, motherName: e.target.value })} className="inp" />
          </Field>
          <Field label="MRN">
            <input value={form.motherMRN}
              onChange={(e) => setForm({ ...form, motherMRN: e.target.value })} className="inp" />
          </Field>
          <Field label="Age">
            <input type="number" value={form.motherAge}
              onChange={(e) => setForm({ ...form, motherAge: e.target.value })} className="inp" />
          </Field>
          <Field label="Blood group">
            <input value={form.motherBloodGroup}
              onChange={(e) => setForm({ ...form, motherBloodGroup: e.target.value })} className="inp" />
          </Field>
          <Field label="G"><input type="number" value={form.gravidity}
            onChange={(e) => setForm({ ...form, gravidity: e.target.value })} className="inp" /></Field>
          <Field label="P"><input type="number" value={form.parity}
            onChange={(e) => setForm({ ...form, parity: e.target.value })} className="inp" /></Field>
          <Field label="L"><input type="number" value={form.livingChildren}
            onChange={(e) => setForm({ ...form, livingChildren: e.target.value })} className="inp" /></Field>
          <Field label="A"><input type="number" value={form.abortions}
            onChange={(e) => setForm({ ...form, abortions: e.target.value })} className="inp" /></Field>
          <Field label="GA weeks"><input type="number" value={form.gestationalAgeWeeks}
            onChange={(e) => setForm({ ...form, gestationalAgeWeeks: e.target.value })} className="inp" /></Field>
          <Field label="GA days"><input type="number" value={form.gestationalAgeDays}
            onChange={(e) => setForm({ ...form, gestationalAgeDays: e.target.value })} className="inp" /></Field>
          <Field label="LMP">
            <input type="date" value={form.lmp}
              onChange={(e) => setForm({ ...form, lmp: e.target.value })} className="inp" />
          </Field>
          <Field label="Room">
            <input value={form.room}
              onChange={(e) => setForm({ ...form, room: e.target.value })} className="inp" />
          </Field>
        </div>

        <SubHeading>Labor timeline</SubHeading>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Field label="Status">
            <select value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as DeliveryStatus })}
              className="inp">
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace("_", " ")}</option>
              ))}
            </select>
          </Field>
          <Field label="Admitted at">
            <input type="datetime-local" value={form.admittedAt}
              onChange={(e) => setForm({ ...form, admittedAt: e.target.value })} className="inp" />
          </Field>
          <Field label="Labor onset">
            <input type="datetime-local" value={form.laborOnsetAt}
              onChange={(e) => setForm({ ...form, laborOnsetAt: e.target.value })} className="inp" />
          </Field>
          <Field label="Full dilation (end stage 1)">
            <input type="datetime-local" value={form.firstStageEndAt}
              onChange={(e) => setForm({ ...form, firstStageEndAt: e.target.value })} className="inp" />
          </Field>
          <Field label="Delivered at">
            <input type="datetime-local" value={form.deliveredAt}
              onChange={(e) => setForm({ ...form, deliveredAt: e.target.value })} className="inp" />
          </Field>
          <Field label="Placenta delivered">
            <input type="datetime-local" value={form.placentaAt}
              onChange={(e) => setForm({ ...form, placentaAt: e.target.value })} className="inp" />
          </Field>
        </div>

        <SubHeading>Delivery</SubHeading>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Field label="Mode">
            <select value={form.deliveryMode}
              onChange={(e) => setForm({ ...form, deliveryMode: e.target.value as DeliveryMode | "" })}
              className="inp">
              <option value="">—</option>
              {MODES.map((m) => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}
            </select>
          </Field>
          <Field label="Anesthesia">
            <select value={form.anesthesia}
              onChange={(e) => setForm({ ...form, anesthesia: e.target.value as Anesthesia | "" })}
              className="inp">
              <option value="">—</option>
              {ANESTHESIAS.map((a) => <option key={a} value={a}>{ANESTHESIA_LABEL[a]}</option>)}
            </select>
          </Field>
          <Field label="Perineum">
            <select value={form.perineum}
              onChange={(e) => setForm({ ...form, perineum: e.target.value as PerinealCondition | "" })}
              className="inp">
              <option value="">—</option>
              {PERINEUMS.map((p) => <option key={p} value={p}>{PERINEUM_LABEL[p]}</option>)}
            </select>
          </Field>
          <Field label="Blood loss (ml)">
            <input type="number" value={form.bloodLossMl}
              onChange={(e) => setForm({ ...form, bloodLossMl: e.target.value })} className="inp" />
          </Field>
          <Field label="Outcome">
            <select value={form.outcome}
              onChange={(e) => setForm({ ...form, outcome: e.target.value as DeliveryOutcome | "" })}
              className="inp">
              <option value="">—</option>
              {OUTCOMES.map((o) => <option key={o} value={o}>{OUTCOME_LABEL[o]}</option>)}
            </select>
          </Field>
          <Field label="Obstetrician">
            <input value={form.obstetrician}
              onChange={(e) => setForm({ ...form, obstetrician: e.target.value })} className="inp" />
          </Field>
          <Field label="Midwife">
            <input value={form.midwife}
              onChange={(e) => setForm({ ...form, midwife: e.target.value })} className="inp" />
          </Field>
          <Field label="Pediatrician">
            <input value={form.pediatrician}
              onChange={(e) => setForm({ ...form, pediatrician: e.target.value })} className="inp" />
          </Field>
        </div>

        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            Complications
          </div>
          <div className="flex flex-wrap gap-2">
            {COMPLICATIONS.map((c) => {
              const on = form.complications.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleComp(c)}
                  className={`rounded-full px-2.5 py-1 text-[12px] font-medium transition ${
                    on
                      ? "bg-rose-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {COMPLICATION_LABEL[c]}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <SubHeading>Newborns</SubHeading>
            <button
              type="button"
              onClick={addNewborn}
              className="rounded bg-emerald-600 px-2 py-1 text-[12px] font-semibold text-white hover:bg-emerald-700"
            >
              + Add baby
            </button>
          </div>
          {form.newborns.length === 0 ? (
            <div className="rounded border border-dashed border-slate-300 p-3 text-center text-sm text-slate-500">
              No baby records yet. Add one per baby (twins/triplets get multiple entries).
            </div>
          ) : (
            <div className="space-y-3">
              {form.newborns.map((n, i) => (
                <NewbornEditor
                  key={n.id}
                  n={n}
                  idx={i}
                  onChange={(patch) => updateNewborn(i, patch)}
                  onRemove={() => removeNewborn(i)}
                />
              ))}
            </div>
          )}
        </div>

        {form.status === "referred" && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Referred to">
              <input value={form.referredTo}
                onChange={(e) => setForm({ ...form, referredTo: e.target.value })} className="inp" />
            </Field>
            <Field label="Referral reason">
              <input value={form.referralReason}
                onChange={(e) => setForm({ ...form, referralReason: e.target.value })} className="inp" />
            </Field>
          </div>
        )}

        <Field label="Notes">
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
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
          {initial ? "Save" : "Register admission"}
        </button>
      </div>
    </Modal>
  );
}

function NewbornEditor({
  n,
  idx,
  onChange,
  onRemove,
}: {
  n: NewbornRecord;
  idx: number;
  onChange: (patch: Partial<NewbornRecord>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-800">Baby {idx + 1}</span>
        <button
          type="button"
          onClick={onRemove}
          className="text-[11px] font-semibold text-rose-600 hover:text-rose-700"
        >
          Remove
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Field label="Name">
          <input value={n.babyName || ""}
            onChange={(e) => onChange({ babyName: e.target.value })} className="inp" />
        </Field>
        <Field label="Sex">
          <select value={n.sex}
            onChange={(e) => onChange({ sex: e.target.value as Sex })} className="inp">
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="ambiguous">Ambiguous</option>
          </select>
        </Field>
        <Field label="Born at">
          <input type="datetime-local"
            value={n.bornAt ? n.bornAt.slice(0, 16) : ""}
            onChange={(e) => onChange({ bornAt: new Date(e.target.value).toISOString() })}
            className="inp" />
        </Field>
        <Field label="Birth cert #">
          <input value={n.birthCertNo || ""}
            onChange={(e) => onChange({ birthCertNo: e.target.value })} className="inp" />
        </Field>
        <Field label="Weight (g)">
          <input type="number" value={n.weightG ?? ""}
            onChange={(e) => onChange({ weightG: e.target.value !== "" ? Number(e.target.value) : undefined })} className="inp" />
        </Field>
        <Field label="Length (cm)">
          <input type="number" step="0.1" value={n.lengthCm ?? ""}
            onChange={(e) => onChange({ lengthCm: e.target.value !== "" ? Number(e.target.value) : undefined })} className="inp" />
        </Field>
        <Field label="Head circ. (cm)">
          <input type="number" step="0.1" value={n.headCircumCm ?? ""}
            onChange={(e) => onChange({ headCircumCm: e.target.value !== "" ? Number(e.target.value) : undefined })} className="inp" />
        </Field>
        <Field label="APGAR 1/5/10">
          <div className="flex gap-1">
            <input type="number" min={0} max={10} placeholder="1" value={n.apgar1 ?? ""}
              onChange={(e) => onChange({ apgar1: e.target.value !== "" ? Number(e.target.value) : undefined })} className="inp" />
            <input type="number" min={0} max={10} placeholder="5" value={n.apgar5 ?? ""}
              onChange={(e) => onChange({ apgar5: e.target.value !== "" ? Number(e.target.value) : undefined })} className="inp" />
            <input type="number" min={0} max={10} placeholder="10" value={n.apgar10 ?? ""}
              onChange={(e) => onChange({ apgar10: e.target.value !== "" ? Number(e.target.value) : undefined })} className="inp" />
          </div>
        </Field>
      </div>
      <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-700">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={n.alive}
            onChange={(e) => onChange({ alive: e.target.checked })} />
          Live born
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={n.resuscitationNeeded}
            onChange={(e) => onChange({ resuscitationNeeded: e.target.checked })} />
          Resuscitation needed
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={n.nicuAdmitted}
            onChange={(e) => onChange({ nicuAdmitted: e.target.checked })} />
          Admitted to NICU
        </label>
      </div>
      <Field label="Notes">
        <input value={n.notes || ""}
          onChange={(e) => onChange({ notes: e.target.value })} className="inp" />
      </Field>
    </div>
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

function SubHeading({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{children}</div>;
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
  wide,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-12"
      onClick={onClose}
    >
      <div
        className={`w-full ${wide ? "max-w-5xl" : "max-w-2xl"} rounded-xl bg-white shadow-2xl`}
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
