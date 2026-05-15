// Patient-driven doctor referrals.
//
// Patients can suggest their own GPs to OduDoc — strongest possible
// signal for cold outreach because the doctor already trusts the
// patient. We store the referral, send a soft email to the doctor
// from the patient, and ping the admin so they can do warm
// follow-up.

import { bindPersistentArray } from "./persistent-array";

export interface DoctorReferral {
  id: string;
  /** Email of the patient who made the referral. */
  referredBy: string;
  referredByName?: string;
  /** Doctor being referred. */
  doctorName: string;
  doctorEmail?: string;
  doctorPhone?: string;
  doctorSpecialty?: string;
  clinicName?: string;
  city?: string;
  note?: string;
  /** Lifecycle */
  status: "submitted" | "contacted" | "joined" | "declined";
  /** When the cold-outreach email was sent. */
  contactedAt?: string;
  /** When the doctor created an OduDoc account (matched by email). */
  joinedAt?: string;
  createdAt: string;
}

const referrals: DoctorReferral[] = [];
const { hydrate, flush, reload } = bindPersistentArray<DoctorReferral>(
  "doctor-referrals",
  referrals,
  () => [],
);
await hydrate();

export async function reloadDoctorReferrals(): Promise<void> {
  await reload();
}

const now = () => new Date().toISOString();
const genId = () =>
  `dr-ref-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export interface CreateInput {
  referredBy: string;
  referredByName?: string;
  doctorName: string;
  doctorEmail?: string;
  doctorPhone?: string;
  doctorSpecialty?: string;
  clinicName?: string;
  city?: string;
  note?: string;
}

export function createDoctorReferral(input: CreateInput): DoctorReferral {
  const r: DoctorReferral = {
    id: genId(),
    referredBy: input.referredBy.trim().toLowerCase(),
    referredByName: input.referredByName?.trim() || undefined,
    doctorName: input.doctorName.trim(),
    doctorEmail: input.doctorEmail?.trim().toLowerCase() || undefined,
    doctorPhone: input.doctorPhone?.trim() || undefined,
    doctorSpecialty: input.doctorSpecialty?.trim() || undefined,
    clinicName: input.clinicName?.trim() || undefined,
    city: input.city?.trim() || undefined,
    note: input.note?.trim() || undefined,
    status: "submitted",
    createdAt: now(),
  };
  referrals.unshift(r);
  flush();
  return r;
}

export function listReferralsByPatient(email: string): DoctorReferral[] {
  const e = email.trim().toLowerCase();
  return referrals.filter((r) => r.referredBy === e);
}

export function listAllReferrals(): DoctorReferral[] {
  return [...referrals].sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1,
  );
}

export function updateReferralStatus(
  id: string,
  status: DoctorReferral["status"],
): DoctorReferral | null {
  const r = referrals.find((x) => x.id === id);
  if (!r) return null;
  r.status = status;
  if (status === "contacted") r.contactedAt = now();
  if (status === "joined") r.joinedAt = now();
  flush();
  return r;
}

export function countReferralsByPatient(email: string): number {
  const e = email.trim().toLowerCase();
  return referrals.filter((r) => r.referredBy === e).length;
}
