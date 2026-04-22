// Medical Records Department (MRD). Tenant-scoped.
// Two entities: ChartRecord (post-discharge chart with ICD codes) + RoiRequest (release-of-information).
// Detach-only cascade.

import { bindPersistentArray } from "../persistent-array";

export type ChartStatus = "open" | "deficient" | "coded" | "reviewed" | "closed" | "amended";
export type DeficiencyType = "missing_discharge_summary" | "missing_op_note" | "missing_signature" | "missing_consent" | "missing_pathology" | "incomplete_history" | "other";
export type RoiStatus = "requested" | "verifying" | "approved" | "released" | "denied" | "cancelled";
export type RoiPurpose = "patient_copy" | "insurance" | "legal" | "continuing_care" | "employer" | "research" | "other";

export interface IcdCode {
  code: string;
  description: string;
  type?: "principal" | "secondary" | "procedure";
}

export interface Deficiency {
  type: DeficiencyType;
  detail?: string;
  resolvedAt?: string;
}

export interface ChartRecord {
  id: string;                    // MRD-{suffix}-{seq}
  organizationId: string;
  patientId: string;
  patientName: string;
  admissionId?: string;
  encounterId?: string;
  admissionDate?: string;
  dischargeDate?: string;
  primaryDoctor?: string;
  department?: string;
  status: ChartStatus;
  codingSystem?: "ICD-10" | "ICD-11" | "ICD-10-CM";
  principalDiagnosis?: string;
  codes: IcdCode[];
  drgCode?: string;
  deficiencies: Deficiency[];
  coderName?: string;
  codedAt?: string;
  reviewerName?: string;
  reviewedAt?: string;
  lengthOfStayDays?: number;
  physicalLocation?: string;      // shelf / cabinet
  archived?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoiRequest {
  id: string;                    // ROI-{suffix}-{seq}
  organizationId: string;
  patientId: string;
  patientName: string;
  requesterName: string;
  requesterRelation?: string;
  purpose: RoiPurpose;
  purposeDetail?: string;
  dateRangeFrom?: string;
  dateRangeTo?: string;
  recordsRequested?: string;     // "full chart, lab results, imaging"
  deliveryMethod?: "pickup" | "email" | "courier" | "fax";
  deliveryTo?: string;
  status: RoiStatus;
  feeAmount?: number;
  feePaid?: boolean;
  consentVerified?: boolean;
  idVerified?: boolean;
  releasedAt?: string;
  releasedBy?: string;
  deniedReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const charts: ChartRecord[] = [];
const roi: RoiRequest[] = [];
const hydrateC = bindPersistentArray<ChartRecord>("mrd-charts", charts, () => []);
const hydrateR = bindPersistentArray<RoiRequest>("mrd-roi", roi, () => []);
await hydrateC;
await hydrateR;

export const CHART_STATUS_LABEL: Record<ChartStatus, string> = {
  open: "Open", deficient: "Deficient", coded: "Coded", reviewed: "Reviewed",
  closed: "Closed", amended: "Amended",
};
export const ROI_STATUS_LABEL: Record<RoiStatus, string> = {
  requested: "Requested", verifying: "Verifying", approved: "Approved",
  released: "Released", denied: "Denied", cancelled: "Cancelled",
};

function suf(o: string) { return o.slice(0, 4).toUpperCase(); }
function nextIdC(o: string) {
  const p = `MRD-${suf(o)}-`;
  const m = charts.filter((c) => c.id.startsWith(p)).reduce((mx, c) => Math.max(mx, Number(c.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}
function nextIdR(o: string) {
  const p = `ROI-${suf(o)}-`;
  const m = roi.filter((r) => r.id.startsWith(p)).reduce((mx, r) => Math.max(mx, Number(r.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}

export function listCharts(opts: { organizationId: string; status?: ChartStatus; patientId?: string; search?: string }): ChartRecord[] {
  const s = opts.search?.toLowerCase().trim();
  return charts.filter((c) => c.organizationId === opts.organizationId)
    .filter((c) => (opts.status ? c.status === opts.status : true))
    .filter((c) => (opts.patientId ? c.patientId === opts.patientId : true))
    .filter((c) => (s ? (c.patientName.toLowerCase().includes(s) || c.id.toLowerCase().includes(s) || (c.principalDiagnosis || "").toLowerCase().includes(s)) : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createChart(orgId: string, input: Partial<ChartRecord>): { ok: true; chart: ChartRecord } | { ok: false; error: string } {
  if (!input.patientId || !input.patientName) return { ok: false, error: "missing_required" };
  const now = new Date().toISOString();
  let los: number | undefined;
  if (input.admissionDate && input.dischargeDate) {
    los = Math.max(0, Math.round((new Date(input.dischargeDate).getTime() - new Date(input.admissionDate).getTime()) / 86_400_000));
  }
  const c: ChartRecord = {
    id: nextIdC(orgId), organizationId: orgId,
    patientId: input.patientId, patientName: input.patientName,
    admissionId: input.admissionId, encounterId: input.encounterId,
    admissionDate: input.admissionDate, dischargeDate: input.dischargeDate,
    primaryDoctor: input.primaryDoctor, department: input.department,
    status: (input.status || "open") as ChartStatus,
    codingSystem: input.codingSystem,
    principalDiagnosis: input.principalDiagnosis,
    codes: input.codes || [],
    drgCode: input.drgCode,
    deficiencies: input.deficiencies || [],
    physicalLocation: input.physicalLocation,
    lengthOfStayDays: los,
    notes: input.notes,
    createdAt: now, updatedAt: now,
  };
  charts.push(c);
  return { ok: true, chart: c };
}

export function updateChart(id: string, orgId: string, patch: Partial<ChartRecord>): ChartRecord | null {
  const i = charts.findIndex((c) => c.id === id && c.organizationId === orgId);
  if (i < 0) return null;
  const prev = charts[i];
  const now = new Date().toISOString();
  const next: ChartRecord = { ...prev, ...patch, id: prev.id, organizationId: prev.organizationId, updatedAt: now };
  if (next.admissionDate && next.dischargeDate) {
    next.lengthOfStayDays = Math.max(0, Math.round((new Date(next.dischargeDate).getTime() - new Date(next.admissionDate).getTime()) / 86_400_000));
  }
  if (next.status === "coded" && prev.status !== "coded" && !next.codedAt) next.codedAt = now;
  if (next.status === "reviewed" && prev.status !== "reviewed" && !next.reviewedAt) next.reviewedAt = now;
  charts[i] = next;
  return next;
}

export function deleteChart(id: string, orgId: string): boolean {
  const i = charts.findIndex((c) => c.id === id && c.organizationId === orgId);
  if (i < 0) return false;
  charts.splice(i, 1);
  return true;
}

export function listRoi(opts: { organizationId: string; status?: RoiStatus; patientId?: string }): RoiRequest[] {
  return roi.filter((r) => r.organizationId === opts.organizationId)
    .filter((r) => (opts.status ? r.status === opts.status : true))
    .filter((r) => (opts.patientId ? r.patientId === opts.patientId : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createRoi(orgId: string, input: Partial<RoiRequest>): { ok: true; roi: RoiRequest } | { ok: false; error: string } {
  if (!input.patientId || !input.patientName || !input.requesterName || !input.purpose) return { ok: false, error: "missing_required" };
  const now = new Date().toISOString();
  const r: RoiRequest = {
    id: nextIdR(orgId), organizationId: orgId,
    patientId: input.patientId, patientName: input.patientName,
    requesterName: input.requesterName, requesterRelation: input.requesterRelation,
    purpose: input.purpose, purposeDetail: input.purposeDetail,
    dateRangeFrom: input.dateRangeFrom, dateRangeTo: input.dateRangeTo,
    recordsRequested: input.recordsRequested,
    deliveryMethod: input.deliveryMethod, deliveryTo: input.deliveryTo,
    status: "requested",
    feeAmount: input.feeAmount, feePaid: !!input.feePaid,
    consentVerified: !!input.consentVerified, idVerified: !!input.idVerified,
    notes: input.notes,
    createdAt: now, updatedAt: now,
  };
  roi.push(r);
  return { ok: true, roi: r };
}

export function updateRoi(id: string, orgId: string, patch: Partial<RoiRequest>): RoiRequest | null {
  const i = roi.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return null;
  const prev = roi[i];
  const now = new Date().toISOString();
  const next: RoiRequest = { ...prev, ...patch, id: prev.id, organizationId: prev.organizationId, updatedAt: now };
  if (next.status === "released" && prev.status !== "released" && !next.releasedAt) next.releasedAt = now;
  roi[i] = next;
  return next;
}

export function deleteRoi(id: string, orgId: string): boolean {
  const i = roi.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return false;
  roi.splice(i, 1);
  return true;
}

export function computeStats(orgId: string) {
  const myC = charts.filter((c) => c.organizationId === orgId);
  const myR = roi.filter((r) => r.organizationId === orgId);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const openCharts = myC.filter((c) => c.status === "open" || c.status === "deficient").length;
  const deficientCharts = myC.filter((c) => c.status === "deficient" || c.deficiencies.some((d) => !d.resolvedAt)).length;
  const codedThisWeek = myC.filter((c) => c.status === "coded" && (c.codedAt || "") >= weekAgo).length;
  const overdueCoding = myC.filter((c) => (c.status === "open" || c.status === "deficient") && c.dischargeDate && (now.getTime() - new Date(c.dischargeDate).getTime()) / 86_400_000 > 30).length;
  const roiPending = myR.filter((r) => r.status === "requested" || r.status === "verifying" || r.status === "approved").length;
  const roiReleasedMonth = myR.filter((r) => r.status === "released" && (r.releasedAt || "") >= monthStart).length;
  const roiDeniedMonth = myR.filter((r) => r.status === "denied" && r.updatedAt >= monthStart).length;
  const avgLosMonth = (() => {
    const pool = myC.filter((c) => c.dischargeDate && c.dischargeDate >= monthStart && c.lengthOfStayDays != null);
    return pool.length ? Math.round(pool.reduce((s, c) => s + (c.lengthOfStayDays || 0), 0) / pool.length * 10) / 10 : 0;
  })();
  return { openCharts, deficientCharts, codedThisWeek, overdueCoding, roiPending, roiReleasedMonth, roiDeniedMonth, avgLosMonth };
}

export function unlinkMrdForPatient(patientId: string, orgId: string): void {
  const stamp = new Date().toISOString();
  for (const c of charts) {
    if (c.organizationId === orgId && c.patientId === patientId) {
      c.patientId = "";
      c.patientName = `[removed] ${c.patientName}`;
      c.updatedAt = stamp;
    }
  }
  for (const r of roi) {
    if (r.organizationId === orgId && r.patientId === patientId) {
      r.patientId = "";
      r.patientName = `[removed] ${r.patientName}`;
      if (r.status === "requested" || r.status === "verifying" || r.status === "approved") {
        r.status = "cancelled";
      }
      r.updatedAt = stamp;
    }
  }
  // flush:auto-unlink
  charts.splice(charts.length, 0);
}
