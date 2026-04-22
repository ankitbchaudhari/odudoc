// Orthopedics. Tenant-scoped. OrthoCase (complaint/injury/post-op) + FractureRecord.
// Detach-only cascade.

import { bindPersistentArray } from "../persistent-array";

export type CaseType = "trauma" | "degenerative" | "inflammatory" | "sports" | "pediatric" | "spine" | "post_op" | "other";
export type CaseStatus = "open" | "in_treatment" | "post_op" | "rehab" | "closed" | "referred";
export type BodySide = "left" | "right" | "bilateral" | "midline" | "na";
export type Region = "cervical" | "thoracic" | "lumbar" | "shoulder" | "elbow" | "wrist_hand" | "hip" | "knee" | "ankle_foot" | "pelvis" | "other";
export type FractureType = "closed" | "open" | "comminuted" | "greenstick" | "spiral" | "transverse" | "oblique" | "impacted" | "pathological" | "stress";
export type FractureStatus = "acute" | "reduced" | "immobilized" | "post_op" | "healing" | "healed" | "nonunion" | "malunion";
export type ImmobilizationType = "cast" | "splint" | "brace" | "sling" | "traction" | "external_fixator" | "internal_fixation" | "none";

export interface RomReading {
  joint: string;                   // e.g. "right knee"
  flexionDeg?: number;
  extensionDeg?: number;
  abductionDeg?: number;
  adductionDeg?: number;
  internalRotDeg?: number;
  externalRotDeg?: number;
}

