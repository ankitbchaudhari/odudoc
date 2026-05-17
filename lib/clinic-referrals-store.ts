// Clinic → clinic referrals.
//
// When a clinic sees a patient who needs care outside their scope —
// e.g. a GP referring to a cardiologist's clinic, or a small clinic
// referring to a hospital with imaging — they send a referral through
// OduDoc. The receiving clinic sees it on their dashboard and can
// accept, decline, or just acknowledge.
//
// Distinct from lib/doctor-referrals-store.ts (which is a patient
// referring a doctor to OduDoc, for invite-tracking).

import { bindPersistentArray } from "./persistent-array";
import { phoneKey } from "./phone-match";

export type ReferralStatus =
  | "sent"        // referring clinic submitted; receiving clinic hasn't acted
  | "accepted"    // receiving clinic accepted, patient flow continues
  | "declined"    // receiving clinic declined (capacity, specialty mismatch, etc.)
  | "completed"   // receiving clinic completed the referred visit
  | "cancelled";  // referring clinic withdrew

export type ReferralUrgency = "routine" | "urgent" | "emergency";

export interface ClinicReferral {
  id: string; // CR-XXXX
  fromClinicId: string;
  fromClinicName: string;
  toClinicId: string;
  toClinicName: string;

  // Patient identity. We DON'T link by patientUserId because the
  // patient may not have an OduDoc account yet — the receiving
  // clinic will lookup or create one on intake.
  patientName: string;
  patientPhone: string;       // normalized via phoneKey() on save
  patientEmail?: string;
  patientAgeYears?: number;
  patientSex?: "male" | "female" | "other";

  // The visit this referral originated from (if any). Lets the
  // receiving clinic open the prior EMR with one click.
  sourceBookingId?: string;

  reason: string;             // free text — "needs cardiac echo", etc.
  specialty?: string;         // optional — receiving clinic filter hint
  urgency: ReferralUrgency;
  note?: string;              // additional clinical context for receiver

  status: ReferralStatus;
  statusReason?: string;      // why declined / cancelled
  acknowledgedAt?: string;    // when receiving clinic first opened it

  createdByStaffId: string;   // referring clinic's staff who sent it
  createdAt: string;
  updatedAt: string;
}

const referrals: ClinicReferral[] = [];
const { hydrate, flush, reload } = bindPersistentArray<ClinicReferral>(
  "clinic_referrals",
  referrals,
  () => [],
);
await hydrate();

export async function reloadClinicReferrals(): Promise<void> {
  await reload();
}

let nextSeq = referrals.reduce((max, r) => {
  const m = /^CR-(\d+)$/.exec(r.id);
  const n = m ? parseInt(m[1], 10) : 0;
  return n > max ? n : max;
}, 1000) + 1;

export interface CreateReferralInput {
  fromClinicId: string;
  fromClinicName: string;
  toClinicId: string;
  toClinicName: string;
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  patientAgeYears?: number;
  patientSex?: "male" | "female" | "other";
  sourceBookingId?: string;
  reason: string;
  specialty?: string;
  urgency?: ReferralUrgency;
  note?: string;
  createdByStaffId: string;
}

export function createClinicReferral(input: CreateReferralInput): ClinicReferral {
  // Race-safe id — same pattern as bookings-store / clinics-store.
  const maxExisting = referrals.reduce((max, r) => {
    const m = /^CR-(\d+)$/.exec(r.id);
    const n = m ? parseInt(m[1], 10) : 0;
    return n > max ? n : max;
  }, 1000);
  const candidate = Math.max(nextSeq, maxExisting + 1);
  nextSeq = candidate + 1;
  const now = new Date().toISOString();
  const row: ClinicReferral = {
    id: `CR-${candidate}`,
    fromClinicId: input.fromClinicId,
    fromClinicName: input.fromClinicName,
    toClinicId: input.toClinicId,
    toClinicName: input.toClinicName,
    patientName: input.patientName.trim(),
    // Normalize so phoneKey-based lookups later can match across formats.
    patientPhone: input.patientPhone.trim(),
    patientEmail: input.patientEmail?.trim().toLowerCase(),
    patientAgeYears: input.patientAgeYears,
    patientSex: input.patientSex,
    sourceBookingId: input.sourceBookingId,
    reason: input.reason.trim(),
    specialty: input.specialty?.trim() || undefined,
    urgency: input.urgency || "routine",
    note: input.note?.trim() || undefined,
    status: "sent",
    createdByStaffId: input.createdByStaffId,
    createdAt: now,
    updatedAt: now,
  };
  referrals.unshift(row);
  flush();
  return row;
}

export function listOutboundReferrals(clinicId: string): ClinicReferral[] {
  return referrals
    .filter((r) => r.fromClinicId === clinicId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listInboundReferrals(clinicId: string): ClinicReferral[] {
  return referrals
    .filter((r) => r.toClinicId === clinicId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listReferralsForPatientPhone(phone: string): ClinicReferral[] {
  const target = phoneKey(phone);
  if (!target) return [];
  return referrals
    .filter((r) => phoneKey(r.patientPhone) === target)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getReferralById(id: string): ClinicReferral | undefined {
  return referrals.find((r) => r.id === id);
}

export function updateReferralStatus(
  id: string,
  status: ReferralStatus,
  opts: { reason?: string; clinicId?: string } = {},
): ClinicReferral | null {
  const r = referrals.find((x) => x.id === id);
  if (!r) return null;
  // The receiving clinic is the only party that can accept/decline/
  // complete. The referring clinic is the only one that can cancel.
  if (opts.clinicId) {
    const receivingActions: ReferralStatus[] = ["accepted", "declined", "completed"];
    const referringActions: ReferralStatus[] = ["cancelled"];
    if (receivingActions.includes(status) && opts.clinicId !== r.toClinicId) return null;
    if (referringActions.includes(status) && opts.clinicId !== r.fromClinicId) return null;
  }
  r.status = status;
  r.statusReason = opts.reason;
  r.updatedAt = new Date().toISOString();
  if (status === "accepted" && !r.acknowledgedAt) {
    r.acknowledgedAt = r.updatedAt;
  }
  flush();
  return r;
}

/** Inbound referrals waiting for the receiving clinic to act on. */
export function countPendingInbound(clinicId: string): number {
  return referrals.filter(
    (r) => r.toClinicId === clinicId && r.status === "sent",
  ).length;
}
