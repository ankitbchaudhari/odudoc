"use client";

import { useEffect, useState } from "react";
import type {
  ChemoProtocol,
  ChemoCycle,
  ChemoDrug,
  ProtocolStatus,
  CycleStatus,
  CancerType,
  CancerStage,
  RegimenIntent,
  AdverseEvent,
  AdverseEventEntry,
  OncologyStats,
} from "@/lib/hospital/oncology-store";
// Inlined from oncology-store — importing runtime values pulls persistent-array → Postgres into the client bundle and crashes the page.
const CANCER_LABEL: Record<CancerType, string> = {
  breast: "Breast",
  lung: "Lung",
  colorectal: "Colorectal",
  prostate: "Prostate",
  lymphoma: "Lymphoma",
  leukemia: "Leukemia",
  myeloma: "Myeloma",
  ovarian: "Ovarian",
  cervical: "Cervical",
  head_neck: "Head & Neck",
  pancreatic: "Pancreatic",
  liver: "Liver",
  gastric: "Gastric",
  bladder: "Bladder",
  kidney: "Kidney",
  thyroid: "Thyroid",
  sarcoma: "Sarcoma",
  cns: "CNS",
  melanoma: "Melanoma",
  other: "Other",
};
const AE_LABEL: Record<AdverseEvent, string> = {
  neutropenia: "Neutropenia",
  anemia: "Anemia",
  thrombocytopenia: "Thrombocytopenia",
  nausea: "Nausea",
  vomiting: "Vomiting",
  diarrhea: "Diarrhea",
  constipation: "Constipation",
  mucositis: "Mucositis",
  fatigue: "Fatigue",
  neuropathy: "Neuropathy",
  hand_foot_syndrome: "Hand-foot syndrome",
  alopecia: "Alopecia",
  rash: "Rash",
  hypersensitivity: "Hypersensitivity",
  cardiotoxicity: "Cardiotoxicity",
  hepatotoxicity: "Hepatotoxicity",
  nephrotoxicity: "Nephrotoxicity",
  febrile_neutropenia: "Febrile neutropenia",
  other: "Other",
};
const INTENT_LABEL: Record<RegimenIntent, string> = {
  curative: "Curative",
  adjuvant: "Adjuvant",
  neoadjuvant: "Neoadjuvant",
  palliative: "Palliative",
  maintenance: "Maintenance",
};
function protocolProgress(protocol: ChemoProtocol, cycles: ChemoCycle[]): {
  delivered: number;
  scheduled: number;
  delayed: number;
  remaining: number;
  progressPct: number;
  worstToxicity: number; // 0 if none, else max grade seen
} {
  const myCycles = cycles.filter(
    (c) => c.protocolId === protocol.id && c.organizationId === protocol.organizationId
  );
  const delivered = myCycles.filter((c) => c.status === "administered").length;
  const scheduled = myCycles.filter((c) => c.status === "scheduled").length;
  const delayed = myCycles.filter((c) => c.status === "delayed").length;
  const remaining = Math.max(0, protocol.cyclesPrescribed - delivered);
  const progressPct =
    protocol.cyclesPrescribed > 0
      ? Math.round((delivered / protocol.cyclesPrescribed) * 100)
      : 0;
  let worstToxicity = 0;
  for (const c of myCycles) {
    for (const ae of c.adverseEvents || []) {
      if (ae.grade > worstToxicity) worstToxicity = ae.grade;
    }
  }
  return { delivered, scheduled, delayed, remaining, progressPct, worstToxicity };
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  mrn?: string;
}

const PROTOCOL_STATUSES: ProtocolStatus[] = ["active", "completed", "discontinued", "on_hold"];
const CANCER_TYPES: CancerType[] = [
  "breast", "lung", "colorectal", "prostate", "lymphoma", "leukemia", "myeloma",
  "ovarian", "cervical", "head_neck", "pancreatic", "liver", "gastric", "bladder",
  "kidney", "thyroid", "sarcoma", "cns", "melanoma", "other",
];
const STAGES: CancerStage[] = ["0", "I", "II", "III", "IV", "unknown"];
const INTENTS: RegimenIntent[] = ["curative", "adjuvant", "neoadjuvant", "palliative", "maintenance"];
const AE_TYPES: AdverseEvent[] = [
  "neutropenia", "anemia", "thrombocytopenia", "nausea", "vomiting", "diarrhea",
  "constipation", "mucositis", "fatigue", "neuropathy", "hand_foot_syndrome",
  "alopecia", "rash", "hypersensitivity", "cardiotoxicity", "hepatotoxicity",
  "nephrotoxicity", "febrile_neutropenia", "other",
];

const PROTOCOL_COLOR: Record<ProtocolStatus, string> = {
  active: "bg-emerald-100 text-emerald-700",
  completed: "bg-slate-100 text-slate-700",
  discontinued: "bg-rose-100 text-rose-700",
  on_hold: "bg-amber-100 text-amber-700",
};

