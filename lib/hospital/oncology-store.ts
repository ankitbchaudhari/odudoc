// Oncology & Chemotherapy. Tenant-scoped.
//
// Two entities:
//   ChemoProtocol — per-patient treatment plan (diagnosis, stage, regimen
//                   template, total cycles prescribed, oncologist)
//   ChemoCycle    — each scheduled/administered cycle linked to the protocol
//                   (drugs, doses, vitals, adverse events, delays)
//
// Protocol lifecycle:
//   active -> completed        (all prescribed cycles delivered)
//          -> discontinued     (progression, toxicity, patient decision, death)
//          -> on_hold           (paused for recovery / counts)
//
// Cycle lifecycle:
//   scheduled -> administered   (drugs given, observations captured)
//             -> delayed        (rescheduled for counts/toxicity)
//             -> cancelled
//
// Adverse events use CTCAE v5 severity grading 1–5. Protocol-level
// worstToxicity rolls up from delivered cycles.
//
// On patient delete: protocols + cycles detach (retain oncology audit,
// same detach-only policy as maternity/physio/codes).

import { bindPersistentArray } from "../persistent-array";

export type ProtocolStatus = "active" | "completed" | "discontinued" | "on_hold";

export type CycleStatus = "scheduled" | "administered" | "delayed" | "cancelled";

export type CancerType =
  | "breast"
  | "lung"
  | "colorectal"
  | "prostate"
  | "lymphoma"
  | "leukemia"
  | "myeloma"
  | "ovarian"
  | "cervical"
  | "head_neck"
  | "pancreatic"
  | "liver"
  | "gastric"
  | "bladder"
  | "kidney"
  | "thyroid"
  | "sarcoma"
  | "cns"
  | "melanoma"
  | "other";

export type CancerStage = "0" | "I" | "II" | "III" | "IV" | "unknown";

export type RegimenIntent = "curative" | "adjuvant" | "neoadjuvant" | "palliative" | "maintenance";

export type DiscontinueReason =
  | "completed"
  | "progression"
  | "toxicity"
  | "patient_choice"
  | "death"
  | "lost_to_followup"
  | "switch_regimen"
  | "other";

// CTCAE-style adverse events. Not exhaustive — covers the 90% of chemo toxicities
// a hospital oncology workflow needs to capture per cycle.
export type AdverseEvent =
  | "neutropenia"
  | "anemia"
  | "thrombocytopenia"
  | "nausea"
  | "vomiting"
  | "diarrhea"
  | "constipation"
  | "mucositis"
  | "fatigue"
  | "neuropathy"
  | "hand_foot_syndrome"
  | "alopecia"
  | "rash"
  | "hypersensitivity"
  | "cardiotoxicity"
  | "hepatotoxicity"
  | "nephrotoxicity"
  | "febrile_neutropenia"
  | "other";

export interface ChemoDrug {
  name: string;              // e.g. "Paclitaxel", "Cisplatin"
  dose: string;              // e.g. "175 mg/m²"
  route?: string;            // IV / PO / SC / IT
  day?: string;              // "D1", "D1,D8,D15"
}

