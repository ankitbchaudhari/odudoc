// Consultations store — end-to-end video consultation workflow.
//
// Lifecycle:
//   pending_payment → awaiting_doctor → (approved | rejected | rescheduled)
//   approved → in_progress → completed (+prescription)
//   rejected → refunded
//
// PERSISTENCE: backed by Postgres via the `app_kv` JSONB table. The in-memory
// array is hydrated from the DB on first use per Lambda instance, and every
// mutation triggers a background write back. Callers MUST `await ready()`
// at the top of their request handler before calling any sync function.

import { listDoctors } from "./doctors-store";
import { bindPersistentArray } from "./persistent-array";

export type ConsultationStatus =
  | "pending_payment"
  | "awaiting_doctor"
  | "approved"
  | "rejected"
  | "rescheduled"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "refunded";

export type DecisionAction = "approved" | "rejected" | "rescheduled";

export interface MedicalHistory {
  chiefComplaint: string;
  symptoms: string;
  duration: string;
  severity: "mild" | "moderate" | "severe" | "";
  allergies: string;
  currentMedications: string;
  pastConditions: string;
  surgeries: string;
  familyHistory: string;
  smoker: "yes" | "no" | "former" | "";
  alcohol: "never" | "occasional" | "regular" | "";
  pregnant: "yes" | "no" | "na" | "";
  additional: string;
}

export interface ConsultationDocument {
  id: string;
  name: string;
  mime: string;
  size: number;
  dataUrl: string;
  uploadedAt: string;
  uploadedBy: "patient" | "doctor";
}

export interface DoctorDecision {
  action: DecisionAction;
  at: string;
  reason?: string;
  rescheduleTo?: string;
  rescheduleSlot?: string;
}

export interface AvailabilityRequest {
  requestedAt: string;
  message?: string;
  respondedAt?: string;
  available?: boolean;
  patientNote?: string;
}

export interface Refund {
  id: string;
  provider: "stripe" | "induspays" | "manual";
  amount: number;
  createdAt: string;
  reason?: string;
  succeeded: boolean;
  error?: string;
}

