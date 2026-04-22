// Shared Zod schemas for hospital routes.
//
// Strategy: we use .passthrough() everywhere so unknown fields pass through
// to the store (which has its own TypeScript types). This means the schema
// validates the REQUIRED + well-known OPTIONAL fields with real types but
// doesn't reject forward-compatible additions.
//
// Each schema mirrors the `*Input` type its store accepts.

import { z } from "zod";

const nonEmpty = z.string().trim().min(1);
const optStr = z.string().optional();
const optTrimmedStr = z.string().trim().optional();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}/);
const hhmm = z.string().regex(/^\d{2}:\d{2}$/);

// ─── Appointments ─────────────────────────────────────────────────────────

const APPOINTMENT_TYPES = [
  "consultation", "follow_up", "procedure", "telemedicine",
  "vaccination", "lab_review", "other",
] as const;

const APPOINTMENT_STATUSES = [
  "scheduled", "confirmed", "checked_in", "in_progress",
  "completed", "cancelled", "no_show",
] as const;

export const appointmentCreateSchema = z.object({
  patientId: nonEmpty,
  providerId: nonEmpty,
  type: z.enum(APPOINTMENT_TYPES).optional(),
  date: isoDate,
  startTime: hhmm,
  endTime: hhmm.optional(),
  reason: optStr,
  room: optStr,
  notes: optStr,
}).passthrough();

export const appointmentUpdateSchema = z.object({
  id: nonEmpty,
  patientId: optTrimmedStr,
  providerId: optTrimmedStr,
  type: z.enum(APPOINTMENT_TYPES).optional(),
  date: isoDate.optional(),
  startTime: hhmm.optional(),
  endTime: hhmm.optional(),
  reason: optStr,
  room: optStr,
  notes: optStr,
  status: z.enum(APPOINTMENT_STATUSES).optional(),
  cancelReason: optStr,
}).passthrough();

export const idBodySchema = z.object({ id: nonEmpty }).passthrough();

// ─── Patients ─────────────────────────────────────────────────────────────

export const patientCreateSchema = z.object({
  firstName: nonEmpty,
  lastName: nonEmpty,
  gender: z.enum(["male", "female", "other", "unknown"]).optional(),
  dateOfBirth: isoDate.optional(),
  phone: optStr,
  email: z.string().trim().email().optional().or(z.literal("")),
  addressLine1: optStr,
  addressLine2: optStr,
  city: optStr,
  state: optStr,
  country: optStr,
  postalCode: optStr,
  bloodGroup: z.enum([
    "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown",
  ]).optional(),
  allergies: z.array(z.string()).optional(),
  chronicConditions: z.array(z.string()).optional(),
  currentMedications: z.array(z.string()).optional(),
  emergencyContactName: optStr,
  emergencyContactPhone: optStr,
  emergencyContactRelation: optStr,
  insuranceProvider: optStr,
  insurancePolicyNumber: optStr,
  notes: optStr,
}).passthrough();

export const patientUpdateSchema = patientCreateSchema.partial().extend({
  id: nonEmpty,
}).passthrough();

// ─── Admissions ───────────────────────────────────────────────────────────

export const admissionCreateSchema = z.object({
  patientId: nonEmpty,
  bedId: nonEmpty,
  admittingDoctor: optStr,
  admittingDepartment: optStr,
  encounterId: optStr,
  chiefComplaint: optStr,
  provisionalDiagnosis: optStr,
  admittedAt: optStr,
  notes: optStr,
}).passthrough();

export const admissionPatchSchema = z.object({
  id: nonEmpty,
  transferBedId: optStr,
  discharge: z.object({
    dischargedAt: optStr,
    finalDiagnosis: optStr,
    dischargeSummary: optStr,
    dischargeDisposition: z.enum([
      "home", "transferred", "lama", "expired", "referred", "other",
    ]).optional(),
  }).optional(),
  cancel: z.boolean().optional(),
  notes: optStr,
}).passthrough();

// ─── Prescriptions ────────────────────────────────────────────────────────

export const prescriptionCreateSchema = z.object({
  patientId: nonEmpty,
  encounterId: optStr,
  doctorName: optStr,
  diagnosis: optStr,
  notes: optStr,
  issuedAt: optStr,
  items: z.array(z.object({
    drugName: nonEmpty,
    strength: optStr,
    dosage: optStr,
    frequency: optStr,
    duration: optStr,
    instructions: optStr,
  })).min(1),
}).passthrough();

export const prescriptionUpdateSchema = z.object({
  id: nonEmpty,
  doctorName: optStr,
  diagnosis: optStr,
  notes: optStr,
  status: z.enum(["active", "completed", "cancelled"]).optional(),
  items: z.array(z.object({
    drugName: nonEmpty,
    strength: optStr,
    dosage: optStr,
    frequency: optStr,
    duration: optStr,
    instructions: optStr,
  })).optional(),
}).passthrough();

// ─── Notifications ────────────────────────────────────────────────────────

export const notificationCreateSchema = z.object({
  channel: z.enum(["sms", "email", "whatsapp", "push", "in_app", "voice"]),
  category: z.enum([
    "appointment", "reminder", "result", "billing",
    "marketing", "alert", "discharge", "vaccination", "generic",
  ]).optional(),
  recipientName: optStr,
  recipientContact: nonEmpty,
  patientId: optStr,
  subject: optStr,
  body: nonEmpty,
  templateCode: optStr,
  scheduledFor: optStr,
}).passthrough();

// ─── Invoices / AR receipts / AP ──────────────────────────────────────────

export const invoiceCreateSchema = z.object({
  patientId: nonEmpty,
  encounterId: optStr,
  items: z.array(z.object({
    description: nonEmpty,
    quantity: z.number().int().positive(),
    unitPrice: z.number().nonnegative(),
    taxRate: z.number().nonnegative().optional(),
  })).min(1),
  notes: optStr,
  dueDate: optStr,
}).passthrough();

export const arReceiptCreateSchema = z.object({
  invoiceId: nonEmpty,
  amount: z.number().positive(),
  method: z.enum(["cash", "card", "upi", "bank_transfer", "insurance", "other"]),
  reference: optStr,
  receivedAt: optStr,
  notes: optStr,
}).passthrough();

export const apEntryCreateSchema = z.object({
  vendorName: nonEmpty,
  invoiceNumber: optStr,
  amount: z.number().positive(),
  dueDate: optStr,
  category: optStr,
  notes: optStr,
}).passthrough();

// ─── Lab orders ───────────────────────────────────────────────────────────

export const labOrderCreateSchema = z.object({
  patientId: nonEmpty,
  encounterId: optStr,
  tests: z.array(z.object({
    code: optStr,
    name: nonEmpty,
  })).min(1),
  urgency: z.enum(["routine", "urgent", "stat"]).optional(),
  notes: optStr,
}).passthrough();

// ─── Pharmacy inventory ───────────────────────────────────────────────────

export const pharmacyStockAdjustSchema = z.object({
  itemId: nonEmpty,
  delta: z.number().int(),
  reason: optStr,
  batchNumber: optStr,
  expiryDate: optStr,
}).passthrough();
