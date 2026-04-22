// Infection Control & HAI Surveillance. Tenant-scoped.
//
// Two entities:
//   HAIEvent         — healthcare-associated infection case surveillance
//   HandHygieneAudit — WHO 5-moments compliance audit
//
// HAI lifecycle:
//   suspected → confirmed → (resolved / died / discharged)
//   suspected → ruled_out (terminal)
//
// NABH HIC requires tracking of device-associated infections (CLABSI,
// CAUTI, VAP), surgical site infections (SSI), and multi-drug resistant
// organism (MDRO) isolates, plus monthly hand-hygiene compliance.
//
// Patient cascade: when a patient is deleted, HAI events linked to them
// have patientId nulled (events are org-level surveillance records for
// audit/NABH submission; we keep them but detach PII).

import { bindPersistentArray } from "../persistent-array";

export type HAIType =
  | "clabsi" // central-line associated BSI
  | "cauti" // catheter-assoc UTI
  | "vap" // ventilator-assoc pneumonia
  | "ssi" // surgical site infection
  | "mdro" // multi-drug resistant organism
  | "cdiff" // C. difficile
  | "other";

export type HAIOrganism =
  | "staph_aureus"
  | "mrsa"
  | "vre"
  | "ecoli"
  | "klebsiella"
  | "pseudomonas"
  | "acinetobacter"
  | "enterococcus"
  | "candida"
  | "cdiff"
  | "other";

export type HAIStatus =
  | "suspected"
  | "confirmed"
  | "ruled_out"
  | "resolved"
  | "died"
  | "discharged";

export type IsolationType =
  | "none"
  | "standard"
  | "contact"
  | "droplet"
  | "airborne"
  | "protective";