export interface Consultation {
  id: string;
  patientEmail: string;
  patientName: string;
  patientPhone: string;
  doctorId: string;
  doctorName: string;
  doctorEmail: string;
  specialty: string;
  scheduledFor: string;
  timeSlot: string;
  dateLabel: string;
  mode: "video" | "chat";
  fee: number;
  currency: string;
  paymentProvider: "stripe" | "induspays" | "manual";
  paymentIntentId: string;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  status: ConsultationStatus;
  medicalHistory: MedicalHistory;
  documents: ConsultationDocument[];
  decision?: DoctorDecision;
  refund?: Refund;
  availabilityRequest?: AvailabilityRequest;
  medicalHistorySubmittedAt?: string;
  roomId?: string;
  bookingId?: string;
  prescriptionId?: string;
  // Set when a fan-out (specialty-pool) request is claimed by a doctor.
  // For normal bookings this stays undefined; the doctorId/doctorEmail
  // are populated at creation. For pool bookings, doctorId === "" until
  // the first doctor clicks Accept — at which point claimedAt is stamped
  // and the record becomes a normal approved consultation.
  claimedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const consultations: Consultation[] = [];
const { hydrate, flush } = bindPersistentArray<Consultation>(
  "consultations",
  consultations,
  () => []
);

// Top-level await: the module won't finish loading until the array is
// hydrated from Postgres. Every API route that imports this store is
// guaranteed to see the latest data on first call — no caller-side
// `await ready()` needed. Cold start adds ~50-200ms once per Lambda.
await hydrate();

const now = () => new Date().toISOString();
const genId = () => `cs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function touch(c: Consultation) {
  c.updatedAt = now();
  flush();
}

export interface CreateConsultationInput {
  patientEmail: string;
  patientName: string;
  patientPhone: string;
  doctorId: string;
  doctorName: string;
  doctorEmail?: string;
  specialty: string;
  scheduledFor: string;
  timeSlot: string;
  dateLabel: string;
  mode?: "video" | "chat";
  fee: number;
  currency?: string;
  paymentProvider?: "stripe" | "induspays" | "manual";
  paymentIntentId?: string;
  medicalHistory: MedicalHistory;
}

export function createConsultation(input: CreateConsultationInput): Consultation {
  let doctorEmail = input.doctorEmail || "";
  if (!doctorEmail) {
    const match = listDoctors().find((d) => d.id === input.doctorId);
    if (match) doctorEmail = match.email || "";
  }

  const c: Consultation = {
    id: genId(),
    patientEmail: input.patientEmail.trim().toLowerCase(),
    patientName: input.patientName.trim(),
    patientPhone: input.patientPhone.trim(),
    doctorId: input.doctorId,
    doctorName: input.doctorName,
    doctorEmail: doctorEmail.toLowerCase(),
    specialty: input.specialty,
    scheduledFor: input.scheduledFor,
    timeSlot: input.timeSlot,
    dateLabel: input.dateLabel,
    mode: input.mode || "video",
    fee: input.fee,
    currency: input.currency || "USD",
    paymentProvider: input.paymentProvider || "stripe",
    paymentIntentId: input.paymentIntentId || "",
    paymentStatus: "pending",
    status: "pending_payment",
    medicalHistory: input.medicalHistory,
    documents: [],
    createdAt: now(),
    updatedAt: now(),
  };
  consultations.unshift(c);
  flush();
  return c;
}

export function listConsultations(filter: {
  patientEmail?: string;
  doctorId?: string;
  doctorEmail?: string;
  status?: ConsultationStatus | "All";
  /** Specialty-pool filter: only records that are still unclaimed
   *  (doctorId === "") and match this specialty. Used to populate the
   *  doctor dashboard's "Open requests" section — any doctor in that
   *  specialty can claim these. */
  unclaimedSpecialty?: string;
} = {}): Consultation[] {
  let list = [...consultations];
  if (filter.patientEmail) list = list.filter((c) => c.patientEmail === filter.patientEmail!.toLowerCase());
  if (filter.doctorId) list = list.filter((c) => c.doctorId === filter.doctorId);
  if (filter.doctorEmail) list = list.filter((c) => c.doctorEmail === filter.doctorEmail!.toLowerCase());
  if (filter.status && filter.status !== "All") list = list.filter((c) => c.status === filter.status);
  if (filter.unclaimedSpecialty) {
    const q = filter.unclaimedSpecialty.toLowerCase();
    list = list.filter((c) => !c.doctorId && c.specialty.toLowerCase() === q);
  }
  return list.sort((a, b) => (a.scheduledFor < b.scheduledFor ? 1 : -1));
}

/** Atomic claim for fan-out consultations. Returns:
 *   - the updated Consultation on success
 *   - "taken" if another doctor got there first
 *   - "not_found" if the id is unknown
 *
 * Because the array is in-memory and Node is single-threaded within a
 * single Lambda invocation, the check-then-set below is race-safe per
 * instance. Across instances the last-writer-wins on flush — acceptable
 * because a second doctor claiming an already-claimed record is rare
 * and the second would just see it already approved on reload. */
export function claimConsultation(
  id: string,
  doctor: { id: string; name: string; email: string },
): Consultation | "taken" | "not_found" {
  const c = consultations.find((x) => x.id === id);
  if (!c) return "not_found";
  if (c.doctorId) return "taken";
  c.doctorId = doctor.id;
  c.doctorName = doctor.name;
  c.doctorEmail = doctor.email.toLowerCase();
  c.claimedAt = now();
  // A claim equals acceptance, so skip the extra "awaiting_doctor →
  // approved" hop. The patient sees it confirmed immediately.
  c.status = "approved";
  touch(c);
  return c;
}

export function getConsultation(id: string): Consultation | null {
  return consultations.find((c) => c.id === id) || null;
}

export function getConsultationByRoomId(roomId: string): Consultation | null {
  return consultations.find((c) => c.roomId === roomId) || null;
}

export function markPaid(id: string, paymentIntentId: string): Consultation | null {
  const c = consultations.find((x) => x.id === id);
  if (!c) return null;
  c.paymentStatus = "paid";
  c.paymentIntentId = paymentIntentId || c.paymentIntentId;
  c.status = "awaiting_doctor";
  touch(c);
  return c;
}

// Payment gateway reported failed/declined — flip the consultation so the
// patient can retry or cancel. We don't touch `status` (still "pending")
// because the booking record itself is still valid; only the payment leg
// failed.
export function markPaymentFailed(id: string): Consultation | null {
  const c = consultations.find((x) => x.id === id);
  if (!c) return null;
  c.paymentStatus = "failed";
  touch(c);
  return c;
}

export function recordDecision(id: string, decision: DoctorDecision): Consultation | null {
  const c = consultations.find((x) => x.id === id);
  if (!c) return null;
  c.decision = decision;
  if (decision.action === "approved") c.status = "approved";
  else if (decision.action === "rejected") c.status = "rejected";
  else if (decision.action === "rescheduled") {
    c.status = "rescheduled";
    if (decision.rescheduleTo) c.scheduledFor = decision.rescheduleTo;
    if (decision.rescheduleSlot) c.timeSlot = decision.rescheduleSlot;
  }
  touch(c);
  return c;
}

export function attachRefund(id: string, refund: Refund): Consultation | null {
  const c = consultations.find((x) => x.id === id);
  if (!c) return null;
  c.refund = refund;
  if (refund.succeeded) {
    c.paymentStatus = "refunded";
    c.status = "refunded";
  }
  touch(c);
  return c;
}

export function addDocument(
  id: string,
  doc: Omit<ConsultationDocument, "id" | "uploadedAt">
): ConsultationDocument | null {
  const c = consultations.find((x) => x.id === id);
  if (!c) return null;
  const full: ConsultationDocument = {
    ...doc,
    id: `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
    uploadedAt: now(),
  };
  c.documents.push(full);
  touch(c);
  return full;
}

