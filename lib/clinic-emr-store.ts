// Clinic EMR — one record per patient visit at a clinic. Created when
// reception scans a booking QR (or types the booking ID) and clicks
// "Save to clinic EMR". Records are keyed by bookingId for idempotency:
// re-saving updates the same record. Patient-claimable by phone: when a
// patient creates an OduDoc account, we surface any EMR records matching
// their phone number under "Past visits at clinics".

import { bindPersistentArray } from "./persistent-array";

export interface ClinicEmrAttachment {
  url: string;
  label: string;
  uploadedAt: string;
}

export interface ClinicEmrEntry {
  id: string;                 // EMR-XXXX
  bookingId: string;          // BK-XXXX (unique per visit)
  clinicId: string;
  doctorId: string;

  // Patient identity — phone is the join key for future claim. Email is
  // optional. patientUserId is filled once the patient links their OduDoc
  // account to this entry (claim-bookings flow).
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  patientUserId?: string;

  // Visit data
  visitDate: string;          // YYYY-MM-DD
  arrivedAt?: string;         // ISO when reception marked arrived
  chiefComplaint?: string;
  vitals?: {
    bpSystolic?: number;
    bpDiastolic?: number;
    pulseBpm?: number;
    temperatureC?: number;
    respiratoryRate?: number;
    spo2?: number;
    weightKg?: number;
    heightCm?: number;
  };
  diagnosis?: string;
  prescriptionText?: string;
  notes?: string;
  attachments?: ClinicEmrAttachment[];

  // Audit
  createdByStaffId?: string;
  createdAt: string;
  updatedAt: string;
}

const entries: ClinicEmrEntry[] = [];
const { hydrate, flush, reload } = bindPersistentArray<ClinicEmrEntry>(
  "clinic_emr",
  entries,
  () => []
);
await hydrate();

/** Force a re-pull from Postgres. Needed on cross-Lambda paths like
 *  patient signup verification → claim and /dashboard/visits — the
 *  Lambda serving the read may have an older snapshot than the one
 *  that wrote the EMR row at reception. */
export async function reloadEmr(): Promise<void> {
  await reload();
}

let nextId = entries.reduce((max, e) => {
  const m = /^EMR-(\d+)$/.exec(e.id);
  const n = m ? parseInt(m[1], 10) : 0;
  return n > max ? n : max;
}, 1000) + 1;

export function getEmrByBookingId(bookingId: string): ClinicEmrEntry | undefined {
  return entries.find((e) => e.bookingId === bookingId);
}

export function listEmrByClinic(clinicId: string): ClinicEmrEntry[] {
  return entries
    .filter((e) => e.clinicId === clinicId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** All EMR rows that match this phone (E.164 or any consistent form).
 *  Patient-side: shown on patient dashboard once they claim by phone. */
export function listEmrByPatientPhone(phone: string): ClinicEmrEntry[] {
  const normalized = normalizePhone(phone);
  return entries
    .filter((e) => normalizePhone(e.patientPhone) === normalized)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listEmrByPatientUserId(userId: string): ClinicEmrEntry[] {
  return entries
    .filter((e) => e.patientUserId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Idempotent upsert keyed by bookingId. Reception re-saving the same
 *  visit (e.g. to add diagnosis after consult) updates the existing row. */
export function upsertEmrEntry(input: {
  bookingId: string;
  clinicId: string;
  doctorId: string;
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  visitDate: string;
  arrivedAt?: string;
  chiefComplaint?: string;
  vitals?: ClinicEmrEntry["vitals"];
  diagnosis?: string;
  prescriptionText?: string;
  notes?: string;
  attachments?: ClinicEmrAttachment[];
  createdByStaffId?: string;
}): ClinicEmrEntry {
  const existing = getEmrByBookingId(input.bookingId);
  const now = new Date().toISOString();
  if (existing) {
    Object.assign(existing, {
      ...input,
      updatedAt: now,
    });
    flush();
    return existing;
  }
  const record: ClinicEmrEntry = {
    id: `EMR-${nextId++}`,
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  entries.push(record);
  flush();
  return record;
}

/** Patient claim hook — when a patient creates an OduDoc account, scan
 *  unclaimed EMR rows matching their phone and stamp patientUserId.
 *  Returns the count of rows claimed. */
export function claimEmrForUser(userId: string, phone: string): number {
  const normalized = normalizePhone(phone);
  let n = 0;
  for (const e of entries) {
    if (!e.patientUserId && normalizePhone(e.patientPhone) === normalized) {
      e.patientUserId = userId;
      e.updatedAt = new Date().toISOString();
      n++;
    }
  }
  if (n > 0) flush();
  return n;
}

function normalizePhone(p: string): string {
  return (p || "").replace(/[^\d]/g, "").replace(/^0+/, "");
}
