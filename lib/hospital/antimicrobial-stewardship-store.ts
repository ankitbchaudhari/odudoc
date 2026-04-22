// Antimicrobial Stewardship Program (AMSP). Tenant-scoped.
// AntibioticAgent (formulary) + StewardshipReview (per-patient prescribing review).
// Detach-only patient cascade on reviews.

import { bindPersistentArray } from "../persistent-array";

export type AgentClass = "beta_lactam" | "cephalosporin" | "carbapenem" | "glycopeptide" | "fluoroquinolone" | "aminoglycoside" | "macrolide" | "tetracycline" | "oxazolidinone" | "polymyxin" | "antifungal" | "antiviral" | "antitubercular" | "other";
export type RestrictionTier = "unrestricted" | "monitored" | "restricted" | "reserve";
export type AgentRoute = "iv" | "po" | "im" | "inhaled" | "topical" | "other";

export type ReviewType = "pre_authorization" | "prospective_audit" | "de_escalation" | "iv_to_po_switch" | "duration_review" | "culture_directed" | "empiric_review" | "stop_order";
export type ReviewStatus = "pending" | "approved" | "rejected" | "modified" | "acknowledged" | "withdrawn";
export type IndicationType = "empiric" | "definitive" | "surgical_prophylaxis" | "medical_prophylaxis" | "targeted";
export type ApprovalOutcome = "continue" | "de_escalate" | "escalate" | "change_agent" | "stop" | "switch_iv_to_po" | "no_change";