const CYCLE_COLOR: Record<CycleStatus, string> = {
  scheduled: "bg-sky-100 text-sky-700",
  administered: "bg-emerald-100 text-emerald-700",
  delayed: "bg-amber-100 text-amber-700",
  cancelled: "bg-slate-100 text-slate-500",
};

const GRADE_COLOR: Record<number, string> = {
  1: "bg-slate-100 text-slate-700",
  2: "bg-amber-100 text-amber-700",
  3: "bg-orange-100 text-orange-700",
  4: "bg-rose-100 text-rose-700",
  5: "bg-rose-200 text-rose-900 font-semibold",
};

export default function OncologyPage() {
  const [protocols, setProtocols] = useState<ChemoProtocol[]>([]);
  const [cyclesByProtocol, setCyclesByProtocol] = useState<Record<string, ChemoCycle[]>>({});
  const [patients, setPatients] = useState<Patient[]>([]);
  const [stats, setStats] = useState<OncologyStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState<ProtocolStatus | "">("");
  const [filterCancer, setFilterCancer] = useState<CancerType | "">("");
  const [showProtocolForm, setShowProtocolForm] = useState(false);
  const [editProtocol, setEditProtocol] = useState<ChemoProtocol | null>(null);
  const [addCycleFor, setAddCycleFor] = useState<ChemoProtocol | null>(null);
  const [editCycle, setEditCycle] = useState<{ protocol: ChemoProtocol; cycle: ChemoCycle } | null>(null);
  const [recordFor, setRecordFor] = useState<{ protocol: ChemoProtocol; cycle: ChemoCycle } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const p = new URLSearchParams();
    if (filterStatus) p.set("status", filterStatus);
    if (filterCancer) p.set("cancerType", filterCancer);
    const [protoRes, patRes] = await Promise.all([
      fetch(`/api/hospital/oncology?${p.toString()}`, { cache: "no-store" }),
      fetch("/api/patients", { cache: "no-store" }),
    ]);
    if (protoRes.ok) {
      const d = await protoRes.json();
      const list: ChemoProtocol[] = d.protocols || [];
      setProtocols(list);
      setStats(d.stats || null);
      const cyc: Record<string, ChemoCycle[]> = {};
      await Promise.all(
        list.map(async (pr) => {
          const r = await fetch(`/api/hospital/oncology/cycles?protocolId=${pr.id}`, { cache: "no-store" });
          if (r.ok) {
            const sd = await r.json();
            cyc[pr.id] = sd.cycles || [];
          }
        })
      );
      setCyclesByProtocol(cyc);
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
  }, [filterStatus, filterCancer]);

  async function saveProtocol(form: Partial<ChemoProtocol>) {
    const method = editProtocol ? "PATCH" : "POST";
    const body = editProtocol ? { id: editProtocol.id, ...form } : form;
    const res = await fetch("/api/hospital/oncology", {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setShowProtocolForm(false);
      setEditProtocol(null);
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Failed to save");
    }
  }

  async function changeProtocolStatus(p: ChemoProtocol, status: ProtocolStatus, reason?: string, note?: string) {
    const res = await fetch("/api/hospital/oncology", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: p.id, status, endReason: reason, endNote: note }),
    });
    if (res.ok) load();
  }

  async function deleteProtocol(p: ChemoProtocol) {
    if (!confirm(`Delete protocol ${p.id}? All cycles will be removed.`)) return;
    const res = await fetch("/api/hospital/oncology", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: p.id }),
    });
    if (res.ok) load();
  }

  async function saveCycle(form: Partial<ChemoCycle>) {
    const isEdit = !!editCycle;
    const method = isEdit ? "PATCH" : "POST";
    const body = isEdit ? { id: editCycle!.cycle.id, ...form } : form;
    const res = await fetch("/api/hospital/oncology/cycles", {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setAddCycleFor(null);
      setEditCycle(null);
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Failed to save");
    }
  }

  async function recordCycle(form: Partial<ChemoCycle>) {
    if (!recordFor) return;
    const res = await fetch("/api/hospital/oncology/cycles", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: recordFor.cycle.id,
        status: "administered",
        ...form,
      }),
    });
    if (res.ok) {
      setRecordFor(null);
      load();
    }
  }

  async function quickCycleStatus(c: ChemoCycle, status: CycleStatus) {
    const res = await fetch("/api/hospital/oncology/cycles", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: c.id, status }),
    });
    if (res.ok) load();
  }

  async function deleteCycle(c: ChemoCycle) {
    if (!confirm(`Delete cycle ${c.id}?`)) return;
    const res = await fetch("/api/hospital/oncology/cycles", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: c.id }),
    });
    if (res.ok) load();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Oncology & Chemotherapy</h1>
          <p className="text-sm text-slate-500">
            Treatment protocols, cycle scheduling, CTCAE adverse event tracking.
          </p>
        </div>
        <button
          onClick={() => { setEditProtocol(null); setShowProtocolForm(true); }}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
        >
          + New protocol
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
          <Stat label="Active protocols" value={stats.activeProtocols} />
          <Stat label="Cycles today" value={stats.cyclesToday} />
          <Stat label="Cycles (month)" value={stats.cyclesMonth} />
          <Stat label="Administered (mo)" value={stats.administeredMonth} tone="emerald" />
          <Stat label="Delayed (mo)" value={stats.delayedMonth} tone="amber" />
          <Stat label="High-tox active" value={stats.highToxicityActive} tone="rose" />
          <Stat label="Delay rate (90d)" value={`${stats.avgDelayRate}%`} />
          <Stat label="Completed (mo)" value={stats.completedMonth} tone="emerald" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</span>
        <FilterBtn active={filterStatus === ""} onClick={() => setFilterStatus("")} label="All" />
        {PROTOCOL_STATUSES.map((s) => (
          <FilterBtn key={s} active={filterStatus === s} onClick={() => setFilterStatus(s)} label={s.replace("_", " ")} />
        ))}
        <div className="mx-2 h-6 w-px bg-slate-200" />
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cancer</span>
        <select
          value={filterCancer}
          onChange={(e) => setFilterCancer(e.target.value as CancerType | "")}
          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
        >
          <option value="">All types</option>
          {CANCER_TYPES.map((c) => (
            <option key={c} value={c}>{CANCER_LABEL[c]}</option>
          ))}
        </select>
      </div>

      {/* Protocols */}
      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">Loading…</div>
      ) : protocols.length === 0 ? (
        <Empty />
      ) : (
        <div className="space-y-3">
          {protocols.map((p) => (
            <ProtocolCard
              key={p.id}
              protocol={p}
              cycles={cyclesByProtocol[p.id] || []}
              expanded={expanded === p.id}
              onToggle={() => setExpanded(expanded === p.id ? null : p.id)}
              onEdit={() => { setEditProtocol(p); setShowProtocolForm(true); }}
              onDelete={() => deleteProtocol(p)}
              onAddCycle={() => setAddCycleFor(p)}
              onEditCycle={(cycle) => setEditCycle({ protocol: p, cycle })}
              onRecordCycle={(cycle) => setRecordFor({ protocol: p, cycle })}
              onDeleteCycle={deleteCycle}
              onQuickCycle={quickCycleStatus}
              onComplete={() => changeProtocolStatus(p, "completed", "completed")}
              onHold={() => changeProtocolStatus(p, "on_hold")}
              onResume={() => changeProtocolStatus(p, "active")}
              onDiscontinue={() => {
                const reason = prompt("Reason: progression, toxicity, patient_choice, death, switch_regimen, lost_to_followup, other") || "other";
                const note = prompt("Note (optional):") || undefined;
                changeProtocolStatus(p, "discontinued", reason, note);
              }}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showProtocolForm && (
        <ProtocolFormModal
          protocol={editProtocol}
          patients={patients}
          onSave={saveProtocol}
          onClose={() => { setShowProtocolForm(false); setEditProtocol(null); }}
        />
      )}
      {addCycleFor && (
        <CycleFormModal
          protocol={addCycleFor}
          cycle={null}
          existingCount={(cyclesByProtocol[addCycleFor.id] || []).length}
          onSave={saveCycle}
          onClose={() => setAddCycleFor(null)}
        />
      )}
      {editCycle && (
        <CycleFormModal
          protocol={editCycle.protocol}
          cycle={editCycle.cycle}
          existingCount={0}
          onSave={saveCycle}
          onClose={() => setEditCycle(null)}
        />
      )}
      {recordFor && (
        <RecordCycleModal
          protocol={recordFor.protocol}
          cycle={recordFor.cycle}
          onSave={recordCycle}
          onClose={() => setRecordFor(null)}
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
// Protocol Card
// ============================================================

function ProtocolCard({
  protocol, cycles, expanded, onToggle,
  onEdit, onDelete, onAddCycle, onEditCycle, onRecordCycle, onDeleteCycle, onQuickCycle,
  onComplete, onHold, onResume, onDiscontinue,
}: {
  protocol: ChemoProtocol;
  cycles: ChemoCycle[];
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddCycle: () => void;
  onEditCycle: (c: ChemoCycle) => void;
  onRecordCycle: (c: ChemoCycle) => void;
  onDeleteCycle: (c: ChemoCycle) => void;
  onQuickCycle: (c: ChemoCycle, status: CycleStatus) => void;
  onComplete: () => void;
  onHold: () => void;
  onResume: () => void;
  onDiscontinue: () => void;
}) {
  const prog = protocolProgress(protocol, cycles);
  const pastDue = protocol.status === "active" && protocol.expectedEndAt && new Date(protocol.expectedEndAt) < new Date();

  return (
    <div className={`rounded-xl border bg-white shadow-sm transition ${pastDue ? "border-amber-300 ring-1 ring-amber-200" : "border-slate-200"}`}>
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={onToggle} className="text-left font-mono text-sm font-semibold text-primary-700 hover:underline">
                {protocol.id}
              </button>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PROTOCOL_COLOR[protocol.status]}`}>
                {protocol.status.replace("_", " ")}
              </span>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                {CANCER_LABEL[protocol.cancerType]}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                Stage {protocol.stage}
              </span>
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                {INTENT_LABEL[protocol.regimenIntent]}
              </span>
              {prog.worstToxicity >= 3 && (
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${GRADE_COLOR[prog.worstToxicity]}`}>
                  Grade {prog.worstToxicity} toxicity
                </span>
              )}
              {pastDue && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">past due</span>
              )}
            </div>
            <div className="mt-1.5 text-[15px] font-semibold text-slate-900">{protocol.patientName}</div>
            <div className="text-xs text-slate-600">
              <span className="font-semibold text-slate-700">{protocol.regimenName}</span> · {protocol.diagnosis}
              {protocol.oncologist ? ` · ${protocol.oncologist}` : ""}
            </div>
            {/* Progress */}
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
              <div className="h-2 w-40 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                  style={{ width: `${prog.progressPct}%` }}
                />
              </div>
              <span className="font-mono text-[11px] text-slate-500">
                {prog.delivered}/{protocol.cyclesPrescribed} cycles · {prog.progressPct}%
              </span>
              {prog.scheduled > 0 && (
                <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                  {prog.scheduled} scheduled
                </span>
              )}
              {prog.delayed > 0 && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  {prog.delayed} delayed
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-1.5">
            {protocol.status === "active" && (
              <>
                <button onClick={onAddCycle} className="rounded-md bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-100">
                  + Cycle
                </button>
                <button onClick={onHold} className="rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100">
                  Hold
                </button>
                {prog.remaining === 0 && (
                  <button onClick={onComplete} className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
                    Complete
                  </button>
                )}
                <button onClick={onDiscontinue} className="rounded-md bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100">
                  Discontinue
                </button>
              </>
            )}
            {protocol.status === "on_hold" && (
              <button onClick={onResume} className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
                Resume
              </button>
            )}
            {(protocol.status === "completed" || protocol.status === "discontinued") && (
              <button onClick={onResume} className="rounded-md bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100">
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

        {/* Expanded detail */}
        {expanded && (
          <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 text-xs">
              <KV label="Started" value={fmtDate(protocol.startedAt)} />
              <KV label="Expected end" value={fmtDate(protocol.expectedEndAt)} />
              <KV label="Cycle length" value={`${protocol.cycleLengthDays}d`} />
              <KV label="Ended" value={protocol.endedAt ? fmtDate(protocol.endedAt) : "—"} />
            </div>

            {/* Regimen drug list */}
            {protocol.drugs.length > 0 && (
              <div>
                <div className="mb-1 text-xs font-semibold text-slate-500">Regimen</div>
                <div className="flex flex-wrap gap-1.5">
                  {protocol.drugs.map((d, i) => (
                    <span key={i} className="rounded-md bg-indigo-50 px-2 py-1 text-[11px] text-indigo-800">
                      <span className="font-semibold">{d.name}</span> {d.dose}
                      {d.route ? ` · ${d.route}` : ""}
                      {d.day ? ` · ${d.day}` : ""}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {protocol.notes && (
              <div>
                <div className="mb-1 text-xs font-semibold text-slate-500">Notes</div>
                <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700">{protocol.notes}</div>
              </div>
            )}

            {protocol.endReason && (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-2 text-xs">
                <span className="font-semibold text-rose-800">Ended — {protocol.endReason.replace("_", " ")}</span>
                {protocol.endNote ? <div className="mt-0.5 text-rose-700">{protocol.endNote}</div> : null}
              </div>
            )}

            {/* Cycles list */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-500">Cycles ({cycles.length})</div>
                <button
                  onClick={onAddCycle}
                  className="rounded-md bg-primary-50 px-2 py-0.5 text-[11px] font-semibold text-primary-700 hover:bg-primary-100"
                >
                  + Schedule
                </button>
              </div>
              {cycles.length === 0 ? (
                <div className="rounded-md bg-slate-50 px-3 py-4 text-center text-xs text-slate-400">No cycles yet</div>
              ) : (
                <div className="space-y-1.5">
                  {cycles.map((c) => (
                    <CycleRow
                      key={c.id}
                      cycle={c}
                      onEdit={() => onEditCycle(c)}
                      onRecord={() => onRecordCycle(c)}
                      onDelete={() => onDeleteCycle(c)}
                      onDelay={() => onQuickCycle(c, "delayed")}
                      onCancel={() => onQuickCycle(c, "cancelled")}
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

function CycleRow({
  cycle, onEdit, onRecord, onDelete, onDelay, onCancel,
}: {
  cycle: ChemoCycle;
  onEdit: () => void;
  onRecord: () => void;
  onDelete: () => void;
  onDelay: () => void;
  onCancel: () => void;
}) {
  const worstAe = (cycle.adverseEvents || []).reduce((m, ae) => Math.max(m, ae.grade), 0);
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-100 bg-slate-50/60 px-3 py-2 text-xs">
      <span className="font-mono text-[11px] font-semibold text-primary-700">C{cycle.cycleNumber}</span>
      <span className="font-mono text-[11px] text-slate-400">{cycle.id}</span>
      <span className="text-slate-600">{fmtDateTime(cycle.scheduledAt)}</span>
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${CYCLE_COLOR[cycle.status]}`}>
        {cycle.status}
      </span>
      {cycle.administeredAt && (
        <span className="text-slate-500">✓ {fmtDateTime(cycle.administeredAt)}</span>
      )}
      {cycle.nurse && <span className="text-slate-500">· {cycle.nurse}</span>}
      {cycle.chair && <span className="text-slate-500">· {cycle.chair}</span>}
      {cycle.doseReductionPct ? (
        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
          -{cycle.doseReductionPct}%
        </span>
      ) : null}
      {worstAe > 0 && (
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${GRADE_COLOR[worstAe]}`}>
          G{worstAe}
        </span>
      )}
      {(cycle.adverseEvents || []).slice(0, 3).map((ae, i) => (
        <span key={i} className="rounded bg-white px-1.5 py-0.5 text-[10px] text-slate-600 ring-1 ring-slate-200">
          {AE_LABEL[ae.event]} G{ae.grade}
        </span>
      ))}
      <span className="flex-1" />
      {cycle.status === "scheduled" && (
        <>
          <button onClick={onRecord} className="rounded bg-primary-50 px-2 py-0.5 text-[10px] font-semibold text-primary-700 hover:bg-primary-100">
            Record
          </button>
          <button onClick={onDelay} className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 hover:bg-amber-100">
            Delay
          </button>
          <button onClick={onCancel} className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-200">
            Cancel
          </button>
        </>
      )}
      {cycle.status === "delayed" && (
        <button onClick={onRecord} className="rounded bg-primary-50 px-2 py-0.5 text-[10px] font-semibold text-primary-700 hover:bg-primary-100">
          Record
        </button>
      )}
      <button onClick={onEdit} className="rounded bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
        Edit
      </button>
      <button onClick={onDelete} className="rounded bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 hover:bg-rose-100">
        Del
      </button>
    </div>
  );
}

// ============================================================
// Protocol Form Modal
// ============================================================

function ProtocolFormModal({
  protocol, patients, onSave, onClose,
}: {
  protocol: ChemoProtocol | null;
  patients: Patient[];
  onSave: (form: Partial<ChemoProtocol>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    patientId: protocol?.patientId || "",
    patientName: protocol?.patientName || "",
    oncologist: protocol?.oncologist || "",
    diagnosis: protocol?.diagnosis || "",
    cancerType: (protocol?.cancerType || "breast") as CancerType,
    stage: (protocol?.stage || "II") as CancerStage,
    regimenName: protocol?.regimenName || "",
    regimenIntent: (protocol?.regimenIntent || "curative") as RegimenIntent,
    cyclesPrescribed: protocol?.cyclesPrescribed || 6,
    cycleLengthDays: protocol?.cycleLengthDays || 21,
    startedAt: protocol?.startedAt ? protocol.startedAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
    notes: protocol?.notes || "",
  });
  const [drugs, setDrugs] = useState<ChemoDrug[]>(protocol?.drugs || []);

  function pickPatient(id: string) {
    const p = patients.find((x) => x.id === id);
    setForm({
      ...form,
      patientId: id,
      patientName: p ? `${p.firstName} ${p.lastName}` : form.patientName,
    });
  }

  function addDrug() {
    setDrugs([...drugs, { name: "", dose: "", route: "IV", day: "D1" }]);
  }

  function updDrug(i: number, patch: Partial<ChemoDrug>) {
    setDrugs(drugs.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  }

  function rmDrug(i: number) {
    setDrugs(drugs.filter((_, idx) => idx !== i));
  }

  function submit() {
    if (!form.patientId || !form.patientName) return alert("Select patient");
    if (!form.diagnosis || !form.regimenName) return alert("Diagnosis and regimen required");
    onSave({
      ...form,
      startedAt: new Date(form.startedAt).toISOString(),
      drugs: drugs.filter((d) => d.name.trim() && d.dose.trim()),
    });
  }

  return (
    <Modal title={protocol ? "Edit protocol" : "New chemotherapy protocol"} onClose={onClose} wide>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Patient *">
            <select value={form.patientId} onChange={(e) => pickPatient(e.target.value)} className="inp">
              <option value="">Select patient…</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.firstName} {p.lastName}{p.mrn ? ` (${p.mrn})` : ""}</option>
              ))}
            </select>
          </Field>
          <Field label="Oncologist">
            <input value={form.oncologist} onChange={(e) => setForm({ ...form, oncologist: e.target.value })} className="inp" placeholder="Dr. …" />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Cancer type *">
            <select value={form.cancerType} onChange={(e) => setForm({ ...form, cancerType: e.target.value as CancerType })} className="inp">
              {CANCER_TYPES.map((c) => <option key={c} value={c}>{CANCER_LABEL[c]}</option>)}
            </select>
          </Field>
          <Field label="Stage *">
            <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value as CancerStage })} className="inp">
              {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Intent *">
            <select value={form.regimenIntent} onChange={(e) => setForm({ ...form, regimenIntent: e.target.value as RegimenIntent })} className="inp">
              {INTENTS.map((i) => <option key={i} value={i}>{INTENT_LABEL[i]}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Diagnosis *">
          <input value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} className="inp" placeholder="e.g. Invasive ductal carcinoma, right breast" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Regimen name *">
            <input value={form.regimenName} onChange={(e) => setForm({ ...form, regimenName: e.target.value })} className="inp" placeholder="FOLFOX / AC-T / CHOP" />
          </Field>
          <Field label="Start date">
            <input type="date" value={form.startedAt} onChange={(e) => setForm({ ...form, startedAt: e.target.value })} className="inp" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Cycles prescribed *">
            <input type="number" min={1} value={form.cyclesPrescribed} onChange={(e) => setForm({ ...form, cyclesPrescribed: Number(e.target.value) })} className="inp" />
          </Field>
          <Field label="Cycle length (days)">
            <input type="number" min={1} value={form.cycleLengthDays} onChange={(e) => setForm({ ...form, cycleLengthDays: Number(e.target.value) })} className="inp" />
          </Field>
        </div>

        {/* Drugs */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-700">Regimen drugs</div>
            <button onClick={addDrug} className="rounded bg-white px-2 py-0.5 text-[11px] font-semibold text-primary-700 ring-1 ring-slate-200 hover:bg-primary-50">
              + Add drug
            </button>
          </div>
          {drugs.length === 0 ? (
            <div className="py-2 text-center text-[11px] text-slate-400">No drugs added yet</div>
          ) : (
            <div className="space-y-1.5">
              {drugs.map((d, i) => (
                <div key={i} className="grid grid-cols-12 gap-1.5">
                  <input value={d.name} onChange={(e) => updDrug(i, { name: e.target.value })} placeholder="Drug" className="inp col-span-4 text-xs" />
                  <input value={d.dose} onChange={(e) => updDrug(i, { dose: e.target.value })} placeholder="Dose (175 mg/m²)" className="inp col-span-4 text-xs" />
                  <input value={d.route || ""} onChange={(e) => updDrug(i, { route: e.target.value })} placeholder="IV" className="inp col-span-1 text-xs" />
                  <input value={d.day || ""} onChange={(e) => updDrug(i, { day: e.target.value })} placeholder="D1" className="inp col-span-2 text-xs" />
                  <button onClick={() => rmDrug(i)} className="col-span-1 rounded bg-rose-50 text-[11px] text-rose-700 hover:bg-rose-100">×</button>
                </div>
              ))}
            </div>
          )}
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
// Cycle Form Modal
// ============================================================

function CycleFormModal({
  protocol, cycle, existingCount, onSave, onClose,
}: {
  protocol: ChemoProtocol;
  cycle: ChemoCycle | null;
  existingCount: number;
  onSave: (form: Partial<ChemoCycle>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    scheduledAt: cycle?.scheduledAt ? cycle.scheduledAt.slice(0, 16) : new Date().toISOString().slice(0, 16),
    cycleNumber: cycle?.cycleNumber || existingCount + 1,
    status: cycle?.status || ("scheduled" as CycleStatus),
    chair: cycle?.chair || "",
    nurse: cycle?.nurse || "",
    notes: cycle?.notes || "",
  });

  function submit() {
    onSave({
      protocolId: protocol.id,
      scheduledAt: new Date(form.scheduledAt).toISOString(),
      cycleNumber: Number(form.cycleNumber),
      status: form.status,
      chair: form.chair.trim() || undefined,
      nurse: form.nurse.trim() || undefined,
      notes: form.notes.trim() || undefined,
    });
  }

  return (
    <Modal title={cycle ? "Edit cycle" : `Schedule cycle — ${protocol.patientName}`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cycle #">
          <input type="number" min={1} value={form.cycleNumber} onChange={(e) => setForm({ ...form, cycleNumber: Number(e.target.value) })} className="inp" />
        </Field>
        <Field label="Scheduled at">
          <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} className="inp" />
        </Field>
        <Field label="Chair / bay">
          <input value={form.chair} onChange={(e) => setForm({ ...form, chair: e.target.value })} className="inp" placeholder="Bay 3" />
        </Field>
        <Field label="Nurse">
          <input value={form.nurse} onChange={(e) => setForm({ ...form, nurse: e.target.value })} className="inp" />
        </Field>
        <Field label="Status">
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as CycleStatus })} className="inp">
            {(["scheduled", "administered", "delayed", "cancelled"] as CycleStatus[]).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Notes">
        <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="inp" rows={2} />
      </Field>
      <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-3">
        <button onClick={onClose} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">Cancel</button>
        <button onClick={submit} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">Save</button>
      </div>
    </Modal>
  );
}

// ============================================================
// Record Cycle Modal
// ============================================================

function RecordCycleModal({
  protocol, cycle, onSave, onClose,
}: {
  protocol: ChemoProtocol;
  cycle: ChemoCycle;
  onSave: (form: Partial<ChemoCycle>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    anc: cycle.anc ?? ("" as number | ""),
    hemoglobin: cycle.hemoglobin ?? ("" as number | ""),
    platelets: cycle.platelets ?? ("" as number | ""),
    bpSystolic: cycle.bpSystolic ?? ("" as number | ""),
    bpDiastolic: cycle.bpDiastolic ?? ("" as number | ""),
    heartRate: cycle.heartRate ?? ("" as number | ""),
    weightKg: cycle.weightKg ?? ("" as number | ""),
    bsa: cycle.bsa ?? ("" as number | ""),
    doseReductionPct: cycle.doseReductionPct ?? 0,
    premedsGiven: cycle.premedsGiven ?? true,
    infusionStartAt: cycle.infusionStartAt ? cycle.infusionStartAt.slice(0, 16) : new Date().toISOString().slice(0, 16),
    infusionEndAt: cycle.infusionEndAt ? cycle.infusionEndAt.slice(0, 16) : "",
    notes: cycle.notes || "",
  });
  const [aes, setAes] = useState<AdverseEventEntry[]>(cycle.adverseEvents || []);

  function addAe() {
    setAes([...aes, { event: "nausea", grade: 1 }]);
  }
  function updAe(i: number, patch: Partial<AdverseEventEntry>) {
    setAes(aes.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  }
  function rmAe(i: number) {
    setAes(aes.filter((_, idx) => idx !== i));
  }

  const neutropenic = form.anc !== "" && Number(form.anc) < 1500;
  const anemic = form.hemoglobin !== "" && Number(form.hemoglobin) < 10;
  const thrombocytopenic = form.platelets !== "" && Number(form.platelets) < 100;

  function toNum(v: number | ""): number | undefined {
    if (v === "" || !Number.isFinite(Number(v))) return undefined;
    return Number(v);
  }

  function submit() {
    onSave({
      anc: toNum(form.anc),
      hemoglobin: toNum(form.hemoglobin),
      platelets: toNum(form.platelets),
      bpSystolic: toNum(form.bpSystolic),
      bpDiastolic: toNum(form.bpDiastolic),
      heartRate: toNum(form.heartRate),
      weightKg: toNum(form.weightKg),
      bsa: toNum(form.bsa),
      doseReductionPct: Number(form.doseReductionPct) || 0,
      premedsGiven: form.premedsGiven,
      infusionStartAt: form.infusionStartAt ? new Date(form.infusionStartAt).toISOString() : undefined,
      infusionEndAt: form.infusionEndAt ? new Date(form.infusionEndAt).toISOString() : undefined,
      adverseEvents: aes,
      notes: form.notes.trim() || undefined,
      drugsAdministered: protocol.drugs,
    });
  }

  return (
    <Modal title={`Record cycle C${cycle.cycleNumber} — ${protocol.patientName}`} onClose={onClose} wide>
      <div className="space-y-3">
        {/* Pre-cycle counts */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 text-xs font-semibold text-slate-700">Pre-cycle counts</div>
          <div className="grid grid-cols-3 gap-2">
            <Field label="ANC (cells/mm³)">
              <input type="number" value={form.anc} onChange={(e) => setForm({ ...form, anc: e.target.value === "" ? "" : Number(e.target.value) })} className="inp" />
            </Field>
            <Field label="Hemoglobin (g/dL)">
              <input type="number" step="0.1" value={form.hemoglobin} onChange={(e) => setForm({ ...form, hemoglobin: e.target.value === "" ? "" : Number(e.target.value) })} className="inp" />
            </Field>
            <Field label="Platelets (×10³)">
              <input type="number" value={form.platelets} onChange={(e) => setForm({ ...form, platelets: e.target.value === "" ? "" : Number(e.target.value) })} className="inp" />
            </Field>
          </div>
          {(neutropenic || anemic || thrombocytopenic) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {neutropenic && <span className="rounded bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">⚠ Neutropenic</span>}
              {anemic && <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">⚠ Anemic</span>}
              {thrombocytopenic && <span className="rounded bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">⚠ Thrombocytopenic</span>}
            </div>
          )}
        </div>

        {/* Vitals */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 text-xs font-semibold text-slate-700">Vitals & body</div>
          <div className="grid grid-cols-3 gap-2">
            <Field label="BP systolic">
              <input type="number" value={form.bpSystolic} onChange={(e) => setForm({ ...form, bpSystolic: e.target.value === "" ? "" : Number(e.target.value) })} className="inp" />
            </Field>
            <Field label="BP diastolic">
              <input type="number" value={form.bpDiastolic} onChange={(e) => setForm({ ...form, bpDiastolic: e.target.value === "" ? "" : Number(e.target.value) })} className="inp" />
            </Field>
            <Field label="Heart rate">
              <input type="number" value={form.heartRate} onChange={(e) => setForm({ ...form, heartRate: e.target.value === "" ? "" : Number(e.target.value) })} className="inp" />
            </Field>
            <Field label="Weight (kg)">
              <input type="number" step="0.1" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value === "" ? "" : Number(e.target.value) })} className="inp" />
            </Field>
            <Field label="BSA (m²)">
              <input type="number" step="0.01" value={form.bsa} onChange={(e) => setForm({ ...form, bsa: e.target.value === "" ? "" : Number(e.target.value) })} className="inp" />
            </Field>
            <Field label="Dose reduction %">
              <select value={form.doseReductionPct} onChange={(e) => setForm({ ...form, doseReductionPct: Number(e.target.value) })} className="inp">
                <option value={0}>None</option>
                <option value={25}>-25%</option>
                <option value={50}>-50%</option>
                <option value={75}>-75%</option>
              </select>
            </Field>
          </div>
        </div>

        {/* Infusion */}
        <div className="grid grid-cols-3 gap-3">
          <Field label="Infusion start">
            <input type="datetime-local" value={form.infusionStartAt} onChange={(e) => setForm({ ...form, infusionStartAt: e.target.value })} className="inp" />
          </Field>
          <Field label="Infusion end">
            <input type="datetime-local" value={form.infusionEndAt} onChange={(e) => setForm({ ...form, infusionEndAt: e.target.value })} className="inp" />
          </Field>
          <Field label="Pre-meds given">
            <select value={form.premedsGiven ? "yes" : "no"} onChange={(e) => setForm({ ...form, premedsGiven: e.target.value === "yes" })} className="inp">
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </Field>
        </div>

        {/* Adverse events */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-700">Adverse events (CTCAE v5)</div>
            <button onClick={addAe} className="rounded bg-white px-2 py-0.5 text-[11px] font-semibold text-primary-700 ring-1 ring-slate-200 hover:bg-primary-50">
              + Add AE
            </button>
          </div>
          {aes.length === 0 ? (
            <div className="py-2 text-center text-[11px] text-slate-400">No adverse events recorded</div>
          ) : (
            <div className="space-y-1.5">
              {aes.map((ae, i) => (
                <div key={i} className="grid grid-cols-12 gap-1.5">
                  <select value={ae.event} onChange={(e) => updAe(i, { event: e.target.value as AdverseEvent })} className="inp col-span-5 text-xs">
                    {AE_TYPES.map((t) => <option key={t} value={t}>{AE_LABEL[t]}</option>)}
                  </select>
                  <select value={ae.grade} onChange={(e) => updAe(i, { grade: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 })} className="inp col-span-2 text-xs">
                    <option value={1}>G1 Mild</option>
                    <option value={2}>G2 Moderate</option>
                    <option value={3}>G3 Severe</option>
                    <option value={4}>G4 Life-threat</option>
                    <option value={5}>G5 Death</option>
                  </select>
                  <input value={ae.note || ""} onChange={(e) => updAe(i, { note: e.target.value })} placeholder="Note" className="inp col-span-4 text-xs" />
                  <button onClick={() => rmAe(i)} className="col-span-1 rounded bg-rose-50 text-[11px] text-rose-700 hover:bg-rose-100">×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Field label="Cycle notes">
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="inp" rows={2} />
        </Field>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <button onClick={onClose} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">Cancel</button>
          <button onClick={submit} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            Mark administered
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================
// Helpers
// ============================================================

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: "emerald" | "amber" | "rose" }) {
  const toneClass =
    tone === "emerald" ? "text-emerald-700" :
    tone === "amber" ? "text-amber-700" :
    tone === "rose" ? "text-rose-700" : "text-slate-900";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-0.5 text-xl font-bold ${toneClass}`}>{value}</div>
    </div>
  );
}

function FilterBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-2.5 py-1 text-xs font-semibold capitalize ${
        active ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`}
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
      <div className="text-sm font-semibold text-slate-700">No chemotherapy protocols yet</div>
      <div className="mt-1 text-xs text-slate-500">Create a protocol to start scheduling cycles.</div>
    </div>
  );
}

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

function fmtDateTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
