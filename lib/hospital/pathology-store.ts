// Pathology — histopathology, cytology, FNAC, frozen section. Tenant-scoped.
// Specimen (parent) + PathologyReport (final sign-out). Lifecycle: received -> grossing -> processing -> microscopy -> reported -> amended / cancelled.
// On patient delete: detach-only (legal record).

import { bindPersistentArray } from "../persistent-array";

export type SpecimenType =
  | "biopsy" | "resection" | "frozen_section" | "cytology_fluid" | "cytology_pap"
  | "fnac" | "bone_marrow" | "autopsy" | "explant" | "product_of_conception" | "other";

export type SpecimenStatus = "received" | "grossing" | "processing" | "microscopy" | "reported" | "amended" | "cancelled";
export type Urgency = "routine" | "urgent" | "stat" | "frozen";

export type Malignancy = "benign" | "atypical" | "in_situ" | "malignant" | "suspicious" | "inadequate" | "na";

export interface SpecimenBlock {
  label: string;                       // "A1", "B2"
  description?: string;
  sections?: number;
  stains?: string[];                   // ["H&E", "PAS", "CK7"]
}

export interface Specimen {
  id: string;                         // PATH-{suffix}-{seq}
  organizationId: string;
  patientId: string;
  patientName: string;
  specimenType: SpecimenType;
  site: string;                        // e.g. "left breast, UOQ"
  clinicalInfo?: string;
  urgency: Urgency;
  submittedBy?: string;
  grossedBy?: string;
  signedOutBy?: string;
  status: SpecimenStatus;
  receivedAt: string;
  grossedAt?: string;
  reportedAt?: string;
  containers?: number;
  fixative?: string;
  // Gross
  grossDescription?: string;
  dimensions?: string;
  weightG?: number;
  blocks?: SpecimenBlock[];
  // Microscopy / report
  microscopicDescription?: string;
  diagnosis?: string;
  malignancy?: Malignancy;
  tumorType?: string;
  grade?: string;                      // "G1", "Gleason 3+4=7"
  tnm?: string;                         // "pT2N0M0"
  marginsStatus?: "negative" | "positive" | "close" | "na";
  lymphNodesExamined?: number;
  lymphNodesPositive?: number;
  ihcResults?: string;                  // "ER+ 90%, PR+ 70%, HER2 2+"
  synopticReport?: string;
  comment?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}

const specimens: Specimen[] = [];
const hydrate = bindPersistentArray<Specimen>("pathology-specimens", specimens, () => []);
await hydrate;

export const TYPE_LABEL: Record<SpecimenType, string> = {
  biopsy: "Biopsy", resection: "Resection", frozen_section: "Frozen section",
  cytology_fluid: "Cytology (fluid)", cytology_pap: "Pap smear", fnac: "FNAC",
  bone_marrow: "Bone marrow", autopsy: "Autopsy", explant: "Explant",
  product_of_conception: "POC", other: "Other",
};
export const MALIGNANCY_LABEL: Record<Malignancy, string> = {
  benign: "Benign", atypical: "Atypical", in_situ: "In situ", malignant: "Malignant",
  suspicious: "Suspicious", inadequate: "Inadequate", na: "N/A",
};