export interface ChemoProtocol {
  id: string;                // PRO-{suffix}-{seq}
  organizationId: string;
  patientId: string;
  patientName: string;
  oncologist?: string;
  diagnosis: string;
  cancerType: CancerType;
  stage: CancerStage;
  regimenName: string;       // "FOLFOX", "AC-T", "CHOP", etc.
  regimenIntent: RegimenIntent;
  drugs: ChemoDrug[];
  cyclesPrescribed: number;
  cycleLengthDays: number;   // 14, 21, 28 typical
  startedAt: string;         // ISO
  expectedEndAt?: string;
  status: ProtocolStatus;
  endedAt?: string;
  endReason?: DiscontinueReason;
  endNote?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdverseEventEntry {
  event: AdverseEvent;
  grade: 1 | 2 | 3 | 4 | 5;  // CTCAE v5
  note?: string;
}

export interface ChemoCycle {
  id: string;                // CYC-{suffix}-{seq}
  organizationId: string;
  protocolId: string;
  cycleNumber: number;       // 1..cyclesPrescribed
  scheduledAt: string;
  administeredAt?: string;
  status: CycleStatus;
  // Pre-cycle counts
  anc?: number;              // absolute neutrophil count (cells/mm³)
  hemoglobin?: number;       // g/dL
  platelets?: number;        // ×10³/µL
  // Vitals at infusion start
  bpSystolic?: number;
  bpDiastolic?: number;
  heartRate?: number;
  weightKg?: number;
  heightCm?: number;         // for BSA
  bsa?: number;              // m² — usually stored once from protocol but kept per cycle in case of weight change
  // Administration
  chair?: string;            // infusion chair/bay
  nurse?: string;
  premedsGiven?: boolean;
  drugsAdministered?: ChemoDrug[];  // snapshot with any dose reductions applied
  doseReductionPct?: number;        // 0,25,50,75
  infusionStartAt?: string;
  infusionEndAt?: string;
  // Adverse events observed during/after this cycle
  adverseEvents?: AdverseEventEntry[];
  // Delay / cancel metadata
  delayedToDate?: string;
  delayReason?: string;
  cancelReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const CANCER_LABEL: Record<CancerType, string> = {
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

export const AE_LABEL: Record<AdverseEvent, string> = {
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

export const INTENT_LABEL: Record<RegimenIntent, string> = {
  curative: "Curative",
  adjuvant: "Adjuvant",
  neoadjuvant: "Neoadjuvant",
  palliative: "Palliative",
  maintenance: "Maintenance",
};

export type OncologyStats = ReturnType<typeof computeStats>;

const protocols: ChemoProtocol[] = [];
const cycles: ChemoCycle[] = [];

const hydrate = Promise.all([
  bindPersistentArray<ChemoProtocol>("oncology-protocols", protocols, () => []),
  bindPersistentArray<ChemoCycle>("oncology-cycles", cycles, () => []),
]);
await hydrate;

function orgSuffix(orgId: string): string {
  return orgId.slice(0, 4).toUpperCase();
}

function nextProtocolId(orgId: string): string {
  const suffix = orgSuffix(orgId);
  const prefix = `PRO-${suffix}-`;
  const maxSeq = protocols
    .filter((p) => p.id.startsWith(prefix))
    .reduce((m, p) => Math.max(m, Number(p.id.slice(prefix.length)) || 0), 0);
  return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
}

function nextCycleId(orgId: string): string {
  const suffix = orgSuffix(orgId);
  const prefix = `CYC-${suffix}-`;
  const maxSeq = cycles
    .filter((c) => c.id.startsWith(prefix))
    .reduce((m, c) => Math.max(m, Number(c.id.slice(prefix.length)) || 0), 0);
  return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
}

// ---------- Protocols ----------

export function listProtocols(opts: {
  organizationId: string;
  status?: ProtocolStatus;
  patientId?: string;
  oncologist?: string;
  cancerType?: CancerType;
}): ChemoProtocol[] {
  return protocols
    .filter((p) => p.organizationId === opts.organizationId)
    .filter((p) => (opts.status ? p.status === opts.status : true))
    .filter((p) => (opts.patientId ? p.patientId === opts.patientId : true))
    .filter((p) => (opts.oncologist ? p.oncologist === opts.oncologist : true))
    .filter((p) => (opts.cancerType ? p.cancerType === opts.cancerType : true))
    .sort((a, b) => (b.startedAt || "").localeCompare(a.startedAt || ""));
}

export function getProtocol(id: string, orgId: string): ChemoProtocol | null {
  return protocols.find((p) => p.id === id && p.organizationId === orgId) || null;
}

export function createProtocol(
  orgId: string,
  input: Partial<ChemoProtocol>
): { ok: true; protocol: ChemoProtocol } | { ok: false; error: string } {
  if (!input.patientId || !input.patientName) return { ok: false, error: "missing_patient" };
  if (!input.diagnosis || !input.regimenName) return { ok: false, error: "missing_required" };
  if (!input.cyclesPrescribed || input.cyclesPrescribed < 1) return { ok: false, error: "invalid_cycles" };
  const now = new Date().toISOString();
  const startedAt = input.startedAt || now;
  const cycleLengthDays = input.cycleLengthDays || 21;
  const expectedEndAt =
    input.expectedEndAt ||
    new Date(
      new Date(startedAt).getTime() + input.cyclesPrescribed * cycleLengthDays * 86_400_000
    ).toISOString();
  const protocol: ChemoProtocol = {
    id: nextProtocolId(orgId),
    organizationId: orgId,
    patientId: input.patientId,
    patientName: input.patientName,
    oncologist: input.oncologist,
    diagnosis: input.diagnosis,
    cancerType: (input.cancerType as CancerType) || "other",
    stage: (input.stage as CancerStage) || "unknown",
    regimenName: input.regimenName,
    regimenIntent: (input.regimenIntent as RegimenIntent) || "curative",
    drugs: input.drugs || [],
    cyclesPrescribed: input.cyclesPrescribed,
    cycleLengthDays,
    startedAt,
    expectedEndAt,
    status: "active",
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };
  protocols.push(protocol);
  return { ok: true, protocol };
}

export function updateProtocol(
  id: string,
  orgId: string,
  patch: Partial<ChemoProtocol>
): ChemoProtocol | null {
  const i = protocols.findIndex((p) => p.id === id && p.organizationId === orgId);
  if (i < 0) return null;
  const now = new Date().toISOString();
  const prev = protocols[i];
  const next: ChemoProtocol = {
    ...prev,
    ...patch,
    id: prev.id,
    organizationId: prev.organizationId,
    updatedAt: now,
  };
  // Stamp endedAt when transitioning to terminal state
  if (
    (next.status === "completed" || next.status === "discontinued") &&
    prev.status !== next.status &&
    !next.endedAt
  ) {
    next.endedAt = now;
  }
  if (next.status === "active" || next.status === "on_hold") {
    // reopening: clear ended stamp
    if (prev.status === "completed" || prev.status === "discontinued") {
      next.endedAt = undefined;
      next.endReason = undefined;
    }
  }
  protocols[i] = next;
  return next;
}

export function deleteProtocol(id: string, orgId: string): boolean {
  const i = protocols.findIndex((p) => p.id === id && p.organizationId === orgId);
  if (i < 0) return false;
  // Cascade: remove all cycles belonging to this protocol
  for (let j = cycles.length - 1; j >= 0; j--) {
    if (cycles[j].protocolId === id && cycles[j].organizationId === orgId) {
      cycles.splice(j, 1);
    }
  }
  protocols.splice(i, 1);
  return true;
}

// ---------- Cycles ----------

export function listCycles(opts: {
  organizationId: string;
  protocolId?: string;
  status?: CycleStatus;
  from?: string;
  to?: string;
}): ChemoCycle[] {
  return cycles
    .filter((c) => c.organizationId === opts.organizationId)
    .filter((c) => (opts.protocolId ? c.protocolId === opts.protocolId : true))
    .filter((c) => (opts.status ? c.status === opts.status : true))
    .filter((c) => (opts.from ? c.scheduledAt >= opts.from : true))
    .filter((c) => (opts.to ? c.scheduledAt <= opts.to : true))
    .sort((a, b) => (a.scheduledAt || "").localeCompare(b.scheduledAt || ""));
}

export function createCycle(
  orgId: string,
  input: Partial<ChemoCycle>
): { ok: true; cycle: ChemoCycle } | { ok: false; error: string } {
  if (!input.protocolId) return { ok: false, error: "missing_protocol" };
  const protocol = protocols.find((p) => p.id === input.protocolId && p.organizationId === orgId);
  if (!protocol) return { ok: false, error: "protocol_not_found" };
  if (!input.scheduledAt) return { ok: false, error: "missing_schedule" };
  const existing = cycles.filter(
    (c) => c.protocolId === input.protocolId && c.organizationId === orgId
  );
  const cycleNumber = input.cycleNumber || existing.length + 1;
  const now = new Date().toISOString();
  const cycle: ChemoCycle = {
    id: nextCycleId(orgId),
    organizationId: orgId,
    protocolId: input.protocolId,
    cycleNumber,
    scheduledAt: input.scheduledAt,
    status: (input.status as CycleStatus) || "scheduled",
    chair: input.chair,
    nurse: input.nurse,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };
  cycles.push(cycle);
  return { ok: true, cycle };
}

export function updateCycle(
  id: string,
  orgId: string,
  patch: Partial<ChemoCycle>
): ChemoCycle | null {
  const i = cycles.findIndex((c) => c.id === id && c.organizationId === orgId);
  if (i < 0) return null;
  const now = new Date().toISOString();
  const prev = cycles[i];
  const next: ChemoCycle = {
    ...prev,
    ...patch,
    id: prev.id,
    organizationId: prev.organizationId,
    protocolId: prev.protocolId,
    updatedAt: now,
  };
  if (next.status === "administered" && !next.administeredAt) {
    next.administeredAt = now;
  }
  cycles[i] = next;
  return next;
}

export function deleteCycle(id: string, orgId: string): boolean {
  const i = cycles.findIndex((c) => c.id === id && c.organizationId === orgId);
  if (i < 0) return false;
  cycles.splice(i, 1);
  return true;
}

// ---------- Derived / Stats ----------

export function protocolProgress(protocol: ChemoProtocol): {
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

export function computeStats(orgId: string): {
  activeProtocols: number;
  cyclesToday: number;
  cyclesMonth: number;
  administeredMonth: number;
  delayedMonth: number;
  highToxicityActive: number;   // active protocols with any grade >= 3 AE
  avgDelayRate: number;         // % of cycles delayed in last 90d
  completedMonth: number;       // protocols completed this month
} {
  const my = protocols.filter((p) => p.organizationId === orgId);
  const myCycles = cycles.filter((c) => c.organizationId === orgId);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const ninetyAgo = new Date(now.getTime() - 90 * 86_400_000).toISOString();

  const cyclesToday = myCycles.filter((c) => c.scheduledAt >= todayStart).length;
  const cyclesMonth = myCycles.filter((c) => c.scheduledAt >= monthStart).length;
  const administeredMonth = myCycles.filter(
    (c) => c.status === "administered" && (c.administeredAt || "") >= monthStart
  ).length;
  const delayedMonth = myCycles.filter(
    (c) => c.status === "delayed" && c.scheduledAt >= monthStart
  ).length;

  const highToxicityActive = my.filter((p) => {
    if (p.status !== "active") return false;
    const { worstToxicity } = protocolProgress(p);
    return worstToxicity >= 3;
  }).length;

  const recent = myCycles.filter((c) => c.scheduledAt >= ninetyAgo);
  const recentDelayed = recent.filter((c) => c.status === "delayed").length;
  const avgDelayRate = recent.length > 0 ? Math.round((recentDelayed / recent.length) * 100) : 0;

  const completedMonth = my.filter(
    (p) => p.status === "completed" && (p.endedAt || "") >= monthStart
  ).length;

  return {
    activeProtocols: my.filter((p) => p.status === "active").length,
    cyclesToday,
    cyclesMonth,
    administeredMonth,
    delayedMonth,
    highToxicityActive,
    avgDelayRate,
    completedMonth,
  };
}

// Patient cascade (detach-only; oncology record survives patient removal)
export function unlinkOncologyForPatient(patientId: string, orgId: string): void {
  for (const p of protocols) {
    if (p.organizationId === orgId && p.patientId === patientId) {
      p.patientId = "";
      p.patientName = `[removed] ${p.patientName}`;
      p.updatedAt = new Date().toISOString();
    }
  }
  // flush:auto-unlink
  protocols.splice(protocols.length, 0);
}
