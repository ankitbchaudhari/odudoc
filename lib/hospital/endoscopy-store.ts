// Endoscopy / Bronchoscopy / Cystoscopy procedures. Tenant-scoped.
//
// Single-entity with nested findings + biopsies.
//
// Lifecycle:
//   scheduled -> in_progress -> completed
//             -> postponed
//             -> cancelled
//
// Withdrawal time captured for colonoscopy (quality indicator: ≥ 6 min).
// Polyp detection rate + cecal intubation rate are computed hospital-wide.
//
// On patient delete: detach-only (endoscopy report is legal record).

import { bindPersistentArray } from "../persistent-array";

export type ProcedureStatus = "scheduled" | "in_progress" | "completed" | "cancelled" | "postponed";

export type ScopeType =
  | "colonoscopy"
  | "flex_sigmoidoscopy"
  | "egd"
  | "ercp"
  | "eus"
  | "enteroscopy"
  | "bronchoscopy"
  | "cystoscopy"
  | "hysteroscopy"
  | "arthroscopy"
  | "capsule"
  | "other";

export type SedationLevel =
  | "none"
  | "minimal"         // anxiolysis
  | "moderate"        // conscious sedation
  | "deep"
  | "general";

export type ASAClass = "I" | "II" | "III" | "IV" | "V" | "VI" | "E";

export type Mallampati = 1 | 2 | 3 | 4;

export type BowelPrepQuality = "excellent" | "good" | "fair" | "poor" | "inadequate" | "na";

export type PolypMorphology =
  | "pedunculated"     // 0-Ip
  | "subpedunculated"  // 0-Isp
  | "sessile"          // 0-Is
  | "flat_elevated"    // 0-IIa
  | "flat"             // 0-IIb
  | "depressed"        // 0-IIc
  | "ulcerated"        // 0-III
  | "laterally_spreading"
  | "other";

export type FindingType =
  | "polyp"
  | "ulcer"
  | "erosion"
  | "stricture"
  | "mass"
  | "bleeding"
  | "varices"
  | "diverticulum"
  | "inflammation"
  | "hernia"           // hiatal
  | "foreign_body"
  | "normal"
  | "other";

export type RemovalTechnique =
  | "cold_forceps"
  | "hot_forceps"
  | "cold_snare"
  | "hot_snare"
  | "emr"             // endoscopic mucosal resection
  | "esd"             // endoscopic submucosal dissection
  | "biopsy_only"
  | "not_removed";

export type Complication =
  | "perforation"
  | "bleeding_immediate"
  | "bleeding_delayed"
  | "aspiration"
  | "cardiopulmonary"
  | "oversedation"
  | "infection"
  | "pancreatitis"     // post-ERCP
  | "missed_lesion"
  | "other";

export interface Finding {
  type: FindingType;
  location: string;                 // "cecum", "sigmoid", "duodenum D2"
  sizeMm?: number;
  morphology?: PolypMorphology;     // for polyps
  removal?: RemovalTechnique;
  biopsyTaken?: boolean;
  biopsyJar?: string;               // jar/label ID
  histologySent?: boolean;
  note?: string;
}

export interface EndoscopyProcedure {
  id: string;                       // END-{suffix}-{seq}
  organizationId: string;
  patientId: string;
  patientName: string;
  scopeType: ScopeType;
  indication: string;               // e.g. "rectal bleeding", "dysphagia"
  endoscopist?: string;
  assistantNurse?: string;
  room?: string;
  scheduledAt: string;
  status: ProcedureStatus;
  // Pre-procedure
  asaClass?: ASAClass;
  mallampati?: Mallampati;
  allergies?: string;
  consentSigned?: boolean;
  fastingHours?: number;
  bowelPrepQuality?: BowelPrepQuality;
  // Procedure
  startedAt?: string;
  endedAt?: string;
  sedationLevel?: SedationLevel;
  sedationAgents?: string;          // free text: "midazolam 2mg + fentanyl 50mcg"
  withdrawalMin?: number;           // colonoscopy QI
  cecalIntubation?: boolean;
  reachedSecondPart?: boolean;      // EGD: D2
  scopeSerial?: string;
  // Findings + biopsies
  findings: Finding[];
  overallImpression?: string;
  // Complications
  complications?: Complication[];
  complicationNote?: string;
  // Post-procedure
  dischargedAt?: string;            // from recovery
  postFollowUp?: string;
  reportText?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}

const procedures: EndoscopyProcedure[] = [];