export function removeDocument(id: string, docId: string): boolean {
  const c = consultations.find((x) => x.id === id);
  if (!c) return false;
  const before = c.documents.length;
  c.documents = c.documents.filter((d) => d.id !== docId);
  touch(c);
  return c.documents.length < before;
}

export function setRoom(id: string, roomId: string): Consultation | null {
  const c = consultations.find((x) => x.id === id);
  if (!c) return null;
  c.roomId = roomId;
  touch(c);
  return c;
}

export function setStatus(id: string, status: ConsultationStatus): Consultation | null {
  const c = consultations.find((x) => x.id === id);
  if (!c) return null;
  c.status = status;
  touch(c);
  return c;
}

export function updateMedicalHistory(id: string, mh: MedicalHistory): Consultation | null {
  const c = consultations.find((x) => x.id === id);
  if (!c) return null;
  c.medicalHistory = mh;
  c.medicalHistorySubmittedAt = now();
  touch(c);
  return c;
}

export function hasMedicalHistory(c: Consultation): boolean {
  const mh = c.medicalHistory;
  return !!(mh && (mh.chiefComplaint?.trim() || mh.symptoms?.trim()));
}

export function requestAvailability(id: string, message?: string): Consultation | null {
  const c = consultations.find((x) => x.id === id);
  if (!c) return null;
  c.availabilityRequest = { requestedAt: now(), message };
  touch(c);
  return c;
}

export function respondAvailability(id: string, available: boolean, patientNote?: string): Consultation | null {
  const c = consultations.find((x) => x.id === id);
  if (!c || !c.availabilityRequest) return null;
  c.availabilityRequest = {
    ...c.availabilityRequest,
    respondedAt: now(),
    available,
    patientNote,
  };
  touch(c);
  return c;
}

export function attachPrescription(id: string, prescriptionId: string): Consultation | null {
  const c = consultations.find((x) => x.id === id);
  if (!c) return null;
  c.prescriptionId = prescriptionId;
  c.status = "completed";
  touch(c);
  return c;
}