export interface OrthoCase {
  id: string;                      // ORT-{suffix}-{seq}
  organizationId: string;
  patientId: string;
  patientName: string;
  providerName: string;
  visitDate: string;
  caseType: CaseType;
  status: CaseStatus;
  region: Region;
  side: BodySide;
  chiefComplaint?: string;
  mechanism?: string;              // MOI e.g. RTA, fall
  historyNote?: string;
  // Exam
  inspection?: string;
  palpation?: string;
  swellingDeformity?: string;
  neurovascular?: string;          // distal pulses, sensation, motor
  specialTests?: string;           // Lachman, McMurray, drawer, etc
  rom?: RomReading[];
  painScoreNrs?: number;           // 0-10
  weightBearing?: string;          // NWB/PWB/TDWB/FWB
  gaitNote?: string;
  // Imaging / diag
  imagingModality?: string;        // X-ray / MRI / CT / US
  imagingNote?: string;
  impression?: string;             // diagnosis
  plan?: string;
  surgeryBookingRef?: string;
  rehabPlan?: string;
  nextReviewDate?: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

export interface FractureRecord {
  id: string;                      // FX-{suffix}-{seq}
  organizationId: string;
  patientId: string;
  patientName: string;
  caseId?: string;                 // optional link to OrthoCase
  providerName: string;
  diagnosedAt: string;
  bone: string;                    // e.g. "distal radius", "tibial shaft"
  side: BodySide;
  fractureType: FractureType;
  aoClassification?: string;       // AO/OTA e.g. 23-A2
  gustiloGrade?: string;           // I / II / III-A/B/C (open fractures)
  reductionMethod?: string;        // closed / ORIF / MIPO
  immobilization: ImmobilizationType;
  status: FractureStatus;
  castRemovalDate?: string;
  unionExpectedDate?: string;
  complications?: string;          // malunion, nonunion, CRPS, infection
  notes?: string;
  createdAt: string;
  updatedAt: string;
  healedAt?: string;
}

const cases: OrthoCase[] = [];
const fractures: FractureRecord[] = [];
const hCases = bindPersistentArray<OrthoCase>("ortho-cases", cases, () => []);
const hFx = bindPersistentArray<FractureRecord>("ortho-fractures", fractures, () => []);
await hCases;
await hFx;

export const CASE_TYPE_LABEL: Record<CaseType, string> = {
  trauma: "Trauma", degenerative: "Degenerative", inflammatory: "Inflammatory",
  sports: "Sports", pediatric: "Pediatric", spine: "Spine", post_op: "Post-op", other: "Other",
};
export const CASE_STATUS_LABEL: Record<CaseStatus, string> = {
  open: "Open", in_treatment: "In treatment", post_op: "Post-op", rehab: "Rehab", closed: "Closed", referred: "Referred",
};
export const REGION_LABEL: Record<Region, string> = {
  cervical: "Cervical", thoracic: "Thoracic", lumbar: "Lumbar",
  shoulder: "Shoulder", elbow: "Elbow", wrist_hand: "Wrist/hand",
  hip: "Hip", knee: "Knee", ankle_foot: "Ankle/foot", pelvis: "Pelvis", other: "Other",
};
export const FX_TYPE_LABEL: Record<FractureType, string> = {
  closed: "Closed", open: "Open", comminuted: "Comminuted", greenstick: "Greenstick",
  spiral: "Spiral", transverse: "Transverse", oblique: "Oblique", impacted: "Impacted",
  pathological: "Pathological", stress: "Stress",
};
export const FX_STATUS_LABEL: Record<FractureStatus, string> = {
  acute: "Acute", reduced: "Reduced", immobilized: "Immobilized", post_op: "Post-op",
  healing: "Healing", healed: "Healed", nonunion: "Nonunion", malunion: "Malunion",
};
export const IMMOB_LABEL: Record<ImmobilizationType, string> = {
  cast: "Cast", splint: "Splint", brace: "Brace", sling: "Sling", traction: "Traction",
  external_fixator: "External fixator", internal_fixation: "Internal fixation", none: "None",
};
export const SIDE_LABEL: Record<BodySide, string> = {
  left: "Left", right: "Right", bilateral: "Bilateral", midline: "Midline", na: "N/A",
};

function suf(o: string) { return o.slice(0, 4).toUpperCase(); }
function nextCaseId(o: string) {
  const p = `ORT-${suf(o)}-`;
  const m = cases.filter((r) => r.id.startsWith(p)).reduce((mx, r) => Math.max(mx, Number(r.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}
function nextFxId(o: string) {
  const p = `FX-${suf(o)}-`;
  const m = fractures.filter((r) => r.id.startsWith(p)).reduce((mx, r) => Math.max(mx, Number(r.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}

// Cases
export function listCases(opts: { organizationId: string; status?: CaseStatus; region?: Region; caseType?: CaseType; patientId?: string }): OrthoCase[] {
  return cases.filter((r) => r.organizationId === opts.organizationId)
    .filter((r) => (opts.status ? r.status === opts.status : true))
    .filter((r) => (opts.region ? r.region === opts.region : true))
    .filter((r) => (opts.caseType ? r.caseType === opts.caseType : true))
    .filter((r) => (opts.patientId ? r.patientId === opts.patientId : true))
    .sort((a, b) => b.visitDate.localeCompare(a.visitDate));
}
export function createCase(orgId: string, input: Partial<OrthoCase>): { ok: true; record: OrthoCase } | { ok: false; error: string } {
  if (!input.patientId || !input.patientName || !input.providerName) return { ok: false, error: "missing_required" };
  const now = new Date().toISOString();
  const r: OrthoCase = {
    id: nextCaseId(orgId), organizationId: orgId,
    patientId: input.patientId, patientName: input.patientName,
    providerName: input.providerName,
    visitDate: input.visitDate || now,
    caseType: (input.caseType || "trauma") as CaseType,
    status: (input.status || "open") as CaseStatus,
    region: (input.region || "other") as Region,
    side: (input.side || "na") as BodySide,
    chiefComplaint: input.chiefComplaint,
    mechanism: input.mechanism,
    historyNote: input.historyNote,
    inspection: input.inspection,
    palpation: input.palpation,
    swellingDeformity: input.swellingDeformity,
    neurovascular: input.neurovascular,
    specialTests: input.specialTests,
    rom: input.rom || [],
    painScoreNrs: input.painScoreNrs,
    weightBearing: input.weightBearing,
    gaitNote: input.gaitNote,
    imagingModality: input.imagingModality,
    imagingNote: input.imagingNote,
    impression: input.impression,
    plan: input.plan,
    surgeryBookingRef: input.surgeryBookingRef,
    rehabPlan: input.rehabPlan,
    nextReviewDate: input.nextReviewDate,
    createdAt: now, updatedAt: now,
  };
  cases.push(r);
  return { ok: true, record: r };
}
export function updateCase(id: string, orgId: string, patch: Partial<OrthoCase>): OrthoCase | null {
  const i = cases.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return null;
  const prev = cases[i];
  const now = new Date().toISOString();
  const next: OrthoCase = { ...prev, ...patch, id: prev.id, organizationId: prev.organizationId, updatedAt: now };
  if (next.status === "closed" && prev.status !== "closed" && !next.closedAt) next.closedAt = now;
  cases[i] = next;
  return next;
}
export function deleteCase(id: string, orgId: string): boolean {
  const i = cases.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return false;
  cases.splice(i, 1);
  return true;
}

// Fractures
export function listFractures(opts: { organizationId: string; status?: FractureStatus; patientId?: string }): FractureRecord[] {
  return fractures.filter((r) => r.organizationId === opts.organizationId)
    .filter((r) => (opts.status ? r.status === opts.status : true))
    .filter((r) => (opts.patientId ? r.patientId === opts.patientId : true))
    .sort((a, b) => b.diagnosedAt.localeCompare(a.diagnosedAt));
}
export function createFracture(orgId: string, input: Partial<FractureRecord>): { ok: true; record: FractureRecord } | { ok: false; error: string } {
  if (!input.patientId || !input.patientName || !input.providerName || !input.bone) return { ok: false, error: "missing_required" };
  const now = new Date().toISOString();
  const r: FractureRecord = {
    id: nextFxId(orgId), organizationId: orgId,
    patientId: input.patientId, patientName: input.patientName,
    caseId: input.caseId,
    providerName: input.providerName,
    diagnosedAt: input.diagnosedAt || now,
    bone: input.bone,
    side: (input.side || "na") as BodySide,
    fractureType: (input.fractureType || "closed") as FractureType,
    aoClassification: input.aoClassification,
    gustiloGrade: input.gustiloGrade,
    reductionMethod: input.reductionMethod,
    immobilization: (input.immobilization || "cast") as ImmobilizationType,
    status: (input.status || "acute") as FractureStatus,
    castRemovalDate: input.castRemovalDate,
    unionExpectedDate: input.unionExpectedDate,
    complications: input.complications,
    notes: input.notes,
    createdAt: now, updatedAt: now,
  };
  fractures.push(r);
  return { ok: true, record: r };
}
export function updateFracture(id: string, orgId: string, patch: Partial<FractureRecord>): FractureRecord | null {
  const i = fractures.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return null;
  const prev = fractures[i];
  const now = new Date().toISOString();
  const next: FractureRecord = { ...prev, ...patch, id: prev.id, organizationId: prev.organizationId, updatedAt: now };
  if (next.status === "healed" && prev.status !== "healed" && !next.healedAt) next.healedAt = now;
  fractures[i] = next;
  return next;
}
export function deleteFracture(id: string, orgId: string): boolean {
  const i = fractures.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return false;
  fractures.splice(i, 1);
  return true;
}

export function computeStats(orgId: string) {
  const myC = cases.filter((r) => r.organizationId === orgId);
  const myF = fractures.filter((r) => r.organizationId === orgId);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const weekStart = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  return {
    openCases: myC.filter((r) => r.status === "open").length,
    inTreatment: myC.filter((r) => r.status === "in_treatment").length,
    postOp: myC.filter((r) => r.status === "post_op").length,
    rehab: myC.filter((r) => r.status === "rehab").length,
    newCasesWeek: myC.filter((r) => r.createdAt >= weekStart).length,
    acuteFractures: myF.filter((r) => r.status === "acute" || r.status === "reduced").length,
    openFractures: myF.filter((r) => r.fractureType === "open").length,
    nonunion: myF.filter((r) => r.status === "nonunion").length,
    healedMonth: myF.filter((r) => r.status === "healed" && (r.healedAt || "") >= monthStart).length,
  };
}

export function unlinkOrthoForPatient(patientId: string, orgId: string): void {
  const stamp = new Date().toISOString();
  for (const r of cases) {
    if (r.organizationId === orgId && r.patientId === patientId) {
      r.patientId = "";
      r.patientName = `[removed] ${r.patientName}`;
      r.updatedAt = stamp;
    }
  }
  for (const r of fractures) {
    if (r.organizationId === orgId && r.patientId === patientId) {
      r.patientId = "";
      r.patientName = `[removed] ${r.patientName}`;
      r.updatedAt = stamp;
    }
  }
  // flush:auto-unlink
  cases.splice(cases.length, 0);
}