export interface HAIEvent {
  id: string;
  organizationId: string;
  eventNumber: string; // HAI-{suffix}-{seq}
  patientId?: string;
  patientNameSnapshot?: string;
  location: string; // ward/icu/ot
  type: HAIType;
  organism?: HAIOrganism;
  organismOther?: string;
  onsetDate: string;
  identifiedDate?: string;
  deviceType?: string; // "Central line", "Foley cath", "Ventilator", etc.
  deviceInsertedAt?: string;
  cultureSpecimen?: string; // "Blood", "Urine", "Sputum", "Swab"
  cultureResult?: string;
  sensitivityPattern?: string;
  isolation: IsolationType;
  isolationStartedAt?: string;
  isolationEndedAt?: string;
  rcaDone: boolean;
  rcaSummary?: string;
  correctiveActions?: string;
  reportedToHic: boolean;
  reportedBy?: string;
  outcome?: string;
  status: HAIStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HandHygieneAudit {
  id: string;
  organizationId: string;
  auditNumber: string; // HH-{suffix}-{seq}
  auditDate: string; // YYYY-MM-DD
  location: string; // ward / ICU / OPD
  observer: string;
  roleDoctor: number; // observations (opportunities)
  doctorCompliant: number;
  roleNurse: number;
  nurseCompliant: number;
  roleOther: number;
  otherCompliant: number;
  moment1Before: number; // before patient contact
  moment2Before: number; // before aseptic procedure
  moment3After: number; // after body fluid exposure
  moment4After: number; // after patient contact
  moment5After: number; // after touching surroundings
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const events: HAIEvent[] = [];
const audits: HandHygieneAudit[] = [];

const { hydrate: hydrateE, flush: flushE } = bindPersistentArray<HAIEvent>(
  "hospital-infection-events",
  events,
  () => []
);
const { hydrate: hydrateA, flush: flushA } = bindPersistentArray<HandHygieneAudit>(
  "hospital-infection-audits",
  audits,
  () => []
);
await hydrateE();
await hydrateA();

function orgSuffix(orgId: string): string {
  return orgId.replace(/^org-/, "").slice(0, 4).toUpperCase();
}
function nextEventNumber(orgId: string): string {
  const n = events.filter((e) => e.organizationId === orgId).length + 1;
  return `HAI-${orgSuffix(orgId)}-${String(n).padStart(5, "0")}`;
}
function nextAuditNumber(orgId: string): string {
  const n = audits.filter((a) => a.organizationId === orgId).length + 1;
  return `HH-${orgSuffix(orgId)}-${String(n).padStart(5, "0")}`;
}

export const HAI_TYPE_LABEL: Record<HAIType, string> = {
  clabsi: "CLABSI (central line BSI)",
  cauti: "CAUTI (catheter UTI)",
  vap: "VAP (ventilator pneumonia)",
  ssi: "SSI (surgical site)",
  mdro: "MDRO colonization/infection",
  cdiff: "C. difficile",
  other: "Other",
};

export const ORGANISM_LABEL: Record<HAIOrganism, string> = {
  staph_aureus: "Staph aureus (MSSA)",
  mrsa: "MRSA",
  vre: "VRE",
  ecoli: "E. coli",
  klebsiella: "Klebsiella",
  pseudomonas: "Pseudomonas",
  acinetobacter: "Acinetobacter",
  enterococcus: "Enterococcus",
  candida: "Candida",
  cdiff: "C. difficile",
  other: "Other",
};

// HAI events ---------------------------------------------------------

export function listEvents(opts: {
  organizationId: string;
  status?: HAIStatus;
  type?: HAIType;
  organism?: HAIOrganism;
  location?: string;
  from?: string;
  to?: string;
}): HAIEvent[] {
  let list = events.filter((e) => e.organizationId === opts.organizationId);
  if (opts.status) list = list.filter((e) => e.status === opts.status);
  if (opts.type) list = list.filter((e) => e.type === opts.type);
  if (opts.organism) list = list.filter((e) => e.organism === opts.organism);
  if (opts.location) list = list.filter((e) => e.location === opts.location);
  if (opts.from) list = list.filter((e) => e.onsetDate >= opts.from!);
  if (opts.to) list = list.filter((e) => e.onsetDate <= opts.to!);
  return list.sort((a, b) => b.onsetDate.localeCompare(a.onsetDate));
}

export interface EventInput {
  patientId?: string;
  patientNameSnapshot?: string;
  location?: string;
  type?: HAIType;
  organism?: HAIOrganism;
  organismOther?: string;
  onsetDate?: string;
  identifiedDate?: string;
  deviceType?: string;
  deviceInsertedAt?: string;
  cultureSpecimen?: string;
  cultureResult?: string;
  sensitivityPattern?: string;
  isolation?: IsolationType;
  isolationStartedAt?: string;
  isolationEndedAt?: string;
  rcaDone?: boolean;
  rcaSummary?: string;
  correctiveActions?: string;
  reportedToHic?: boolean;
  reportedBy?: string;
  outcome?: string;
  status?: HAIStatus;
  notes?: string;
}

export function createEvent(organizationId: string, input: EventInput): HAIEvent {
  const now = new Date().toISOString();
  const status = input.status || "suspected";
  const isolation = input.isolation || "standard";
  const e: HAIEvent = {
    id: `hai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    eventNumber: nextEventNumber(organizationId),
    patientId: input.patientId || undefined,
    patientNameSnapshot: input.patientNameSnapshot?.trim() || undefined,
    location: input.location?.trim() || "",
    type: input.type || "other",
    organism: input.organism || undefined,
    organismOther: input.organismOther?.trim() || undefined,
    onsetDate: input.onsetDate || now.slice(0, 10),
    identifiedDate: input.identifiedDate || undefined,
    deviceType: input.deviceType?.trim() || undefined,
    deviceInsertedAt: input.deviceInsertedAt || undefined,
    cultureSpecimen: input.cultureSpecimen?.trim() || undefined,
    cultureResult: input.cultureResult?.trim() || undefined,
    sensitivityPattern: input.sensitivityPattern?.trim() || undefined,
    isolation,
    isolationStartedAt: input.isolationStartedAt || (isolation !== "none" && isolation !== "standard" ? now : undefined),
    isolationEndedAt: input.isolationEndedAt || undefined,
    rcaDone: input.rcaDone ?? false,
    rcaSummary: input.rcaSummary?.trim() || undefined,
    correctiveActions: input.correctiveActions?.trim() || undefined,
    reportedToHic: input.reportedToHic ?? false,
    reportedBy: input.reportedBy?.trim() || undefined,
    outcome: input.outcome?.trim() || undefined,
    status,
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  events.unshift(e);
  flushE();
  return e;
}

export function updateEvent(
  id: string,
  organizationId: string,
  patch: Partial<EventInput>
): HAIEvent | null {
  const e = events.find((x) => x.id === id && x.organizationId === organizationId);
  if (!e) return null;
  const now = new Date().toISOString();

  if (patch.patientId !== undefined) e.patientId = patch.patientId || undefined;
  if (patch.patientNameSnapshot !== undefined)
    e.patientNameSnapshot = patch.patientNameSnapshot?.trim() || undefined;
  if (patch.location !== undefined) e.location = patch.location.trim();
  if (patch.type !== undefined) e.type = patch.type;
  if (patch.organism !== undefined) e.organism = patch.organism || undefined;
  if (patch.organismOther !== undefined)
    e.organismOther = patch.organismOther?.trim() || undefined;
  if (patch.onsetDate !== undefined) e.onsetDate = patch.onsetDate || e.onsetDate;
  if (patch.identifiedDate !== undefined)
    e.identifiedDate = patch.identifiedDate || undefined;
  if (patch.deviceType !== undefined) e.deviceType = patch.deviceType?.trim() || undefined;
  if (patch.deviceInsertedAt !== undefined)
    e.deviceInsertedAt = patch.deviceInsertedAt || undefined;
  if (patch.cultureSpecimen !== undefined)
    e.cultureSpecimen = patch.cultureSpecimen?.trim() || undefined;
  if (patch.cultureResult !== undefined)
    e.cultureResult = patch.cultureResult?.trim() || undefined;
  if (patch.sensitivityPattern !== undefined)
    e.sensitivityPattern = patch.sensitivityPattern?.trim() || undefined;
  if (patch.isolation !== undefined) {
    const prev = e.isolation;
    e.isolation = patch.isolation;
    // Auto-stamp isolation start when escalating, end when de-escalating.
    if (patch.isolation !== "none" && patch.isolation !== "standard" && !e.isolationStartedAt) {
      e.isolationStartedAt = now;
    }
    if ((patch.isolation === "none" || patch.isolation === "standard")
        && prev !== "none" && prev !== "standard"
        && !e.isolationEndedAt) {
      e.isolationEndedAt = now;
    }
  }
  if (patch.isolationStartedAt !== undefined)
    e.isolationStartedAt = patch.isolationStartedAt || undefined;
  if (patch.isolationEndedAt !== undefined)
    e.isolationEndedAt = patch.isolationEndedAt || undefined;
  if (patch.rcaDone !== undefined) e.rcaDone = patch.rcaDone;
  if (patch.rcaSummary !== undefined) e.rcaSummary = patch.rcaSummary?.trim() || undefined;
  if (patch.correctiveActions !== undefined)
    e.correctiveActions = patch.correctiveActions?.trim() || undefined;
  if (patch.reportedToHic !== undefined) e.reportedToHic = patch.reportedToHic;
  if (patch.reportedBy !== undefined) e.reportedBy = patch.reportedBy?.trim() || undefined;
  if (patch.outcome !== undefined) e.outcome = patch.outcome?.trim() || undefined;
  if (patch.status !== undefined) e.status = patch.status;
  if (patch.notes !== undefined) e.notes = patch.notes?.trim() || undefined;

  e.updatedAt = now;
  flushE();
  return e;
}

export function deleteEvent(id: string, organizationId: string): boolean {
  const idx = events.findIndex((x) => x.id === id && x.organizationId === organizationId);
  if (idx < 0) return false;
  events.splice(idx, 1);
  flushE();
  return true;
}

/** Detach patient from events but keep surveillance record for NABH audit. */
export function detachPatientFromEvents(patientId: string, organizationId: string): number {
  let n = 0;
  for (const e of events) {
    if (e.patientId === patientId && e.organizationId === organizationId) {
      e.patientId = undefined;
      e.updatedAt = new Date().toISOString();
      n++;
    }
  }
  if (n > 0) flushE();
  return n;
}

// Hand hygiene audits -----------------------------------------------

export function listAudits(opts: {
  organizationId: string;
  location?: string;
  from?: string;
  to?: string;
}): HandHygieneAudit[] {
  let list = audits.filter((a) => a.organizationId === opts.organizationId);
  if (opts.location) list = list.filter((a) => a.location === opts.location);
  if (opts.from) list = list.filter((a) => a.auditDate >= opts.from!);
  if (opts.to) list = list.filter((a) => a.auditDate <= opts.to!);
  return list.sort((a, b) => b.auditDate.localeCompare(a.auditDate));
}

export interface AuditInput {
  auditDate?: string;
  location?: string;
  observer?: string;
  roleDoctor?: number;
  doctorCompliant?: number;
  roleNurse?: number;
  nurseCompliant?: number;
  roleOther?: number;
  otherCompliant?: number;
  moment1Before?: number;
  moment2Before?: number;
  moment3After?: number;
  moment4After?: number;
  moment5After?: number;
  notes?: string;
}

function clamp0(n: number | undefined): number {
  const v = Math.max(0, Math.round(Number(n ?? 0)));
  return Number.isFinite(v) ? v : 0;
}

export function createAudit(organizationId: string, input: AuditInput): HandHygieneAudit {
  const now = new Date().toISOString();
  const a: HandHygieneAudit = {
    id: `hh-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    auditNumber: nextAuditNumber(organizationId),
    auditDate: input.auditDate || now.slice(0, 10),
    location: input.location?.trim() || "",
    observer: input.observer?.trim() || "",
    roleDoctor: clamp0(input.roleDoctor),
    doctorCompliant: clamp0(input.doctorCompliant),
    roleNurse: clamp0(input.roleNurse),
    nurseCompliant: clamp0(input.nurseCompliant),
    roleOther: clamp0(input.roleOther),
    otherCompliant: clamp0(input.otherCompliant),
    moment1Before: clamp0(input.moment1Before),
    moment2Before: clamp0(input.moment2Before),
    moment3After: clamp0(input.moment3After),
    moment4After: clamp0(input.moment4After),
    moment5After: clamp0(input.moment5After),
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  // Compliance can't exceed opportunities.
  a.doctorCompliant = Math.min(a.doctorCompliant, a.roleDoctor);
  a.nurseCompliant = Math.min(a.nurseCompliant, a.roleNurse);
  a.otherCompliant = Math.min(a.otherCompliant, a.roleOther);
  audits.unshift(a);
  flushA();
  return a;
}

export function updateAudit(
  id: string,
  organizationId: string,
  patch: Partial<AuditInput>
): HandHygieneAudit | null {
  const a = audits.find((x) => x.id === id && x.organizationId === organizationId);
  if (!a) return null;
  if (patch.auditDate !== undefined) a.auditDate = patch.auditDate || a.auditDate;
  if (patch.location !== undefined) a.location = patch.location.trim();
  if (patch.observer !== undefined) a.observer = patch.observer.trim();
  if (patch.roleDoctor !== undefined) a.roleDoctor = clamp0(patch.roleDoctor);
  if (patch.doctorCompliant !== undefined) a.doctorCompliant = clamp0(patch.doctorCompliant);
  if (patch.roleNurse !== undefined) a.roleNurse = clamp0(patch.roleNurse);
  if (patch.nurseCompliant !== undefined) a.nurseCompliant = clamp0(patch.nurseCompliant);
  if (patch.roleOther !== undefined) a.roleOther = clamp0(patch.roleOther);
  if (patch.otherCompliant !== undefined) a.otherCompliant = clamp0(patch.otherCompliant);
  if (patch.moment1Before !== undefined) a.moment1Before = clamp0(patch.moment1Before);
  if (patch.moment2Before !== undefined) a.moment2Before = clamp0(patch.moment2Before);
  if (patch.moment3After !== undefined) a.moment3After = clamp0(patch.moment3After);
  if (patch.moment4After !== undefined) a.moment4After = clamp0(patch.moment4After);
  if (patch.moment5After !== undefined) a.moment5After = clamp0(patch.moment5After);
  if (patch.notes !== undefined) a.notes = patch.notes?.trim() || undefined;

  // Re-clamp compliance vs opportunities.
  a.doctorCompliant = Math.min(a.doctorCompliant, a.roleDoctor);
  a.nurseCompliant = Math.min(a.nurseCompliant, a.roleNurse);
  a.otherCompliant = Math.min(a.otherCompliant, a.roleOther);

  a.updatedAt = new Date().toISOString();
  flushA();
  return a;
}

export function deleteAudit(id: string, organizationId: string): boolean {
  const idx = audits.findIndex((x) => x.id === id && x.organizationId === organizationId);
  if (idx < 0) return false;
  audits.splice(idx, 1);
  flushA();
  return true;
}

export function auditCompliancePct(a: HandHygieneAudit): number {
  const opps = a.roleDoctor + a.roleNurse + a.roleOther;
  if (opps === 0) return 0;
  const comp = a.doctorCompliant + a.nurseCompliant + a.otherCompliant;
  return Math.round((comp / opps) * 1000) / 10; // one decimal
}
