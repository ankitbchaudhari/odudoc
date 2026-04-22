// Wound Care Management. Tenant-scoped.
//
// Two entities:
//   WoundRecord     — a single wound on a patient (location, etiology, stage)
//   WoundAssessment — serial reassessments (dimensions, exudate, treatment)
//
// Wound lifecycle:
//   open -> healed              (closed, re-epithelialized)
//        -> deteriorated        (worsened beyond original stage — flag only)
//        -> closed_other        (amputation, transfer, death)
//
// Assessments compute area cm² (L×W) and volume cm³ (L×W×D). Delta from
// baseline assessment powers the healing-trajectory chart.
//
// On patient delete: detach-only (wounds retained for audit / litigation).

import { bindPersistentArray } from "../persistent-array";

export type WoundStatus = "open" | "healed" | "deteriorated" | "closed_other";

export type WoundEtiology =
  | "pressure"        // pressure injury / decubitus
  | "diabetic"        // diabetic foot ulcer
  | "venous"          // venous leg ulcer
  | "arterial"        // arterial / ischemic ulcer
  | "surgical"        // surgical wound / dehiscence
  | "traumatic"
  | "burn"
  | "skin_tear"
  | "malignant"
  | "other";

// Pressure injury staging + other stage-like descriptors
export type WoundStage =
  | "stage_1"
  | "stage_2"
  | "stage_3"
  | "stage_4"
  | "unstageable"
  | "dti"             // deep tissue injury
  | "superficial"
  | "partial"
  | "full_thickness"
  | "na";

export type WoundLocation =
  | "sacrum"
  | "coccyx"
  | "heel_left"
  | "heel_right"
  | "ischium_left"
  | "ischium_right"
  | "trochanter_left"
  | "trochanter_right"
  | "occiput"
  | "elbow_left"
  | "elbow_right"
  | "ankle_left"
  | "ankle_right"
  | "foot_left"
  | "foot_right"
  | "leg_left"
  | "leg_right"
  | "abdomen"
  | "chest"
  | "back"
  | "arm_left"
  | "arm_right"
  | "other";

export type ExudateAmount = "none" | "scant" | "small" | "moderate" | "large" | "copious";

export type ExudateType = "serous" | "serosanguinous" | "sanguinous" | "purulent" | "none";

export type TissueType =
  | "epithelial"      // pink — healing
  | "granulation"     // red — healing
  | "slough"          // yellow — non-viable
  | "eschar"          // black — necrotic
  | "muscle"
  | "tendon"
  | "bone";

export type InfectionSigns =
  | "none"
  | "suspected"
  | "local"
  | "systemic";

export type PeriwoundCondition =
  | "intact"
  | "erythema"
  | "macerated"
  | "dry"
  | "fragile"
  | "indurated";

export interface WoundRecord {
  id: string;                // WND-{suffix}-{seq}
  organizationId: string;
  patientId: string;
  patientName: string;
  location: WoundLocation;
  locationNote?: string;      // e.g. "5cm lateral to midline"
  etiology: WoundEtiology;
  stage: WoundStage;
  firstNotedAt: string;       // when wound appeared / was noted
  presentOnAdmission: boolean;
  cliniciansNote?: string;
  status: WoundStatus;
  closedAt?: string;
  closeReason?: string;
  primaryCareTeam?: string;   // nurse/wound team lead
  createdAt: string;
  updatedAt: string;
}

export interface WoundAssessment {
  id: string;                 // WA-{suffix}-{seq}
  organizationId: string;
  woundId: string;
  assessedAt: string;
  assessor?: string;
  // Dimensions in cm
  lengthCm?: number;
  widthCm?: number;
  depthCm?: number;
  undermining?: string;        // "2cm @ 3 o'clock"
  tunneling?: string;
  // Wound bed
  tissueTypes: TissueType[];
  granulationPct?: number;     // 0-100
  sloughPct?: number;
  escharPct?: number;
  // Exudate
  exudateAmount: ExudateAmount;
  exudateType: ExudateType;
  odor: boolean;
  // Peri-wound
  periwound: PeriwoundCondition;
  // Infection
  infection: InfectionSigns;
  // Pain
  painScore?: number;          // 0-10
  // Treatment this visit
  cleansed?: string;           // saline, etc.
  debridement?: string;        // none / sharp / autolytic / enzymatic / mechanical
  primaryDressing?: string;    // foam / alginate / hydrocolloid / etc.
  secondaryDressing?: string;
  dressingChangeFrequency?: string;  // "daily", "q2d"
  // Stage as of this assessment (may change)
  currentStage?: WoundStage;
  notes?: string;
  createdAt: string;
}

const wounds: WoundRecord[] = [];
const assessments: WoundAssessment[] = [];

