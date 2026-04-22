// Health Camps / Outreach Events. Tenant-scoped.
//  HealthCamp (event definition) + CampRegistration (per-attendee).
// Attendees are NOT the same as patients — they can be converted / referred later.
// No patient cascade.

import { bindPersistentArray } from "../persistent-array";

export type CampStatus = "planned" | "approved" | "ongoing" | "completed" | "cancelled";
export type CampType = "general" | "eye" | "dental" | "diabetes" | "cardiac" | "cancer_screening" | "immunization" | "womens_health" | "pediatric" | "geriatric" | "mental_health" | "school" | "corporate" | "cme" | "awareness";
export type Partnership = "standalone" | "ngo" | "corporate_csr" | "govt" | "school" | "religious_body" | "community";
export type RegistrationOutcome = "registered" | "screened" | "referred" | "treated_on_site" | "no_show" | "declined";
export type Gender = "male" | "female" | "other" | "unspecified";

export interface CampService {
  id: string;
  name: string;                     // e.g. "BP screening", "Visual acuity"
  expectedCount?: number;
  performedCount?: number;
  abnormalCount?: number;           // for triage tracking
}

export interface CampStaff {
  id: string;
  name: string;
  role: string;                     // "Physician", "Nurse", "Pharmacist"
  durationHours?: number;
}

