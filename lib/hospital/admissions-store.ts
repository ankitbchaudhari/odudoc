// Admissions — in-patient lifecycle. Tenant-scoped.
//
// An admission links a patient to a ward/bed for a stay. Creating one
// occupies the bed; discharge frees it. Bed transfers update both old and
// new bed atomically. Charges for room & board are computed on demand from
// admittedAt / dischargedAt × bed daily rate (see estimateRoomCharge).

import { bindPersistentArray } from "../persistent-array";
import {
  occupyBed,
  freeBed,
  findBed,
  bedDailyRate,
} from "./wards-store";

export type AdmissionStatus = "admitted" | "discharged" | "cancelled";

export interface BedAssignment {
  wardId: string;
  bedId: string;
  from: string; // ISO
  to?: string; // ISO; open-ended while current
}

export interface Admission {
  id: string;
  organizationId: string;
  patientId: string;
  admittingDoctor?: string;
  admittingDepartment?: string;
  encounterId?: string;
  chiefComplaint?: string;
  provisionalDiagnosis?: string;
  finalDiagnosis?: string;
  dischargeSummary?: string;
  dischargeDisposition?:
    | "home"
    | "transferred"
    | "lama" // left against medical advice
    | "expired"
    | "referred"
    | "other";
  history: BedAssignment[]; // ordered oldest → newest
  currentWardId?: string;
  currentBedId?: string;
  status: AdmissionStatus;
  admittedAt: string;
  dischargedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const admissions: Admission[] = [];
const { hydrate, flush } = bindPersistentArray<Admission>(
  "hospital-admissions",
  admissions,
  () => []
);
await hydrate();

export function listAdmissions(opts: {
  organizationId: string;
  patientId?: string;
  status?: AdmissionStatus;
  wardId?: string;
}): Admission[] {
  let list = admissions.filter(
    (a) => a.organizationId === opts.organizationId
  );
  if (opts.patientId) list = list.filter((a) => a.patientId === opts.patientId);
  if (opts.status) list = list.filter((a) => a.status === opts.status);
  if (opts.wardId) list = list.filter((a) => a.currentWardId === opts.wardId);
  return list.sort(
    (a, b) => new Date(b.admittedAt).getTime() - new Date(a.admittedAt).getTime()
  );
}

export function getAdmissionById(
  id: string,
  organizationId: string
): Admission | null {
  const a = admissions.find((x) => x.id === id);
  if (!a || a.organizationId !== organizationId) return null;
  return a;
}

export interface AdmissionInput {
  patientId: string;
  bedId: string; // required — must be available
  admittingDoctor?: string;
  admittingDepartment?: string;
  encounterId?: string;
  chiefComplaint?: string;
  provisionalDiagnosis?: string;
  admittedAt?: string;
  notes?: string;
}

export type AdmitResult =
  | { ok: true; admission: Admission }
  | { ok: false; error: string };

export function admitPatient(
  organizationId: string,
  input: AdmissionInput
): AdmitResult {
  const hit = findBed(input.bedId, organizationId);
  if (!hit) return { ok: false, error: "bed_not_found" };
  if (hit.bed.status !== "available") {
    return { ok: false, error: "bed_not_available" };
  }
  const now = new Date().toISOString();
  const admittedAt = input.admittedAt || now;
  const admission: Admission = {
    id: `adm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    patientId: input.patientId,
    admittingDoctor: input.admittingDoctor?.trim() || undefined,
    admittingDepartment: input.admittingDepartment?.trim() || undefined,
    encounterId: input.encounterId || undefined,
    chiefComplaint: input.chiefComplaint?.trim() || undefined,
    provisionalDiagnosis: input.provisionalDiagnosis?.trim() || undefined,
    history: [
      { wardId: hit.ward.id, bedId: hit.bed.id, from: admittedAt },
    ],
    currentWardId: hit.ward.id,
    currentBedId: hit.bed.id,
    status: "admitted",
    admittedAt,
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  const occ = occupyBed(input.bedId, organizationId, admission.id);
  if (!occ) return { ok: false, error: "occupy_failed" };
  admissions.unshift(admission);
  flush();
  return { ok: true, admission };
}

export type TransferResult =
  | { ok: true; admission: Admission }
  | { ok: false; error: string };

export function transferBed(
  id: string,
  organizationId: string,
  newBedId: string
): TransferResult {
  const a = admissions.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!a) return { ok: false, error: "not_found" };
  if (a.status !== "admitted") return { ok: false, error: "not_active" };
  if (a.currentBedId === newBedId) return { ok: false, error: "same_bed" };
  const hit = findBed(newBedId, organizationId);
  if (!hit) return { ok: false, error: "bed_not_found" };
  if (hit.bed.status !== "available") return { ok: false, error: "bed_not_available" };

  const now = new Date().toISOString();
  // Close prior assignment.
  const prior = a.history[a.history.length - 1];
  if (prior && !prior.to) prior.to = now;
  // Free prior bed.
  if (a.currentBedId) freeBed(a.currentBedId, organizationId);
  // Occupy new.
  const occ = occupyBed(newBedId, organizationId, a.id);
  if (!occ) return { ok: false, error: "occupy_failed" };

  a.history.push({ wardId: hit.ward.id, bedId: hit.bed.id, from: now });
  a.currentWardId = hit.ward.id;
  a.currentBedId = hit.bed.id;
  a.updatedAt = now;
  flush();
  return { ok: true, admission: a };
}

export interface DischargeInput {
  dischargeSummary?: string;
  finalDiagnosis?: string;
  dischargeDisposition?: Admission["dischargeDisposition"];
  dischargedAt?: string;
}

export function dischargePatient(
  id: string,
  organizationId: string,
  input: DischargeInput
): Admission | null {
  const a = admissions.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!a) return null;
  if (a.status !== "admitted") return null;
  const now = new Date().toISOString();
  const when = input.dischargedAt || now;
  if (a.currentBedId) freeBed(a.currentBedId, organizationId);
  const prior = a.history[a.history.length - 1];
  if (prior && !prior.to) prior.to = when;
  a.status = "discharged";
  a.dischargedAt = when;
  a.dischargeSummary = input.dischargeSummary?.trim() || a.dischargeSummary;
  a.finalDiagnosis = input.finalDiagnosis?.trim() || a.finalDiagnosis;
  a.dischargeDisposition = input.dischargeDisposition || a.dischargeDisposition;
  a.currentBedId = undefined;
  a.currentWardId = undefined;
  a.updatedAt = now;
  flush();
  return a;
}

export function cancelAdmission(
  id: string,
  organizationId: string
): Admission | null {
  const a = admissions.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!a) return null;
  if (a.status !== "admitted") return null;
  if (a.currentBedId) freeBed(a.currentBedId, organizationId);
  const prior = a.history[a.history.length - 1];
  const now = new Date().toISOString();
  if (prior && !prior.to) prior.to = now;
  a.status = "cancelled";
  a.currentBedId = undefined;
  a.currentWardId = undefined;
  a.updatedAt = now;
  flush();
  return a;
}

export function updateAdmissionNotes(
  id: string,
  organizationId: string,
  patch: {
    notes?: string;
    chiefComplaint?: string;
    provisionalDiagnosis?: string;
    admittingDoctor?: string;
    admittingDepartment?: string;
  }
): Admission | null {
  const a = admissions.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!a) return null;
  if (patch.notes !== undefined) a.notes = patch.notes;
  if (patch.chiefComplaint !== undefined) a.chiefComplaint = patch.chiefComplaint;
  if (patch.provisionalDiagnosis !== undefined)
    a.provisionalDiagnosis = patch.provisionalDiagnosis;
  if (patch.admittingDoctor !== undefined)
    a.admittingDoctor = patch.admittingDoctor;
  if (patch.admittingDepartment !== undefined)
    a.admittingDepartment = patch.admittingDepartment;
  a.updatedAt = new Date().toISOString();
  flush();
  return a;
}

// Estimate room-and-board charge for an admission based on bed daily rates
// summed across the history timeline. Counts any partial day as a full day.
export function estimateRoomCharge(
  id: string,
  organizationId: string
): number {
  const a = admissions.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!a) return 0;
  let total = 0;
  for (const seg of a.history) {
    const from = new Date(seg.from).getTime();
    const to = seg.to
      ? new Date(seg.to).getTime()
      : a.dischargedAt
        ? new Date(a.dischargedAt).getTime()
        : Date.now();
    const ms = Math.max(0, to - from);
    const days = Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
    total += days * bedDailyRate(seg.bedId, organizationId);
  }
  return Math.round(total * 100) / 100;
}

export function deleteAdmissionsForPatient(
  patientId: string,
  organizationId: string
): number {
  let removed = 0;
  for (let i = admissions.length - 1; i >= 0; i--) {
    const a = admissions[i];
    if (a.patientId === patientId && a.organizationId === organizationId) {
      if (a.status === "admitted" && a.currentBedId) {
        freeBed(a.currentBedId, organizationId);
      }
      admissions.splice(i, 1);
      removed++;
    }
  }
  if (removed) flush();
  return removed;
}