export interface AntibioticAgent {
  id: string;                    // ABX-{suffix}-{seq}
  organizationId: string;
  name: string;                   // "Meropenem"
  genericName?: string;
  brandNames?: string;            // "Meronem, Meromax"
  agentClass: AgentClass;
  restrictionTier: RestrictionTier;
  route: AgentRoute[];
  defaultAdultDose?: string;      // "1g IV q8h"
  defaultPedDose?: string;
  ddd?: number;                    // WHO Defined Daily Dose in grams
  requiresCulture?: boolean;
  maxEmpiricDays?: number;
  formularyNotes?: string;
  indicationGuide?: string;
  activeOnFormulary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StewardshipReview {
  id: string;                     // ASR-{suffix}-{seq}
  organizationId: string;
  patientId: string;
  patientName: string;
  admissionId?: string;
  ward?: string;
  reviewType: ReviewType;
  reviewDate: string;
  reviewedBy: string;              // ID specialist / AMSP pharmacist
  prescriberName?: string;
  prescriberDepartment?: string;
  agentId?: string;                // linked formulary agent
  agentName: string;               // denorm / free-text
  agentClass?: AgentClass;
  dose?: string;
  route?: AgentRoute;
  frequency?: string;
  startDate?: string;
  durationDaysAtReview?: number;
  indication: IndicationType;
  indicationDetails?: string;
  suspectedPathogen?: string;
  cultureAvailable?: boolean;
  cultureSensitivity?: string;     // "E.coli ESBL, sensitive to meropenem"
  wbc?: number;
  crp?: number;
  procalcitonin?: number;
  temperatureC?: number;
  clinicalResponse?: "improving" | "unchanged" | "worsening" | "unclear";
  outcome: ApprovalOutcome;
  status: ReviewStatus;
  recommendedAgent?: string;
  recommendedDose?: string;
  recommendedDurationDays?: number;
  adverseEvent?: string;
  interventionAccepted?: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  costSavingEstimate?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const agents: AntibioticAgent[] = [];
const reviews: StewardshipReview[] = [];
const hA = bindPersistentArray<AntibioticAgent>("antimicrobial-agents", agents, () => []);
const hR = bindPersistentArray<StewardshipReview>("antimicrobial-reviews", reviews, () => []);
await hA; await hR;

export const CLASS_LABEL: Record<AgentClass, string> = {
  beta_lactam: "Beta-lactam", cephalosporin: "Cephalosporin", carbapenem: "Carbapenem",
  glycopeptide: "Glycopeptide", fluoroquinolone: "Fluoroquinolone", aminoglycoside: "Aminoglycoside",
  macrolide: "Macrolide", tetracycline: "Tetracycline", oxazolidinone: "Oxazolidinone",
  polymyxin: "Polymyxin", antifungal: "Antifungal", antiviral: "Antiviral",
  antitubercular: "Anti-TB", other: "Other",
};
export const TIER_LABEL: Record<RestrictionTier, string> = {
  unrestricted: "Unrestricted", monitored: "Monitored",
  restricted: "Restricted (approval)", reserve: "Reserve (ID only)",
};
export const REVIEW_TYPE_LABEL: Record<ReviewType, string> = {
  pre_authorization: "Pre-authorization", prospective_audit: "Prospective audit",
  de_escalation: "De-escalation", iv_to_po_switch: "IV→PO switch",
  duration_review: "Duration review", culture_directed: "Culture-directed",
  empiric_review: "Empiric review", stop_order: "Stop order",
};
export const STATUS_LABEL: Record<ReviewStatus, string> = {
  pending: "Pending", approved: "Approved", rejected: "Rejected",
  modified: "Modified", acknowledged: "Acknowledged", withdrawn: "Withdrawn",
};
export const INDICATION_LABEL: Record<IndicationType, string> = {
  empiric: "Empiric", definitive: "Definitive",
  surgical_prophylaxis: "Surgical prophylaxis", medical_prophylaxis: "Medical prophylaxis",
  targeted: "Targeted",
};
export const OUTCOME_LABEL: Record<ApprovalOutcome, string> = {
  continue: "Continue", de_escalate: "De-escalate", escalate: "Escalate",
  change_agent: "Change agent", stop: "Stop",
  switch_iv_to_po: "Switch IV→PO", no_change: "No change",
};

function suf(o: string) { return o.slice(0, 4).toUpperCase(); }
function nextId(prefix: string, list: { id: string }[], orgId: string) {
  const p = `${prefix}-${suf(orgId)}-`;
  const m = list.filter((r) => r.id.startsWith(p)).reduce((mx, r) => Math.max(mx, Number(r.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}

// Agents
export function listAgents(opts: { organizationId: string; agentClass?: AgentClass; tier?: RestrictionTier; active?: boolean }): AntibioticAgent[] {
  return agents.filter((r) => r.organizationId === opts.organizationId)
    .filter((r) => (opts.agentClass ? r.agentClass === opts.agentClass : true))
    .filter((r) => (opts.tier ? r.restrictionTier === opts.tier : true))
    .filter((r) => (opts.active === undefined ? true : r.activeOnFormulary === opts.active))
    .sort((a, b) => a.name.localeCompare(b.name));
}
export function createAgent(orgId: string, input: Partial<AntibioticAgent>): { ok: true; record: AntibioticAgent } | { ok: false; error: string } {
  if (!input.name || !input.agentClass || !input.restrictionTier) return { ok: false, error: "missing_required" };
  const now = new Date().toISOString();
  const r: AntibioticAgent = {
    id: nextId("ABX", agents, orgId), organizationId: orgId,
    name: input.name, genericName: input.genericName, brandNames: input.brandNames,
    agentClass: input.agentClass as AgentClass,
    restrictionTier: input.restrictionTier as RestrictionTier,
    route: input.route || ["iv"],
    defaultAdultDose: input.defaultAdultDose, defaultPedDose: input.defaultPedDose,
    ddd: input.ddd,
    requiresCulture: input.requiresCulture ?? false,
    maxEmpiricDays: input.maxEmpiricDays,
    formularyNotes: input.formularyNotes,
    indicationGuide: input.indicationGuide,
    activeOnFormulary: input.activeOnFormulary ?? true,
    createdAt: now, updatedAt: now,
  };
  agents.push(r);
  return { ok: true, record: r };
}
export function updateAgent(id: string, orgId: string, patch: Partial<AntibioticAgent>): AntibioticAgent | null {
  const i = agents.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return null;
  agents.splice(i, 1, { ...agents[i], ...patch, id: agents[i].id, organizationId: agents[i].organizationId, updatedAt: new Date().toISOString() });
  return agents[i];
}
export function deleteAgent(id: string, orgId: string): boolean {
  const i = agents.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return false;
  agents.splice(i, 1);
  return true;
}

// Reviews
export function listReviews(opts: { organizationId: string; status?: ReviewStatus; reviewType?: ReviewType; patientId?: string }): StewardshipReview[] {
  return reviews.filter((r) => r.organizationId === opts.organizationId)
    .filter((r) => (opts.status ? r.status === opts.status : true))
    .filter((r) => (opts.reviewType ? r.reviewType === opts.reviewType : true))
    .filter((r) => (opts.patientId ? r.patientId === opts.patientId : true))
    .sort((a, b) => b.reviewDate.localeCompare(a.reviewDate));
}
export function createReview(orgId: string, input: Partial<StewardshipReview>): { ok: true; record: StewardshipReview } | { ok: false; error: string } {
  if (!input.patientId || !input.patientName || !input.agentName || !input.reviewType || !input.reviewDate || !input.reviewedBy) return { ok: false, error: "missing_required" };
  const linked = input.agentId ? agents.find((a) => a.id === input.agentId && a.organizationId === orgId) : undefined;
  const now = new Date().toISOString();
  const r: StewardshipReview = {
    id: nextId("ASR", reviews, orgId), organizationId: orgId,
    patientId: input.patientId, patientName: input.patientName,
    admissionId: input.admissionId, ward: input.ward,
    reviewType: input.reviewType as ReviewType,
    reviewDate: input.reviewDate, reviewedBy: input.reviewedBy,
    prescriberName: input.prescriberName, prescriberDepartment: input.prescriberDepartment,
    agentId: linked?.id,
    agentName: input.agentName,
    agentClass: (linked?.agentClass || input.agentClass) as AgentClass | undefined,
    dose: input.dose, route: input.route, frequency: input.frequency,
    startDate: input.startDate, durationDaysAtReview: input.durationDaysAtReview,
    indication: (input.indication || "empiric") as IndicationType,
    indicationDetails: input.indicationDetails,
    suspectedPathogen: input.suspectedPathogen,
    cultureAvailable: input.cultureAvailable ?? false,
    cultureSensitivity: input.cultureSensitivity,
    wbc: input.wbc, crp: input.crp, procalcitonin: input.procalcitonin,
    temperatureC: input.temperatureC, clinicalResponse: input.clinicalResponse,
    outcome: (input.outcome || "no_change") as ApprovalOutcome,
    status: (input.status || "pending") as ReviewStatus,
    recommendedAgent: input.recommendedAgent,
    recommendedDose: input.recommendedDose,
    recommendedDurationDays: input.recommendedDurationDays,
    adverseEvent: input.adverseEvent,
    interventionAccepted: input.interventionAccepted,
    acknowledgedBy: input.acknowledgedBy,
    acknowledgedAt: input.acknowledgedAt,
    costSavingEstimate: input.costSavingEstimate,
    notes: input.notes,
    createdAt: now, updatedAt: now,
  };
  reviews.push(r);
  return { ok: true, record: r };
}
export function updateReview(id: string, orgId: string, patch: Partial<StewardshipReview>): StewardshipReview | null {
  const i = reviews.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return null;
  reviews.splice(i, 1, { ...reviews[i], ...patch, id: reviews[i].id, organizationId: reviews[i].organizationId, updatedAt: new Date().toISOString() });
  return reviews[i];
}
export function deleteReview(id: string, orgId: string): boolean {
  const i = reviews.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return false;
  reviews.splice(i, 1);
  return true;
}

export function computeStats(orgId: string) {
  const myA = agents.filter((r) => r.organizationId === orgId);
  const myR = reviews.filter((r) => r.organizationId === orgId);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const formularyActive = myA.filter((a) => a.activeOnFormulary).length;
  const restrictedCount = myA.filter((a) => a.activeOnFormulary && (a.restrictionTier === "restricted" || a.restrictionTier === "reserve")).length;
  const pending = myR.filter((r) => r.status === "pending").length;
  const approvedMonth = myR.filter((r) => r.status === "approved" && r.reviewDate >= monthStart.slice(0, 10)).length;
  const deEscMonth = myR.filter((r) => r.outcome === "de_escalate" && r.reviewDate >= monthStart.slice(0, 10)).length;
  const ivPoMonth = myR.filter((r) => r.outcome === "switch_iv_to_po" && r.reviewDate >= monthStart.slice(0, 10)).length;
  const acceptanceMonth = myR.filter((r) => r.reviewDate >= monthStart.slice(0, 10));
  const acceptedCount = acceptanceMonth.filter((r) => r.interventionAccepted).length;
  const acceptanceRate = acceptanceMonth.length > 0 ? Math.round((acceptedCount / acceptanceMonth.length) * 100) : 0;
  const costSavedMonth = acceptanceMonth.reduce((s, r) => s + (r.costSavingEstimate || 0), 0);
  return {
    formularyActive, restrictedCount,
    pending, approvedMonth,
    deEscMonth, ivPoMonth,
    acceptanceRate,
    costSavedMonth,
  };
}

export function unlinkReviewsForPatient(patientId: string, orgId: string): void {
  const stamp = new Date().toISOString();
  for (const r of reviews) {
    if (r.organizationId === orgId && r.patientId === patientId) {
      r.patientId = "";
      r.patientName = `[removed] ${r.patientName}`;
      if (r.status === "pending") r.status = "withdrawn";
      r.updatedAt = stamp;
    }
  }
  // flush:auto-unlink
  reviews.splice(reviews.length, 0);
}