export interface HealthCamp {
  id: string;                        // HCP-{suffix}-{seq}
  organizationId: string;
  name: string;                      // "Free Diabetes Camp - Sector 12"
  campType: CampType;
  partnership: Partnership;
  partnerName?: string;              // partner org name
  status: CampStatus;
  startAt: string;
  endAt?: string;
  venueName: string;
  venueAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  targetCommunity?: string;          // elderly, school children
  targetCount?: number;
  registeredCount: number;
  screenedCount: number;
  referredCount: number;
  treatedOnSiteCount: number;
  noShowCount: number;
  coordinatorName: string;
  coordinatorPhone?: string;
  services: CampService[];
  staff: CampStaff[];
  budgetAmount?: number;
  budgetCurrency?: string;
  actualCost?: number;
  sponsorAmount?: number;            // sponsored amount
  outcomeSummary?: string;
  lessonsLearned?: string;
  photosUrl?: string;                // gallery link
  reportUrl?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface CampRegistration {
  id: string;                        // HCR-{suffix}-{seq}
  organizationId: string;
  campId: string;
  campName: string;                  // denorm for stability
  attendeeName: string;
  age?: number;
  gender?: Gender;
  phone?: string;
  address?: string;
  servicesRequested?: string[];      // list of CampService ids
  outcome: RegistrationOutcome;
  screeningFindings?: string;
  bpSystolic?: number;
  bpDiastolic?: number;
  bloodSugarMgDl?: number;
  bmi?: number;
  visualAcuityOd?: string;
  visualAcuityOs?: string;
  referredTo?: string;               // facility or department
  followUpDate?: string;
  convertedPatientId?: string;       // if later registered as patient
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const camps: HealthCamp[] = [];
const regs: CampRegistration[] = [];
const hC = bindPersistentArray<HealthCamp>("health-camps", camps, () => []);
const hR = bindPersistentArray<CampRegistration>("health-camp-regs", regs, () => []);
await hC;
await hR;

export const CAMP_TYPE_LABEL: Record<CampType, string> = {
  general: "General", eye: "Eye", dental: "Dental", diabetes: "Diabetes",
  cardiac: "Cardiac", cancer_screening: "Cancer screening", immunization: "Immunization",
  womens_health: "Women's health", pediatric: "Pediatric", geriatric: "Geriatric",
  mental_health: "Mental health", school: "School", corporate: "Corporate",
  cme: "CME / academic", awareness: "Awareness",
};
export const STATUS_LABEL: Record<CampStatus, string> = {
  planned: "Planned", approved: "Approved", ongoing: "Ongoing",
  completed: "Completed", cancelled: "Cancelled",
};
export const PARTNERSHIP_LABEL: Record<Partnership, string> = {
  standalone: "Standalone", ngo: "NGO", corporate_csr: "Corporate CSR",
  govt: "Government", school: "School", religious_body: "Religious body", community: "Community",
};
export const OUTCOME_LABEL: Record<RegistrationOutcome, string> = {
  registered: "Registered", screened: "Screened", referred: "Referred",
  treated_on_site: "Treated on-site", no_show: "No-show", declined: "Declined",
};

function suf(o: string) { return o.slice(0, 4).toUpperCase(); }
function nextCampId(o: string) {
  const p = `HCP-${suf(o)}-`;
  const m = camps.filter((r) => r.id.startsWith(p)).reduce((mx, r) => Math.max(mx, Number(r.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}
function nextRegId(o: string) {
  const p = `HCR-${suf(o)}-`;
  const m = regs.filter((r) => r.id.startsWith(p)).reduce((mx, r) => Math.max(mx, Number(r.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}

function recountCamp(campId: string, orgId: string) {
  const c = camps.find((x) => x.id === campId && x.organizationId === orgId);
  if (!c) return;
  const my = regs.filter((r) => r.campId === campId && r.organizationId === orgId);
  c.registeredCount = my.length;
  c.screenedCount = my.filter((r) => r.outcome === "screened" || r.outcome === "referred" || r.outcome === "treated_on_site").length;
  c.referredCount = my.filter((r) => r.outcome === "referred").length;
  c.treatedOnSiteCount = my.filter((r) => r.outcome === "treated_on_site").length;
  c.noShowCount = my.filter((r) => r.outcome === "no_show").length;
  c.updatedAt = new Date().toISOString();
}

// Camps
export function listCamps(opts: { organizationId: string; status?: CampStatus; campType?: CampType }): HealthCamp[] {
  return camps.filter((r) => r.organizationId === opts.organizationId)
    .filter((r) => (opts.status ? r.status === opts.status : true))
    .filter((r) => (opts.campType ? r.campType === opts.campType : true))
    .sort((a, b) => b.startAt.localeCompare(a.startAt));
}
export function createCamp(orgId: string, input: Partial<HealthCamp>): { ok: true; record: HealthCamp } | { ok: false; error: string } {
  if (!input.name || !input.startAt || !input.venueName || !input.coordinatorName) return { ok: false, error: "missing_required" };
  const now = new Date().toISOString();
  const r: HealthCamp = {
    id: nextCampId(orgId), organizationId: orgId,
    name: input.name,
    campType: (input.campType || "general") as CampType,
    partnership: (input.partnership || "standalone") as Partnership,
    partnerName: input.partnerName,
    status: (input.status || "planned") as CampStatus,
    startAt: input.startAt,
    endAt: input.endAt,
    venueName: input.venueName,
    venueAddress: input.venueAddress,
    city: input.city, state: input.state, country: input.country,
    targetCommunity: input.targetCommunity,
    targetCount: input.targetCount,
    registeredCount: 0, screenedCount: 0, referredCount: 0,
    treatedOnSiteCount: 0, noShowCount: 0,
    coordinatorName: input.coordinatorName,
    coordinatorPhone: input.coordinatorPhone,
    services: input.services || [],
    staff: input.staff || [],
    budgetAmount: input.budgetAmount,
    budgetCurrency: input.budgetCurrency || (input.budgetAmount ? "INR" : undefined),
    actualCost: input.actualCost,
    sponsorAmount: input.sponsorAmount,
    outcomeSummary: input.outcomeSummary,
    lessonsLearned: input.lessonsLearned,
    photosUrl: input.photosUrl,
    reportUrl: input.reportUrl,
    approvedBy: input.approvedBy,
    approvedAt: input.approvedAt,
    createdAt: now, updatedAt: now,
  };
  camps.push(r);
  return { ok: true, record: r };
}
export function updateCamp(id: string, orgId: string, patch: Partial<HealthCamp>): HealthCamp | null {
  const i = camps.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return null;
  const prev = camps[i];
  const now = new Date().toISOString();
  const next: HealthCamp = { ...prev, ...patch, id: prev.id, organizationId: prev.organizationId, updatedAt: now };
  if (next.status === "approved" && prev.status !== "approved" && !next.approvedAt) next.approvedAt = now;
  if (next.status === "completed" && prev.status !== "completed" && !next.completedAt) next.completedAt = now;
  camps[i] = next;
  return next;
}
export function deleteCamp(id: string, orgId: string): boolean {
  const i = camps.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return false;
  camps.splice(i, 1);
  // Cascade delete its registrations
  for (let j = regs.length - 1; j >= 0; j--) {
    if (regs[j].campId === id && regs[j].organizationId === orgId) regs.splice(j, 1);
  }
  return true;
}

// Registrations
export function listRegistrations(opts: { organizationId: string; campId?: string; outcome?: RegistrationOutcome }): CampRegistration[] {
  return regs.filter((r) => r.organizationId === opts.organizationId)
    .filter((r) => (opts.campId ? r.campId === opts.campId : true))
    .filter((r) => (opts.outcome ? r.outcome === opts.outcome : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function createRegistration(orgId: string, input: Partial<CampRegistration>): { ok: true; record: CampRegistration } | { ok: false; error: string } {
  if (!input.campId || !input.attendeeName) return { ok: false, error: "missing_required" };
  const camp = camps.find((c) => c.id === input.campId && c.organizationId === orgId);
  if (!camp) return { ok: false, error: "camp_not_found" };
  const now = new Date().toISOString();
  const r: CampRegistration = {
    id: nextRegId(orgId), organizationId: orgId,
    campId: camp.id, campName: camp.name,
    attendeeName: input.attendeeName,
    age: input.age, gender: input.gender,
    phone: input.phone, address: input.address,
    servicesRequested: input.servicesRequested || [],
    outcome: (input.outcome || "registered") as RegistrationOutcome,
    screeningFindings: input.screeningFindings,
    bpSystolic: input.bpSystolic,
    bpDiastolic: input.bpDiastolic,
    bloodSugarMgDl: input.bloodSugarMgDl,
    bmi: input.bmi,
    visualAcuityOd: input.visualAcuityOd,
    visualAcuityOs: input.visualAcuityOs,
    referredTo: input.referredTo,
    followUpDate: input.followUpDate,
    convertedPatientId: input.convertedPatientId,
    notes: input.notes,
    createdAt: now, updatedAt: now,
  };
  regs.push(r);
  recountCamp(r.campId, orgId);
  return { ok: true, record: r };
}
export function updateRegistration(id: string, orgId: string, patch: Partial<CampRegistration>): CampRegistration | null {
  const i = regs.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return null;
  const prev = regs[i];
  const now = new Date().toISOString();
  const next: CampRegistration = { ...prev, ...patch, id: prev.id, organizationId: prev.organizationId, updatedAt: now };
  regs[i] = next;
  recountCamp(next.campId, orgId);
  return next;
}
export function deleteRegistration(id: string, orgId: string): boolean {
  const i = regs.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return false;
  const campId = regs[i].campId;
  regs.splice(i, 1);
  recountCamp(campId, orgId);
  return true;
}

export function computeStats(orgId: string) {
  const myC = camps.filter((r) => r.organizationId === orgId);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const upcoming = myC.filter((r) => (r.status === "planned" || r.status === "approved") && r.startAt > now.toISOString()).length;
  const ongoing = myC.filter((r) => r.status === "ongoing").length;
  const completedMonth = myC.filter((r) => r.status === "completed" && (r.completedAt || "") >= monthStart).length;
  const totalReachedMonth = myC
    .filter((r) => r.status === "completed" && (r.completedAt || "") >= monthStart)
    .reduce((s, c) => s + c.registeredCount, 0);
  const screenedMonth = myC
    .filter((r) => r.status === "completed" && (r.completedAt || "") >= monthStart)
    .reduce((s, c) => s + c.screenedCount, 0);
  const referredMonth = myC
    .filter((r) => r.status === "completed" && (r.completedAt || "") >= monthStart)
    .reduce((s, c) => s + c.referredCount, 0);
  const pendingApproval = myC.filter((r) => r.status === "planned").length;
  return {
    upcoming, ongoing, completedMonth,
    totalReachedMonth, screenedMonth, referredMonth,
    pendingApproval,
  };
}
