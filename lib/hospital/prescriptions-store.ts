// Hospital ERP prescriptions — tenant-scoped medication orders.
//
// Distinct from the legacy lib/prescriptions-store.ts (which models the
// single-tenant doctor→patient e-prescription flow). This one is the
// hospital workflow: during or after an encounter, a clinician issues a
// list of medications which pharmacy will dispense against inventory.

import { bindPersistentArray } from "../persistent-array";

export type PrescriptionStatus =
  | "active"
  | "completed"
  | "cancelled"
  | "on_hold";

export interface PrescriptionItem {
  drugName: string;
  strength?: string; // "500mg"
  form?: string; // "tablet", "syrup", "injection"
  dose?: string; // "1 tablet"
  frequency?: string; // "TID", "BID", "every 8h"
  route?: string; // "PO", "IV", "IM", "topical"
  durationDays?: number;
  quantity?: number;
  instructions?: string; // "after food"
}

export interface HospitalPrescription {
  id: string;
  organizationId: string;
  patientId: string;
  encounterId?: string;
  doctorName?: string;
  items: PrescriptionItem[];
  diagnosis?: string;
  notes?: string;
  status: PrescriptionStatus;
  issuedAt: string;
  createdAt: string;
  updatedAt: string;
}

const prescriptions: HospitalPrescription[] = [];
const { hydrate, flush } = bindPersistentArray<HospitalPrescription>(
  "hospital-prescriptions",
  prescriptions,
  () => []
);
await hydrate();

function cleanItem(i: PrescriptionItem): PrescriptionItem {
  return {
    drugName: i.drugName.trim(),
    strength: i.strength?.trim() || undefined,
    form: i.form?.trim() || undefined,
    dose: i.dose?.trim() || undefined,
    frequency: i.frequency?.trim() || undefined,
    route: i.route?.trim() || undefined,
    durationDays: i.durationDays,
    quantity: i.quantity,
    instructions: i.instructions?.trim() || undefined,
  };
}

export function listPrescriptions(opts: {
  organizationId: string;
  patientId?: string;
  encounterId?: string;
  status?: PrescriptionStatus;
}): HospitalPrescription[] {
  let list = prescriptions.filter(
    (p) => p.organizationId === opts.organizationId
  );
  if (opts.patientId) list = list.filter((p) => p.patientId === opts.patientId);
  if (opts.encounterId) list = list.filter((p) => p.encounterId === opts.encounterId);
  if (opts.status) list = list.filter((p) => p.status === opts.status);
  return list.sort(
    (a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
  );
}

export function getPrescriptionById(
  id: string,
  organizationId: string
): HospitalPrescription | null {
  const p = prescriptions.find((x) => x.id === id);
  if (!p || p.organizationId !== organizationId) return null;
  return p;
}

export interface PrescriptionInput {
  patientId: string;
  encounterId?: string;
  doctorName?: string;
  items: PrescriptionItem[];
  diagnosis?: string;
  notes?: string;
  issuedAt?: string;
}

export function createPrescription(
  organizationId: string,
  input: PrescriptionInput
): HospitalPrescription {
  const now = new Date().toISOString();
  const p: HospitalPrescription = {
    id: `hrx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    patientId: input.patientId,
    encounterId: input.encounterId || undefined,
    doctorName: input.doctorName?.trim() || undefined,
    items: (input.items || [])
      .filter((i) => i.drugName?.trim())
      .map(cleanItem),
    diagnosis: input.diagnosis?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    status: "active",
    issuedAt: input.issuedAt || now,
    createdAt: now,
    updatedAt: now,
  };
  prescriptions.unshift(p);
  flush();
  return p;
}

export function updatePrescription(
  id: string,
  organizationId: string,
  patch: Partial<PrescriptionInput & { status: PrescriptionStatus }>
): HospitalPrescription | null {
  const p = prescriptions.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!p) return null;
  if (patch.doctorName !== undefined) p.doctorName = patch.doctorName?.trim() || undefined;
  if (patch.encounterId !== undefined) p.encounterId = patch.encounterId || undefined;
  if (patch.items !== undefined) {
    p.items = patch.items.filter((i) => i.drugName?.trim()).map(cleanItem);
  }
  if (patch.diagnosis !== undefined) p.diagnosis = patch.diagnosis?.trim() || undefined;
  if (patch.notes !== undefined) p.notes = patch.notes?.trim() || undefined;
  if (patch.status !== undefined) p.status = patch.status;
  if (patch.issuedAt !== undefined) p.issuedAt = patch.issuedAt;
  p.updatedAt = new Date().toISOString();
  flush();
  return p;
}

export function deletePrescription(id: string, organizationId: string): boolean {
  const i = prescriptions.findIndex(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (i < 0) return false;
  prescriptions.splice(i, 1);
  flush();
  return true;
}

export function deletePrescriptionsForPatient(
  patientId: string,
  organizationId: string
): number {
  let removed = 0;
  for (let i = prescriptions.length - 1; i >= 0; i--) {
    const p = prescriptions[i];
    if (p.patientId === patientId && p.organizationId === organizationId) {
      prescriptions.splice(i, 1);
      removed++;
    }
  }
  if (removed) flush();
  return removed;
}