function suf(o: string) { return o.slice(0, 4).toUpperCase(); }
function nextId(o: string) {
  const p = `PATH-${suf(o)}-`;
  const m = specimens.filter((s) => s.id.startsWith(p)).reduce((mx, s) => Math.max(mx, Number(s.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}

export function listSpecimens(opts: { organizationId: string; status?: SpecimenStatus; type?: SpecimenType; patientId?: string; urgency?: Urgency }): Specimen[] {
  return specimens.filter((s) => s.organizationId === opts.organizationId)
    .filter((s) => (opts.status ? s.status === opts.status : true))
    .filter((s) => (opts.type ? s.specimenType === opts.type : true))
    .filter((s) => (opts.urgency ? s.urgency === opts.urgency : true))
    .filter((s) => (opts.patientId ? s.patientId === opts.patientId : true))
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}

export function createSpecimen(orgId: string, input: Partial<Specimen>): { ok: true; specimen: Specimen } | { ok: false; error: string } {
  if (!input.patientId || !input.patientName || !input.specimenType || !input.site) return { ok: false, error: "missing_required" };
  const now = new Date().toISOString();
  const sp: Specimen = {
    id: nextId(orgId), organizationId: orgId,
    patientId: input.patientId, patientName: input.patientName,
    specimenType: input.specimenType as SpecimenType, site: input.site,
    clinicalInfo: input.clinicalInfo, urgency: (input.urgency || "routine") as Urgency,
    submittedBy: input.submittedBy,
    status: "received",
    receivedAt: input.receivedAt || now,
    containers: input.containers, fixative: input.fixative,
    createdAt: now, updatedAt: now,
  };
  specimens.push(sp);
  return { ok: true, specimen: sp };
}

export function updateSpecimen(id: string, orgId: string, patch: Partial<Specimen>): Specimen | null {
  const i = specimens.findIndex((s) => s.id === id && s.organizationId === orgId);
  if (i < 0) return null;
  const prev = specimens[i];
  const now = new Date().toISOString();
  const next: Specimen = { ...prev, ...patch, id: prev.id, organizationId: prev.organizationId, updatedAt: now };
  if (next.status === "grossing" && prev.status !== "grossing" && !next.grossedAt) next.grossedAt = now;
  if (next.status === "reported" && prev.status !== "reported" && !next.reportedAt) next.reportedAt = now;
  specimens[i] = next;
  return next;
}

export function deleteSpecimen(id: string, orgId: string): boolean {
  const i = specimens.findIndex((s) => s.id === id && s.organizationId === orgId);
  if (i < 0) return false;
  specimens.splice(i, 1);
  return true;
}

export function computeStats(orgId: string) {
  const my = specimens.filter((s) => s.organizationId === orgId);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const thirtyAgo = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  const receivedToday = my.filter((s) => s.receivedAt >= todayStart).length;
  const inProcess = my.filter((s) => s.status === "received" || s.status === "grossing" || s.status === "processing" || s.status === "microscopy").length;
  const frozenPending = my.filter((s) => s.urgency === "frozen" && s.status !== "reported" && s.status !== "cancelled").length;
  const reportedMonth = my.filter((s) => s.status === "reported" && (s.reportedAt || "") >= monthStart).length;
  const malignantMonth = my.filter((s) => s.malignancy === "malignant" && (s.reportedAt || "") >= monthStart).length;
  const amendedMonth = my.filter((s) => s.status === "amended" && (s.reportedAt || "") >= monthStart).length;
  // TAT
  const tatPool = my.filter((s) => s.status === "reported" && s.reportedAt && s.reportedAt >= thirtyAgo);
  const avgTatHours = tatPool.length > 0 ? Math.round(tatPool.reduce((sum, s) => sum + (new Date(s.reportedAt!).getTime() - new Date(s.receivedAt).getTime()) / 3_600_000, 0) / tatPool.length * 10) / 10 : 0;
  const overdue = my.filter((s) => s.status !== "reported" && s.status !== "cancelled" && ((now.getTime() - new Date(s.receivedAt).getTime()) / 86_400_000) > 7).length;
  return {
    receivedToday, inProcess, frozenPending, reportedMonth, malignantMonth, amendedMonth, avgTatHours, overdue,
  };
}

export function unlinkPathologyForPatient(patientId: string, orgId: string): void {
  for (const s of specimens) {
    if (s.organizationId === orgId && s.patientId === patientId) {
      s.patientId = "";
      s.patientName = `[removed] ${s.patientName}`;
      s.updatedAt = new Date().toISOString();
    }
  }
  // flush:auto-unlink
  specimens.splice(specimens.length, 0);
}