export const SCOPE_LABEL: Record<ScopeType, string> = {
  colonoscopy: "Colonoscopy",
  flex_sigmoidoscopy: "Flex sigmoidoscopy",
  egd: "EGD / upper",
  ercp: "ERCP",
  eus: "EUS",
  enteroscopy: "Enteroscopy",
  bronchoscopy: "Bronchoscopy",
  cystoscopy: "Cystoscopy",
  hysteroscopy: "Hysteroscopy",
  arthroscopy: "Arthroscopy",
  capsule: "Capsule endoscopy",
  other: "Other",
};

export const FINDING_LABEL: Record<FindingType, string> = {
  polyp: "Polyp",
  ulcer: "Ulcer",
  erosion: "Erosion",
  stricture: "Stricture",
  mass: "Mass",
  bleeding: "Bleeding",
  varices: "Varices",
  diverticulum: "Diverticulum",
  inflammation: "Inflammation",
  hernia: "Hiatal hernia",
  foreign_body: "Foreign body",
  normal: "Normal",
  other: "Other",
};

export const REMOVAL_LABEL: Record<RemovalTechnique, string> = {
  cold_forceps: "Cold forceps",
  hot_forceps: "Hot forceps",
  cold_snare: "Cold snare",
  hot_snare: "Hot snare",
  emr: "EMR",
  esd: "ESD",
  biopsy_only: "Biopsy only",
  not_removed: "Not removed",
};

export const COMPLICATION_LABEL: Record<Complication, string> = {
  perforation: "Perforation",
  bleeding_immediate: "Bleeding (immediate)",
  bleeding_delayed: "Bleeding (delayed)",
  aspiration: "Aspiration",
  cardiopulmonary: "Cardiopulmonary event",
  oversedation: "Over-sedation",
  infection: "Infection",
  pancreatitis: "Post-ERCP pancreatitis",
  missed_lesion: "Missed lesion",
  other: "Other",
};

const hydrate = bindPersistentArray<EndoscopyProcedure>("endoscopy-procedures", procedures, () => []);
await hydrate;

export type EndoscopyStats = ReturnType<typeof computeStats>;

function orgSuffix(orgId: string): string {
  return orgId.slice(0, 4).toUpperCase();
}

function nextId(orgId: string): string {
  const prefix = `END-${orgSuffix(orgId)}-`;
  const maxSeq = procedures
    .filter((p) => p.id.startsWith(prefix))
    .reduce((m, p) => Math.max(m, Number(p.id.slice(prefix.length)) || 0), 0);
  return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
}

export function listProcedures(opts: {
  organizationId: string;
  status?: ProcedureStatus;
  scopeType?: ScopeType;
  patientId?: string;
  from?: string;
  to?: string;
}): EndoscopyProcedure[] {
  return procedures
    .filter((p) => p.organizationId === opts.organizationId)
    .filter((p) => (opts.status ? p.status === opts.status : true))
    .filter((p) => (opts.scopeType ? p.scopeType === opts.scopeType : true))
    .filter((p) => (opts.patientId ? p.patientId === opts.patientId : true))
    .filter((p) => (opts.from ? p.scheduledAt >= opts.from : true))
    .filter((p) => (opts.to ? p.scheduledAt <= opts.to : true))
    .sort((a, b) => (b.scheduledAt || "").localeCompare(a.scheduledAt || ""));
}

export function createProcedure(
  orgId: string,
  input: Partial<EndoscopyProcedure>
): { ok: true; procedure: EndoscopyProcedure } | { ok: false; error: string } {
  if (!input.patientId || !input.patientName) return { ok: false, error: "missing_patient" };
  if (!input.scopeType || !input.indication) return { ok: false, error: "missing_required" };
  if (!input.scheduledAt) return { ok: false, error: "missing_schedule" };
  const now = new Date().toISOString();
  const proc: EndoscopyProcedure = {
    id: nextId(orgId),
    organizationId: orgId,
    patientId: input.patientId,
    patientName: input.patientName,
    scopeType: input.scopeType as ScopeType,
    indication: input.indication,
    endoscopist: input.endoscopist,
    assistantNurse: input.assistantNurse,
    room: input.room,
    scheduledAt: input.scheduledAt,
    status: "scheduled",
    asaClass: input.asaClass,
    mallampati: input.mallampati,
    allergies: input.allergies,
    consentSigned: !!input.consentSigned,
    fastingHours: input.fastingHours,
    bowelPrepQuality: input.bowelPrepQuality,
    findings: input.findings || [],
    createdAt: now,
    updatedAt: now,
  };
  procedures.push(proc);
  return { ok: true, procedure: proc };
}

