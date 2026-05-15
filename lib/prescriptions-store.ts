// Prescriptions store — Postgres-backed via bindPersistentArray.
//
// The full prescription payload (doctor, patient, medications, signature, ...)
// is kept server-side so any viewer — patient dashboard, admin audit, or the
// re-print page — renders the exact same record a doctor wrote.

import type { PrescriptionData } from "./prescription-templates";
import { bindPersistentArray } from "./persistent-array";
import { pushNotification } from "./notifications/store";
import { findUserByEmail } from "./users-store";

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
const { hydrate, flush, reload } = bindPersistentArray<PrescriptionRecord>(
  "prescriptions",
  prescriptions,
  () => []
);
await hydrate();

/** Cross-Lambda freshness — call before reading prescriptions so a
 *  doctor's just-issued Rx is visible on the patient's view served by
 *  a sibling Lambda. */
export async function reloadPrescriptions(): Promise<void> {
  await reload();
}

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
  // Patient-facing notification. patientEmail → userId resolves
  // for registered users; unregistered email-only entries silently
  // skip the push (no inbox to deliver to).
  if (rx.patientEmail) {
    const u = findUserByEmail(rx.patientEmail);
    if (u) {
      const medCount = rx.data.medications?.length || 0;
      pushNotification({
        userId: u.id, kind: "rx_ready", severity: "success",
        title: "New prescription issued",
        body: medCount
          ? `${medCount} medication${medCount === 1 ? "" : "s"} from ${rx.data.doctorName || rx.doctorEmail}.`
          : `From ${rx.data.doctorName || rx.doctorEmail}.`,
        link: `/dashboard/prescriptions`,
        reference: `rx:${rx.id}:issued`,
      });
    }
  }
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
  if (rx.status === "cancelled") return rx; // idempotent
  rx.status = "cancelled";
  flush();
  if (rx.patientEmail) {
    const u = findUserByEmail(rx.patientEmail);
    if (u) {
      pushNotification({
        userId: u.id, kind: "rx_ready", severity: "warn",
        title: "Prescription cancelled",
        body: `From ${rx.data.doctorName || rx.doctorEmail}. Tap to review.`,
        link: `/dashboard/prescriptions`,
        reference: `rx:${rx.id}:cancelled`,
      });
    }
  }
  return rx;
}