export const ETIOLOGY_LABEL: Record<WoundEtiology, string> = {
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

export const STAGE_LABEL: Record<WoundStage, string> = {
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

export const LOCATION_LABEL: Record<WoundLocation, string> = {
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

export const TISSUE_LABEL: Record<TissueType, string> = {
  epithelial: "Epithelial",
  granulation: "Granulation",
  slough: "Slough",
  eschar: "Eschar",
  muscle: "Muscle",
  tendon: "Tendon",
  bone: "Bone",
};

const hydrate = Promise.all([
  bindPersistentArray<WoundRecord>("wound-records", wounds, () => []),
  bindPersistentArray<WoundAssessment>("wound-assessments", assessments, () => []),
]);
await hydrate;

export type WoundStats = ReturnType<typeof computeStats>;

function orgSuffix(orgId: string): string {
  return orgId.slice(0, 4).toUpperCase();
}

function nextWoundId(orgId: string): string {
  const prefix = `WND-${orgSuffix(orgId)}-`;
  const maxSeq = wounds
    .filter((w) => w.id.startsWith(prefix))
    .reduce((m, w) => Math.max(m, Number(w.id.slice(prefix.length)) || 0), 0);
  return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
}

function nextAssessmentId(orgId: string): string {
  const prefix = `WA-${orgSuffix(orgId)}-`;
  const maxSeq = assessments
    .filter((a) => a.id.startsWith(prefix))
    .reduce((m, a) => Math.max(m, Number(a.id.slice(prefix.length)) || 0), 0);
  return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
}

// ---------- Wounds ----------

export function listWounds(opts: {
  organizationId: string;
  status?: WoundStatus;
  patientId?: string;
  etiology?: WoundEtiology;
}): WoundRecord[] {
  return wounds
    .filter((w) => w.organizationId === opts.organizationId)
    .filter((w) => (opts.status ? w.status === opts.status : true))
    .filter((w) => (opts.patientId ? w.patientId === opts.patientId : true))
    .filter((w) => (opts.etiology ? w.etiology === opts.etiology : true))
    .sort((a, b) => (b.firstNotedAt || "").localeCompare(a.firstNotedAt || ""));
}

export function createWound(
  orgId: string,
  input: Partial<WoundRecord>
): { ok: true; wound: WoundRecord } | { ok: false; error: string } {
  if (!input.patientId || !input.patientName) return { ok: false, error: "missing_patient" };
  if (!input.location || !input.etiology) return { ok: false, error: "missing_required" };
  const now = new Date().toISOString();
  const wound: WoundRecord = {
    id: nextWoundId(orgId),
    organizationId: orgId,
    patientId: input.patientId,
    patientName: input.patientName,
    location: input.location as WoundLocation,
    locationNote: input.locationNote,
    etiology: input.etiology as WoundEtiology,
    stage: (input.stage as WoundStage) || "na",
    firstNotedAt: input.firstNotedAt || now,
    presentOnAdmission: !!input.presentOnAdmission,
    cliniciansNote: input.cliniciansNote,
    status: "open",
    primaryCareTeam: input.primaryCareTeam,
    createdAt: now,
    updatedAt: now,
  };
  wounds.push(wound);
  return { ok: true, wound };
}

export function updateWound(id: string, orgId: string, patch: Partial<WoundRecord>): WoundRecord | null {
  const i = wounds.findIndex((w) => w.id === id && w.organizationId === orgId);
  if (i < 0) return null;
  const now = new Date().toISOString();
  const prev = wounds[i];
  const next: WoundRecord = {
    ...prev,
    ...patch,
    id: prev.id,
    organizationId: prev.organizationId,
    updatedAt: now,
  };
  const terminal: WoundStatus[] = ["healed", "deteriorated", "closed_other"];
  if (terminal.includes(next.status) && !terminal.includes(prev.status) && !next.closedAt) {
    next.closedAt = now;
  }
  if (next.status === "open" && terminal.includes(prev.status)) {
    next.closedAt = undefined;
    next.closeReason = undefined;
  }
  wounds[i] = next;
  return next;
}

export function deleteWound(id: string, orgId: string): boolean {
  const i = wounds.findIndex((w) => w.id === id && w.organizationId === orgId);
  if (i < 0) return false;
  for (let j = assessments.length - 1; j >= 0; j--) {
    if (assessments[j].woundId === id && assessments[j].organizationId === orgId) {
      assessments.splice(j, 1);
    }
  }
  wounds.splice(i, 1);
  return true;
}

// ---------- Assessments ----------

export function listAssessments(opts: {
  organizationId: string;
  woundId?: string;
}): WoundAssessment[] {
  return assessments
    .filter((a) => a.organizationId === opts.organizationId)
    .filter((a) => (opts.woundId ? a.woundId === opts.woundId : true))
    .sort((a, b) => (b.assessedAt || "").localeCompare(a.assessedAt || ""));
}

export function createAssessment(
  orgId: string,
  input: Partial<WoundAssessment>
): { ok: true; assessment: WoundAssessment } | { ok: false; error: string } {
  if (!input.woundId) return { ok: false, error: "missing_wound" };
  const wound = wounds.find((w) => w.id === input.woundId && w.organizationId === orgId);
  if (!wound) return { ok: false, error: "wound_not_found" };
  const now = new Date().toISOString();
  const assessment: WoundAssessment = {
    id: nextAssessmentId(orgId),
    organizationId: orgId,
    woundId: input.woundId,
    assessedAt: input.assessedAt || now,
    assessor: input.assessor,
    lengthCm: input.lengthCm,
    widthCm: input.widthCm,
    depthCm: input.depthCm,
    undermining: input.undermining,
    tunneling: input.tunneling,
    tissueTypes: input.tissueTypes || [],
    granulationPct: input.granulationPct,
    sloughPct: input.sloughPct,
    escharPct: input.escharPct,
    exudateAmount: (input.exudateAmount as ExudateAmount) || "none",
    exudateType: (input.exudateType as ExudateType) || "none",
    odor: !!input.odor,
    periwound: (input.periwound as PeriwoundCondition) || "intact",
    infection: (input.infection as InfectionSigns) || "none",
    painScore: input.painScore,
    cleansed: input.cleansed,
    debridement: input.debridement,
    primaryDressing: input.primaryDressing,
    secondaryDressing: input.secondaryDressing,
    dressingChangeFrequency: input.dressingChangeFrequency,
    currentStage: input.currentStage,
    notes: input.notes,
    createdAt: now,
  };
  assessments.push(assessment);
  // If stage changed on the assessment, mirror onto the wound record
  if (input.currentStage && input.currentStage !== wound.stage) {
    wound.stage = input.currentStage;
    wound.updatedAt = now;
  }
  return { ok: true, assessment };
}

export function updateAssessment(
  id: string,
  orgId: string,
  patch: Partial<WoundAssessment>
): WoundAssessment | null {
  const i = assessments.findIndex((a) => a.id === id && a.organizationId === orgId);
  if (i < 0) return null;
  const prev = assessments[i];
  assessments.splice(i, 1, {
    ...prev,
    ...patch,
    id: prev.id,
    organizationId: prev.organizationId,
    woundId: prev.woundId,
  });
  return assessments[i];
}

export function deleteAssessment(id: string, orgId: string): boolean {
  const i = assessments.findIndex((a) => a.id === id && a.organizationId === orgId);
  if (i < 0) return false;
  assessments.splice(i, 1);
  return true;
}

// ---------- Derived ----------

export function assessmentArea(a: WoundAssessment): number | null {
  if (a.lengthCm == null || a.widthCm == null) return null;
  return Math.round(a.lengthCm * a.widthCm * 100) / 100;
}

export function woundTrajectory(wound: WoundRecord): {
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

export function computeStats(orgId: string): {
  openWounds: number;
  pressureInjuries: number;
  infectedActive: number;          // open wounds with last assessment infection local/systemic
  stageIiiIvActive: number;        // open pressure stage 3/4/unstageable
  assessmentsToday: number;
  assessmentsMonth: number;
  healedMonth: number;
  overdueReassessment: number;     // open wounds with no assessment in >7 days
  avgTimeToHealDays: number;       // mean days for wounds healed in last 90d
} {
  const my = wounds.filter((w) => w.organizationId === orgId);
  const openList = my.filter((w) => w.status === "open");
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const ninetyAgo = new Date(now.getTime() - 90 * 86_400_000).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();

  const myAssessments = assessments.filter((a) => a.organizationId === orgId);
  const assessmentsToday = myAssessments.filter((a) => a.assessedAt >= todayStart).length;
  const assessmentsMonth = myAssessments.filter((a) => a.assessedAt >= monthStart).length;

  let infectedActive = 0;
  let overdueReassessment = 0;
  for (const w of openList) {
    const t = woundTrajectory(w);
    if (t.infected) infectedActive++;
    if (!t.lastAssessedAt || t.lastAssessedAt < sevenDaysAgo) overdueReassessment++;
  }

  const stageIiiIvActive = openList.filter(
    (w) =>
      w.etiology === "pressure" &&
      (w.stage === "stage_3" || w.stage === "stage_4" || w.stage === "unstageable")
  ).length;

  const recentHealed = my.filter(
    (w) => w.status === "healed" && (w.closedAt || "") >= ninetyAgo
  );
  const avgTimeToHealDays =
    recentHealed.length > 0
      ? Math.round(
          recentHealed.reduce((sum, w) => {
            const start = new Date(w.firstNotedAt).getTime();
            const end = new Date(w.closedAt!).getTime();
            return sum + Math.max(0, (end - start) / 86_400_000);
          }, 0) / recentHealed.length
        )
      : 0;

  return {
    openWounds: openList.length,
    pressureInjuries: openList.filter((w) => w.etiology === "pressure").length,
    infectedActive,
    stageIiiIvActive,
    assessmentsToday,
    assessmentsMonth,
    healedMonth: my.filter((w) => w.status === "healed" && (w.closedAt || "") >= monthStart).length,
    overdueReassessment,
    avgTimeToHealDays,
  };
}

export function unlinkWoundsForPatient(patientId: string, orgId: string): void {
  for (const w of wounds) {
    if (w.organizationId === orgId && w.patientId === patientId) {
      w.patientId = "";
      w.patientName = `[removed] ${w.patientName}`;
      w.updatedAt = new Date().toISOString();
    }
  }
  // flush:auto-unlink
  wounds.splice(wounds.length, 0);
}