export function updateProcedure(
  id: string,
  orgId: string,
  patch: Partial<EndoscopyProcedure>
): EndoscopyProcedure | null {
  const i = procedures.findIndex((p) => p.id === id && p.organizationId === orgId);
  if (i < 0) return null;
  const now = new Date().toISOString();
  const prev = procedures[i];
  const next: EndoscopyProcedure = {
    ...prev,
    ...patch,
    id: prev.id,
    organizationId: prev.organizationId,
    updatedAt: now,
  };
  // Auto-stamp start/end timestamps on status transitions
  if (next.status === "in_progress" && prev.status !== "in_progress" && !next.startedAt) {
    next.startedAt = now;
  }
  if (next.status === "completed" && prev.status !== "completed" && !next.endedAt) {
    next.endedAt = now;
    if (!next.startedAt) next.startedAt = prev.startedAt || now;
  }
  if (next.status === "scheduled" && (prev.status === "completed" || prev.status === "cancelled")) {
    // Reopening — do not reset timestamps; clinician can correct manually
  }
  procedures[i] = next;
  return next;
}

export function deleteProcedure(id: string, orgId: string): boolean {
  const i = procedures.findIndex((p) => p.id === id && p.organizationId === orgId);
  if (i < 0) return false;
  procedures.splice(i, 1);
  return true;
}

// ---------- Derived ----------

export function procedureDurationMin(p: EndoscopyProcedure): number | null {
  if (!p.startedAt || !p.endedAt) return null;
  const diff = new Date(p.endedAt).getTime() - new Date(p.startedAt).getTime();
  if (!Number.isFinite(diff) || diff < 0) return 0;
  return Math.round(diff / 60000);
}

export function computeStats(orgId: string): {
  scheduledToday: number;
  inProgress: number;
  completedMonth: number;
  cancelledMonth: number;
  biopsiesMonth: number;
  polypDetectionRate: number;    // % of colonoscopies with ≥1 polyp (last 90d)
  cecalIntubationRate: number;   // % of colonoscopies with cecal intubation (last 90d)
  avgWithdrawalMin: number;      // mean withdrawal min on completed colonoscopies (last 90d)
  complicationsMonth: number;
} {
  const my = procedures.filter((p) => p.organizationId === orgId);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const ninetyAgo = new Date(now.getTime() - 90 * 86_400_000).toISOString();

  const scheduledToday = my.filter(
    (p) =>
      p.status === "scheduled" &&
      p.scheduledAt >= todayStart &&
      p.scheduledAt < todayEnd
  ).length;
  const inProgress = my.filter((p) => p.status === "in_progress").length;
  const completedMonth = my.filter(
    (p) => p.status === "completed" && (p.endedAt || p.scheduledAt) >= monthStart
  ).length;
  const cancelledMonth = my.filter(
    (p) => p.status === "cancelled" && p.scheduledAt >= monthStart
  ).length;
  const biopsiesMonth = my
    .filter((p) => p.status === "completed" && (p.endedAt || p.scheduledAt) >= monthStart)
    .reduce((sum, p) => sum + p.findings.filter((f) => f.biopsyTaken).length, 0);
  const complicationsMonth = my.filter(
    (p) =>
      p.status === "completed" &&
      (p.endedAt || p.scheduledAt) >= monthStart &&
      (p.complications || []).length > 0
  ).length;

  const recentColos = my.filter(
    (p) =>
      p.scopeType === "colonoscopy" &&
      p.status === "completed" &&
      (p.endedAt || p.scheduledAt) >= ninetyAgo
  );
  const withPolyp = recentColos.filter((p) =>
    p.findings.some((f) => f.type === "polyp")
  ).length;
  const withCecal = recentColos.filter((p) => p.cecalIntubation).length;
  const polypDetectionRate =
    recentColos.length > 0 ? Math.round((withPolyp / recentColos.length) * 100) : 0;
  const cecalIntubationRate =
    recentColos.length > 0 ? Math.round((withCecal / recentColos.length) * 100) : 0;
  const withWithdrawal = recentColos.filter((p) => p.withdrawalMin != null);
  const avgWithdrawalMin =
    withWithdrawal.length > 0
      ? Math.round(
          withWithdrawal.reduce((sum, p) => sum + (p.withdrawalMin || 0), 0) /
            withWithdrawal.length
        )
      : 0;

  return {
    scheduledToday,
    inProgress,
    completedMonth,
    cancelledMonth,
    biopsiesMonth,
    polypDetectionRate,
    cecalIntubationRate,
    avgWithdrawalMin,
    complicationsMonth,
  };
}

export function unlinkEndoscopyForPatient(patientId: string, orgId: string): void {
  for (const p of procedures) {
    if (p.organizationId === orgId && p.patientId === patientId) {
      p.patientId = "";
      p.patientName = `[removed] ${p.patientName}`;
      p.updatedAt = new Date().toISOString();
    }
  }
  // flush:auto-unlink
  procedures.splice(procedures.length, 0);
}
