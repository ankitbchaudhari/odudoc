// Prescriptions store — Postgres-backed via bindPersistentArray.
//
// The full prescription payload (doctor, patient, medications, signature, ...)
// is kept server-side so any viewer — patient dashboard, admin audit, or the
// re-print page — renders the exact same record a doctor wrote.

import type { PrescriptionData } from "./prescription-templates";
import { bindPersistentArray } from "./persistent-array";

export interface PrescriptionRecord {
  id: string;
  createdAt: string;
  doctorEmail: string;
  patientEmail: string;
  templateId: string;
  data: PrescriptionData;
  status: "active" | "cancelled";
}

const prescriptions: PrescriptionRecord[] = [];
const { hydrate, flush } = bindPersistentArray<PrescriptionRecord>(
  "prescriptions",
  prescriptions,
  () => []
);
await hydrate();

export function addPrescription(
  input: Omit<PrescriptionRecord, "id" | "createdAt" | "status">
): PrescriptionRecord {
  const rx: PrescriptionRecord = {
    ...input,
    id: `rx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    status: "active",
  };
  prescriptions.unshift(rx);
  flush();
  return rx;
}

export function listPrescriptions(filter?: {
  doctorEmail?: string;
  patientEmail?: string;
}): PrescriptionRecord[] {
  let out = [...prescriptions];
  if (filter?.doctorEmail) {
    out = out.filter((p) => p.doctorEmail.toLowerCase() === filter.doctorEmail!.toLowerCase());
  }
  if (filter?.patientEmail) {
    out = out.filter((p) => p.patientEmail.toLowerCase() === filter.patientEmail!.toLowerCase());
  }
  return out;
}

export function getPrescription(id: string): PrescriptionRecord | null {
  return prescriptions.find((p) => p.id === id) || null;
}

export function cancelPrescription(id: string): PrescriptionRecord | null {
  const rx = prescriptions.find((p) => p.id === id);
  if (!rx) return null;
  rx.status = "cancelled";
  flush();
  return rx;
}
