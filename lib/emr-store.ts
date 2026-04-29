// EMR store — patients, visit notes, files, invoices, staff, quota.
//
// Stores keyed in app_kv via bindPersistentArray:
//   - emr-patients          : patient demographic + chronic-condition records
//   - emr-visits            : SOAP-format visit notes
//   - emr-files             : metadata for lab reports / scans (actual blobs
//                             live on the Hostinger files server via files-service)
//   - emr-invoices          : line-item invoices per patient
//   - emr-staff             : extra staff added to a clinic (front desk / nurse
//                             / doctor) — each row references the clinic owner
//                             via ownerEmail
//   - emr-quota-unlocks     : record of $50 monthly unlocks paid via Stripe
//
// "Clinic" in this codebase is the doctor — the OduDoc user with role=doctor
// is the clinic owner. Other staff are extra OduDoc users whose email shows
// up in emr-staff for that owner. Permission is enforced via canWrite() and
// the resolveClinic() helper at the API layer.

import { bindPersistentArray } from "./persistent-array";

export type Sex = "Male" | "Female" | "Other" | "";

/* ============================================================ */
/*  Patients                                                    */
/* ============================================================ */

export interface EmrPatient {
  id: string;
  /** Email of the clinic *owner* (the doctor). All staff in the
   *  same clinic see the same patients. */
  doctorEmail: string;
  firstName: string;
  lastName: string;
  age: string;
  sex: Sex;
  phone: string;
  email?: string;
  address?: string;
  bloodGroup?: string;
  allergies?: string;
  chronicConditions?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
}

export interface EmrVisit {
  id: string;
  patientId: string;
  doctorEmail: string;       // clinic owner email
  authoredBy?: string;       // who actually wrote it (owner OR staff member)
  visitDate: string;
  chiefComplaint: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  vitals?: string;
  prescriptionId?: string;
  createdAt: string;
}

export interface EmrFile {
  id: string;
  doctorEmail: string;        // clinic owner email
  patientId: string;
  uploadedBy?: string;        // staff member who uploaded
  category: "lab" | "scan" | "report" | "other";
  label: string;              // doctor-supplied label e.g. "Chest X-ray"
  originalName: string;       // user's original filename
  storedFilename: string;     // pathname returned by files-service
  url: string;                // public URL on files.odudoc.com
  size: number;               // bytes
  contentType: string;
  createdAt: string;
}

export interface EmrInvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export type InvoiceStatus = "draft" | "sent" | "paid" | "void";

export interface EmrInvoice {
  id: string;
  doctorEmail: string;          // clinic owner
  patientId: string;
  authoredBy?: string;
  number: string;               // human-friendly invoice number e.g. "INV-2026-0001"
  issueDate: string;            // YYYY-MM-DD
  dueDate?: string;
  lineItems: EmrInvoiceLineItem[];
  subtotal: number;
  taxRate?: number;             // percent e.g. 18 for 18%
  taxAmount?: number;
  total: number;
  currency: string;             // "USD" | "INR" | …
  status: InvoiceStatus;
  notes?: string;
  paidAt?: string;
  paymentMethod?: string;       // "cash" | "card" | "upi" | "bank" | "other"
  /** Random unguessable token for the public-facing payment page.
   *  Anyone with this token can view + pay the invoice, so it serves
   *  as a capability URL. Stays constant for the life of the invoice. */
  publicToken: string;
  /** Stripe session id of the most recent online payment attempt;
   *  used by the public confirm endpoint to validate idempotently. */
  stripeSessionId?: string;
  createdAt: string;
  updatedAt: string;
}

/* ---------- Audit log ---------- */

export type AuditAction =
  | "patient.create"
  | "patient.update"
  | "patient.delete"
  | "visit.create"
  | "visit.delete"
  | "file.upload"
  | "file.delete"
  | "invoice.create"
  | "invoice.update"
  | "invoice.delete"
  | "invoice.paid_online"
  | "staff.add"
  | "staff.remove"
  | "quota.unlock";

export interface EmrAuditEntry {
  id: string;
  /** Clinic-owner email — every audit row is scoped to a clinic. */
  ownerEmail: string;
  /** Who performed the action. May equal ownerEmail (owner did it),
   *  another staff member's email, or "patient:<token>" for a public
   *  payment flow. */
  actorEmail: string;
  action: AuditAction;
  resource: string;
  resourceId: string;
  /** Free-form structured metadata — search-friendly bag for things
   *  like "patientId of the invoice we just touched", "amount", etc. */
  meta?: Record<string, string | number | boolean | null | undefined>;
  createdAt: string;
}

export type StaffRole = "doctor" | "nurse" | "frontdesk";

export interface EmrStaff {
  id: string;
  ownerEmail: string;            // clinic owner — the doctor
  staffEmail: string;            // staff member's OduDoc login email
  staffName?: string;
  role: StaffRole;
  invitedBy: string;
  createdAt: string;
}

/** Record of a $50 unlock paid by a clinic for a given month. Presence of
 *  a row means quota is uncapped for that owner+month. */
export interface EmrQuotaUnlock {
  id: string;
  ownerEmail: string;
  /** "2026-04" — the month the unlock applies to. */
  month: string;
  amount: number;                // typically 50
  currency: string;              // "USD"
  stripeSessionId?: string;
  stripePaymentIntent?: string;
  paidAt: string;
}

/* ============================================================ */
/*  Stores                                                      */
/* ============================================================ */

const patients: EmrPatient[] = [];
const {
  hydrate: hydratePatients,
  reload: reloadPatientsInternal,
  tombstone: tombstonePatient,
} = bindPersistentArray<EmrPatient>("emr-patients", patients, () => []);

const visits: EmrVisit[] = [];
const {
  hydrate: hydrateVisits,
  reload: reloadVisitsInternal,
  tombstone: tombstoneVisit,
} = bindPersistentArray<EmrVisit>("emr-visits", visits, () => []);

const emrFiles: EmrFile[] = [];
const {
  hydrate: hydrateFiles,
  reload: reloadFilesInternal,
  tombstone: tombstoneFile,
} = bindPersistentArray<EmrFile>("emr-files", emrFiles, () => []);

const invoices: EmrInvoice[] = [];
const {
  hydrate: hydrateInvoices,
  reload: reloadInvoicesInternal,
  tombstone: tombstoneInvoice,
} = bindPersistentArray<EmrInvoice>("emr-invoices", invoices, () => []);

const staff: EmrStaff[] = [];
const {
  hydrate: hydrateStaff,
  reload: reloadStaffInternal,
  tombstone: tombstoneStaff,
} = bindPersistentArray<EmrStaff>("emr-staff", staff, () => []);

const quotaUnlocks: EmrQuotaUnlock[] = [];
const {
  hydrate: hydrateUnlocks,
  reload: reloadUnlocksInternal,
} = bindPersistentArray<EmrQuotaUnlock>("emr-quota-unlocks", quotaUnlocks, () => []);

const auditLog: EmrAuditEntry[] = [];
const {
  hydrate: hydrateAudit,
  reload: reloadAuditInternal,
} = bindPersistentArray<EmrAuditEntry>("emr-audit", auditLog, () => []);

export async function reloadPatients() { await reloadPatientsInternal(); }
export async function reloadVisits() { await reloadVisitsInternal(); }
export async function reloadFiles() { await reloadFilesInternal(); }
export async function reloadInvoices() { await reloadInvoicesInternal(); }
export async function reloadStaff() { await reloadStaffInternal(); }
export async function reloadUnlocks() { await reloadUnlocksInternal(); }
export async function reloadAudit() { await reloadAuditInternal(); }

function nowIso(): string { return new Date().toISOString(); }
function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36).slice(-4)}`;
}

/* ============================================================ */
/*  Clinic resolver + permission matrix                         */
/* ============================================================ */

export interface ClinicAccess {
  /** Email of the clinic owner — the doctor. All EMR data lookups
   *  pivot on this value, not on the requester. */
  ownerEmail: string;
  /** Effective role for this request: doctor (owner), nurse, frontdesk,
   *  or admin (cross-clinic). */
  role: "owner" | StaffRole | "admin";
  /** Original requester email — used to stamp authoredBy on writes. */
  userEmail: string;
}

/** Resolve the clinic the requesting user is acting in, plus their role.
 *
 *  - role=admin: bypasses scoping. ownerEmail is empty; callers should
 *    branch on role==='admin' before applying clinic filters.
 *  - role=doctor (auth): treated as clinic owner (their own clinic).
 *  - other roles: looked up in emr-staff. If they appear, that owner
 *    becomes their clinic.
 *
 *  Returns null if the user has no clinic affiliation (e.g. a regular
 *  patient who somehow hits an EMR endpoint).
 */
export async function resolveClinic(
  userEmail: string | undefined,
  userRole: string | undefined
): Promise<ClinicAccess | null> {
  if (!userEmail) return null;
  const email = userEmail.toLowerCase();
  if (userRole === "admin") {
    return { ownerEmail: "", role: "admin", userEmail: email };
  }
  if (userRole === "doctor") {
    // Doctors own their own clinic by default.
    return { ownerEmail: email, role: "owner", userEmail: email };
  }
  // Otherwise check the staff list — any role.
  await hydrateStaff();
  const staffRow = staff.find((s) => s.staffEmail.toLowerCase() === email);
  if (!staffRow) return null;
  return {
    ownerEmail: staffRow.ownerEmail.toLowerCase(),
    role: staffRow.role,
    userEmail: email,
  };
}

export type EmrResource =
  | "patients"
  | "visits"
  | "files"
  | "invoices"
  | "staff"
  | "fhir";

/** Permission matrix. Owner + admin can do anything. Each staff role
 *  has a curated allowlist that maps to typical clinic responsibilities. */
export function canRead(role: ClinicAccess["role"], _resource: EmrResource): boolean {
  // Everybody who passes resolveClinic can read everything in their clinic.
  // Read scoping happens by ownerEmail filter, not by role.
  return true;
}

export function canWrite(role: ClinicAccess["role"], resource: EmrResource): boolean {
  if (role === "owner" || role === "admin") return true;
  if (role === "doctor") {
    // Staff doctor: same clinical write rights as owner, except staff mgmt.
    return resource !== "staff";
  }
  if (role === "nurse") {
    // Nurse: can write visits + files; can read patients/invoices but not modify.
    return resource === "visits" || resource === "files";
  }
  if (role === "frontdesk") {
    // Front desk: registers patients, raises invoices, uploads files.
    // Cannot write visits (clinical notes) or manage staff.
    return resource === "patients" || resource === "invoices" || resource === "files";
  }
  return false;
}

/* ============================================================ */
/*  Patients                                                    */
/* ============================================================ */

export interface CreatePatientInput {
  ownerEmail: string;
  firstName: string;
  lastName: string;
  age: string;
  sex: Sex;
  phone: string;
  email?: string;
  address?: string;
  bloodGroup?: string;
  allergies?: string;
  chronicConditions?: string;
  notes?: string;
}

export async function createPatient(input: CreatePatientInput): Promise<EmrPatient> {
  await hydratePatients();
  const now = nowIso();
  const record: EmrPatient = {
    id: uid("pt"),
    doctorEmail: input.ownerEmail.toLowerCase(),
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    age: input.age,
    sex: input.sex,
    phone: input.phone.trim(),
    email: input.email?.trim() || undefined,
    address: input.address?.trim() || undefined,
    bloodGroup: input.bloodGroup?.trim() || undefined,
    allergies: input.allergies?.trim() || undefined,
    chronicConditions: input.chronicConditions?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  };
  patients.push(record);
  return record;
}

export interface ListPatientsOptions {
  ownerEmail?: string;
  query?: string;
  includeArchived?: boolean;
}

export async function listPatients(opts: ListPatientsOptions = {}): Promise<EmrPatient[]> {
  await hydratePatients();
  const q = (opts.query || "").trim().toLowerCase();
  const owner = opts.ownerEmail ? opts.ownerEmail.toLowerCase() : null;
  return patients
    .filter((p) => (owner ? p.doctorEmail === owner : true))
    .filter((p) => (opts.includeArchived ? true : !p.archivedAt))
    .filter((p) => {
      if (!q) return true;
      const hay = [p.firstName, p.lastName, p.phone, p.email || "", p.chronicConditions || ""]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getPatientById(
  id: string,
  ownerEmail?: string
): Promise<EmrPatient | undefined> {
  await hydratePatients();
  const p = patients.find((x) => x.id === id);
  if (!p) return undefined;
  if (ownerEmail && p.doctorEmail !== ownerEmail.toLowerCase()) return undefined;
  return p;
}

export interface UpdatePatientInput {
  firstName?: string;
  lastName?: string;
  age?: string;
  sex?: Sex;
  phone?: string;
  email?: string;
  address?: string;
  bloodGroup?: string;
  allergies?: string;
  chronicConditions?: string;
  notes?: string;
  archivedAt?: string | null;
}

export async function updatePatient(
  id: string,
  patch: UpdatePatientInput,
  ownerEmail?: string
): Promise<EmrPatient | undefined> {
  await hydratePatients();
  const idx = patients.findIndex((p) => p.id === id);
  if (idx === -1) return undefined;
  const current = patients[idx];
  if (ownerEmail && current.doctorEmail !== ownerEmail.toLowerCase()) return undefined;
  const next: EmrPatient = { ...current, ...patch, updatedAt: nowIso() };
  patients.splice(idx, 1, next);
  return next;
}

export async function deletePatient(
  id: string,
  ownerEmail?: string
): Promise<boolean> {
  await hydratePatients();
  const idx = patients.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  const current = patients[idx];
  if (ownerEmail && current.doctorEmail !== ownerEmail.toLowerCase()) return false;
  patients.splice(idx, 1);
  await tombstonePatient(id);
  // Cascade: drop the patient's visits, files, and invoices.
  await hydrateVisits();
  for (let i = visits.length - 1; i >= 0; i--) {
    if (visits[i].patientId === id) {
      const removed = visits.splice(i, 1)[0];
      await tombstoneVisit(removed.id);
    }
  }
  await hydrateFiles();
  for (let i = emrFiles.length - 1; i >= 0; i--) {
    if (emrFiles[i].patientId === id) {
      const removed = emrFiles.splice(i, 1)[0];
      await tombstoneFile(removed.id);
    }
  }
  await hydrateInvoices();
  for (let i = invoices.length - 1; i >= 0; i--) {
    if (invoices[i].patientId === id) {
      const removed = invoices.splice(i, 1)[0];
      await tombstoneInvoice(removed.id);
    }
  }
  return true;
}

/* ============================================================ */
/*  Visits                                                      */
/* ============================================================ */

export interface CreateVisitInput {
  patientId: string;
  ownerEmail: string;
  authoredBy: string;
  visitDate?: string;
  chiefComplaint: string;
  subjective?: string;
  objective?: string;
  assessment: string;
  plan: string;
  vitals?: string;
  prescriptionId?: string;
}

export async function createVisit(input: CreateVisitInput): Promise<EmrVisit> {
  await hydrateVisits();
  const now = nowIso();
  const visit: EmrVisit = {
    id: uid("vt"),
    patientId: input.patientId,
    doctorEmail: input.ownerEmail.toLowerCase(),
    authoredBy: input.authoredBy.toLowerCase(),
    visitDate: input.visitDate || now.slice(0, 10),
    chiefComplaint: input.chiefComplaint.trim(),
    subjective: (input.subjective || "").trim(),
    objective: (input.objective || "").trim(),
    assessment: input.assessment.trim(),
    plan: input.plan.trim(),
    vitals: input.vitals?.trim() || undefined,
    prescriptionId: input.prescriptionId,
    createdAt: now,
  };
  visits.push(visit);
  await hydratePatients();
  const idx = patients.findIndex((p) => p.id === input.patientId);
  if (idx !== -1) patients.splice(idx, 1, { ...patients[idx], updatedAt: now });
  return visit;
}

export async function listVisitsForPatient(
  patientId: string,
  ownerEmail?: string
): Promise<EmrVisit[]> {
  await hydrateVisits();
  return visits
    .filter((v) => v.patientId === patientId)
    .filter((v) => (ownerEmail ? v.doctorEmail === ownerEmail.toLowerCase() : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listRecentVisits(
  ownerEmail: string,
  limit = 10
): Promise<EmrVisit[]> {
  await hydrateVisits();
  return visits
    .filter((v) => v.doctorEmail === ownerEmail.toLowerCase())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function deleteVisit(
  id: string,
  ownerEmail?: string
): Promise<boolean> {
  await hydrateVisits();
  const idx = visits.findIndex((v) => v.id === id);
  if (idx === -1) return false;
  const current = visits[idx];
  if (ownerEmail && current.doctorEmail !== ownerEmail.toLowerCase()) return false;
  visits.splice(idx, 1);
  await tombstoneVisit(id);
  return true;
}

/* ============================================================ */
/*  Files                                                       */
/* ============================================================ */

export interface CreateEmrFileInput {
  ownerEmail: string;
  uploadedBy: string;
  patientId: string;
  category: EmrFile["category"];
  label: string;
  originalName: string;
  storedFilename: string;
  url: string;
  size: number;
  contentType: string;
}

export async function createEmrFile(input: CreateEmrFileInput): Promise<EmrFile> {
  await hydrateFiles();
  // The persisted shape uses `doctorEmail` to stay consistent with
  // patients/visits, even though the function input is `ownerEmail`.
  const row: EmrFile = {
    id: uid("ef"),
    doctorEmail: input.ownerEmail.toLowerCase(),
    patientId: input.patientId,
    uploadedBy: input.uploadedBy.toLowerCase(),
    category: input.category,
    label: input.label.trim() || input.originalName,
    originalName: input.originalName,
    storedFilename: input.storedFilename,
    url: input.url,
    size: input.size,
    contentType: input.contentType,
    createdAt: nowIso(),
  };
  emrFiles.push(row);
  return row;
}

export async function listFilesForPatient(
  patientId: string,
  ownerEmail?: string
): Promise<EmrFile[]> {
  await hydrateFiles();
  return emrFiles
    .filter((f) => f.patientId === patientId)
    .filter((f) => (ownerEmail ? f.doctorEmail === ownerEmail.toLowerCase() : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getFileById(
  id: string,
  ownerEmail?: string
): Promise<EmrFile | undefined> {
  await hydrateFiles();
  const f = emrFiles.find((x) => x.id === id);
  if (!f) return undefined;
  if (ownerEmail && f.doctorEmail !== ownerEmail.toLowerCase()) return undefined;
  return f;
}

export async function deleteEmrFileRow(
  id: string,
  ownerEmail?: string
): Promise<EmrFile | undefined> {
  await hydrateFiles();
  const idx = emrFiles.findIndex((f) => f.id === id);
  if (idx === -1) return undefined;
  const current = emrFiles[idx];
  if (ownerEmail && current.doctorEmail !== ownerEmail.toLowerCase()) return undefined;
  emrFiles.splice(idx, 1);
  await tombstoneFile(id);
  return current;
}

/* ============================================================ */
/*  Invoices                                                    */
/* ============================================================ */

export interface CreateInvoiceInput {
  ownerEmail: string;
  authoredBy: string;
  patientId: string;
  issueDate?: string;
  dueDate?: string;
  lineItems: EmrInvoiceLineItem[];
  taxRate?: number;
  currency?: string;
  notes?: string;
}

function nextInvoiceNumber(ownerEmail: string): string {
  const year = new Date().getUTCFullYear();
  const mine = invoices.filter(
    (i) => i.doctorEmail === ownerEmail.toLowerCase() && i.number.startsWith(`INV-${year}-`)
  );
  const seq = mine.length + 1;
  return `INV-${year}-${String(seq).padStart(4, "0")}`;
}

export async function createInvoice(input: CreateInvoiceInput): Promise<EmrInvoice> {
  await hydrateInvoices();
  const cleanLines = (input.lineItems || [])
    .map((li) => ({
      description: (li.description || "").trim(),
      quantity: Math.max(0, Math.round(Number(li.quantity) || 0)),
      unitPrice: Math.max(0, Number(li.unitPrice) || 0),
    }))
    .filter((li) => li.description && li.quantity > 0);

  const subtotal = cleanLines.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
  const taxRate = Number(input.taxRate) || 0;
  const taxAmount = Math.round(subtotal * taxRate) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;
  const now = nowIso();

  const invoice: EmrInvoice = {
    id: uid("inv"),
    doctorEmail: input.ownerEmail.toLowerCase(),
    authoredBy: input.authoredBy.toLowerCase(),
    patientId: input.patientId,
    number: nextInvoiceNumber(input.ownerEmail),
    issueDate: input.issueDate || now.slice(0, 10),
    dueDate: input.dueDate,
    lineItems: cleanLines,
    subtotal: Math.round(subtotal * 100) / 100,
    taxRate: taxRate || undefined,
    taxAmount: taxAmount || undefined,
    total,
    currency: (input.currency || "USD").toUpperCase(),
    status: "draft",
    notes: input.notes?.trim() || undefined,
    // Capability URL token — long enough to resist enumeration. We keep
    // it on the invoice so the doctor can copy/share the same link
    // multiple times without rotating it.
    publicToken: `pay-${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`,
    createdAt: now,
    updatedAt: now,
  };
  invoices.push(invoice);
  return invoice;
}

export async function listInvoicesForPatient(
  patientId: string,
  ownerEmail?: string
): Promise<EmrInvoice[]> {
  await hydrateInvoices();
  return invoices
    .filter((i) => i.patientId === patientId)
    .filter((i) => (ownerEmail ? i.doctorEmail === ownerEmail.toLowerCase() : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listInvoicesForOwner(
  ownerEmail: string,
  status?: InvoiceStatus
): Promise<EmrInvoice[]> {
  await hydrateInvoices();
  return invoices
    .filter((i) => i.doctorEmail === ownerEmail.toLowerCase())
    .filter((i) => (status ? i.status === status : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getInvoiceById(
  id: string,
  ownerEmail?: string
): Promise<EmrInvoice | undefined> {
  await hydrateInvoices();
  const inv = invoices.find((i) => i.id === id);
  if (!inv) return undefined;
  if (ownerEmail && inv.doctorEmail !== ownerEmail.toLowerCase()) return undefined;
  return inv;
}

export async function updateInvoice(
  id: string,
  patch: Partial<Pick<EmrInvoice, "status" | "notes" | "paidAt" | "paymentMethod" | "dueDate">>,
  ownerEmail?: string
): Promise<EmrInvoice | undefined> {
  await hydrateInvoices();
  const idx = invoices.findIndex((i) => i.id === id);
  if (idx === -1) return undefined;
  const current = invoices[idx];
  if (ownerEmail && current.doctorEmail !== ownerEmail.toLowerCase()) return undefined;
  const next: EmrInvoice = {
    ...current,
    ...patch,
    updatedAt: nowIso(),
  };
  invoices.splice(idx, 1, next);
  return next;
}

export async function deleteInvoice(
  id: string,
  ownerEmail?: string
): Promise<boolean> {
  await hydrateInvoices();
  const idx = invoices.findIndex((i) => i.id === id);
  if (idx === -1) return false;
  const current = invoices[idx];
  if (ownerEmail && current.doctorEmail !== ownerEmail.toLowerCase()) return false;
  invoices.splice(idx, 1);
  await tombstoneInvoice(id);
  return true;
}

/* ============================================================ */
/*  Staff                                                       */
/* ============================================================ */

export interface CreateStaffInput {
  ownerEmail: string;
  staffEmail: string;
  staffName?: string;
  role: StaffRole;
  invitedBy: string;
}

export async function createStaff(input: CreateStaffInput): Promise<EmrStaff> {
  await hydrateStaff();
  const owner = input.ownerEmail.toLowerCase();
  const sEmail = input.staffEmail.toLowerCase();
  // Idempotent: if an entry already exists for this owner+staff pair,
  // overwrite the role/name rather than inserting a duplicate.
  const existingIdx = staff.findIndex(
    (s) => s.ownerEmail.toLowerCase() === owner && s.staffEmail.toLowerCase() === sEmail
  );
  if (existingIdx !== -1) {
    const updated: EmrStaff = {
      ...staff[existingIdx],
      role: input.role,
      staffName: input.staffName?.trim() || staff[existingIdx].staffName,
    };
    staff.splice(existingIdx, 1, updated);
    return updated;
  }
  const row: EmrStaff = {
    id: uid("st"),
    ownerEmail: owner,
    staffEmail: sEmail,
    staffName: input.staffName?.trim() || undefined,
    role: input.role,
    invitedBy: input.invitedBy.toLowerCase(),
    createdAt: nowIso(),
  };
  staff.push(row);
  return row;
}

export async function listStaffForOwner(ownerEmail: string): Promise<EmrStaff[]> {
  await hydrateStaff();
  const owner = ownerEmail.toLowerCase();
  return staff
    .filter((s) => s.ownerEmail.toLowerCase() === owner)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function deleteStaff(
  id: string,
  ownerEmail: string
): Promise<boolean> {
  await hydrateStaff();
  const idx = staff.findIndex((s) => s.id === id);
  if (idx === -1) return false;
  if (staff[idx].ownerEmail.toLowerCase() !== ownerEmail.toLowerCase()) return false;
  staff.splice(idx, 1);
  await tombstoneStaff(id);
  return true;
}

/* ============================================================ */
/*  Quota — 50 patients/month, $50 unlock                       */
/* ============================================================ */

export const FREE_PATIENTS_PER_MONTH = 50;
export const QUOTA_UNLOCK_AMOUNT = 50; // USD

function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7); // "2026-04"
}

export interface QuotaState {
  month: string;
  used: number;
  limit: number;
  unlocked: boolean;
  unlockAmount: number;
  unlockCurrency: string;
  /** True once `used >= limit` AND no unlock for the month. */
  blocked: boolean;
  remaining: number;
}

export async function getQuotaState(ownerEmail: string): Promise<QuotaState> {
  await hydratePatients();
  await hydrateUnlocks();
  const owner = ownerEmail.toLowerCase();
  const month = currentMonthKey();
  const used = patients.filter(
    (p) => p.doctorEmail === owner && p.createdAt.startsWith(month)
  ).length;
  const unlocked = quotaUnlocks.some(
    (u) => u.ownerEmail.toLowerCase() === owner && u.month === month
  );
  const blocked = !unlocked && used >= FREE_PATIENTS_PER_MONTH;
  return {
    month,
    used,
    limit: FREE_PATIENTS_PER_MONTH,
    unlocked,
    unlockAmount: QUOTA_UNLOCK_AMOUNT,
    unlockCurrency: "USD",
    blocked,
    remaining: Math.max(0, FREE_PATIENTS_PER_MONTH - used),
  };
}

export async function recordQuotaUnlock(input: {
  ownerEmail: string;
  month?: string;
  amount?: number;
  currency?: string;
  stripeSessionId?: string;
  stripePaymentIntent?: string;
}): Promise<EmrQuotaUnlock> {
  await hydrateUnlocks();
  const month = input.month || currentMonthKey();
  const owner = input.ownerEmail.toLowerCase();
  // Idempotent on (owner, month, sessionId) — Stripe webhook can deliver
  // the same event twice, and a manual confirm hit can race the webhook.
  if (input.stripeSessionId) {
    const dup = quotaUnlocks.find(
      (u) => u.ownerEmail.toLowerCase() === owner && u.stripeSessionId === input.stripeSessionId
    );
    if (dup) return dup;
  }
  const row: EmrQuotaUnlock = {
    id: uid("qu"),
    ownerEmail: owner,
    month,
    amount: input.amount ?? QUOTA_UNLOCK_AMOUNT,
    currency: (input.currency || "USD").toUpperCase(),
    stripeSessionId: input.stripeSessionId,
    stripePaymentIntent: input.stripePaymentIntent,
    paidAt: nowIso(),
  };
  quotaUnlocks.push(row);
  return row;
}

/* ============================================================ */
/*  Stats — for the EMR landing page                            */
/* ============================================================ */

export interface EmrStats {
  totalPatients: number;
  totalVisits: number;
  visitsToday: number;
  visitsThisMonth: number;
  newPatientsThisMonth: number;
  pendingInvoices: number;
  pendingInvoicesAmount: number;
}

export async function getDoctorEmrStats(ownerEmail: string): Promise<EmrStats> {
  await hydratePatients();
  await hydrateVisits();
  await hydrateInvoices();
  const email = ownerEmail.toLowerCase();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date().toISOString().slice(0, 7);
  const myPatients = patients.filter((p) => p.doctorEmail === email && !p.archivedAt);
  const myVisits = visits.filter((v) => v.doctorEmail === email);
  const myPending = invoices.filter(
    (i) => i.doctorEmail === email && (i.status === "draft" || i.status === "sent")
  );
  return {
    totalPatients: myPatients.length,
    totalVisits: myVisits.length,
    visitsToday: myVisits.filter((v) => v.visitDate === today).length,
    visitsThisMonth: myVisits.filter((v) => v.visitDate.startsWith(monthStart)).length,
    newPatientsThisMonth: myPatients.filter((p) => p.createdAt.startsWith(monthStart)).length,
    pendingInvoices: myPending.length,
    pendingInvoicesAmount: Math.round(myPending.reduce((s, i) => s + i.total, 0) * 100) / 100,
  };
}

/* ============================================================ */
/*  FHIR R4 export                                              */
/* ============================================================ */

/** Build a minimal FHIR R4 Bundle (Patient + Observations from chronic
 *  conditions / allergies / vitals). Useful for a doctor migrating to
 *  another system. Not a certified mapping — caveat emptor. */
export function buildFhirBundle(patient: EmrPatient, patientVisits: EmrVisit[]): unknown {
  const fhirSex =
    patient.sex === "Male" ? "male" : patient.sex === "Female" ? "female" : "unknown";
  const patientResource = {
    resourceType: "Patient",
    id: patient.id,
    name: [
      {
        use: "official",
        family: patient.lastName,
        given: [patient.firstName].filter(Boolean),
      },
    ],
    gender: fhirSex,
    telecom: [
      patient.phone ? { system: "phone", value: patient.phone, use: "mobile" } : null,
      patient.email ? { system: "email", value: patient.email } : null,
    ].filter(Boolean),
    address: patient.address ? [{ text: patient.address }] : undefined,
  };

  const allergyIntolerance = patient.allergies
    ? {
        resourceType: "AllergyIntolerance",
        id: `${patient.id}-allergy`,
        patient: { reference: `Patient/${patient.id}` },
        code: { text: patient.allergies },
      }
    : null;

  const conditions = (patient.chronicConditions || "")
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((cond, i) => ({
      resourceType: "Condition",
      id: `${patient.id}-cond-${i}`,
      subject: { reference: `Patient/${patient.id}` },
      code: { text: cond },
      clinicalStatus: { text: "active" },
    }));

  const encounters = patientVisits.map((v) => ({
    resourceType: "Encounter",
    id: v.id,
    status: "finished",
    subject: { reference: `Patient/${patient.id}` },
    period: {
      start: v.visitDate + "T00:00:00Z",
      end: v.visitDate + "T23:59:59Z",
    },
    reasonCode: [{ text: v.chiefComplaint }],
    note: [
      v.subjective ? { text: `S: ${v.subjective}` } : null,
      v.objective ? { text: `O: ${v.objective}` } : null,
      { text: `A: ${v.assessment}` },
      { text: `P: ${v.plan}` },
    ].filter(Boolean),
  }));

  const entries = [
    { resource: patientResource },
    allergyIntolerance ? { resource: allergyIntolerance } : null,
    ...conditions.map((c) => ({ resource: c })),
    ...encounters.map((e) => ({ resource: e })),
  ].filter(Boolean);

  return {
    resourceType: "Bundle",
    id: `bundle-${patient.id}`,
    type: "collection",
    timestamp: new Date().toISOString(),
    entry: entries,
  };
}

/* ============================================================ */
/*  Public-token invoice lookup (patient payment portal)        */
/* ============================================================ */

export async function getInvoiceByPublicToken(
  token: string
): Promise<EmrInvoice | undefined> {
  await hydrateInvoices();
  return invoices.find((i) => i.publicToken === token);
}

/** Backfill / rotate the public payment token on an invoice. Used by
 *  the re-issue flow for legacy invoices that pre-date EMR v3 (which
 *  lack publicToken entirely) and as a manual rotation if a doctor
 *  wants to invalidate a link they already shared. Always returns
 *  the new token via the updated invoice row. */
export async function regenerateInvoicePublicToken(
  id: string,
  ownerEmail?: string
): Promise<EmrInvoice | undefined> {
  await hydrateInvoices();
  const idx = invoices.findIndex((i) => i.id === id);
  if (idx === -1) return undefined;
  const current = invoices[idx];
  if (ownerEmail && current.doctorEmail !== ownerEmail.toLowerCase()) return undefined;
  const newToken = `pay-${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
  const next: EmrInvoice = {
    ...current,
    publicToken: newToken,
    // Drop any cached checkout session — the old link's session
    // metadata still references this invoice id, but we want any
    // future "Copy link" interaction to start fresh.
    stripeSessionId: undefined,
    updatedAt: nowIso(),
  };
  invoices.splice(idx, 1, next);
  return next;
}

export async function setInvoiceCheckoutSession(
  id: string,
  sessionId: string
): Promise<EmrInvoice | undefined> {
  await hydrateInvoices();
  const idx = invoices.findIndex((i) => i.id === id);
  if (idx === -1) return undefined;
  const next: EmrInvoice = {
    ...invoices[idx],
    stripeSessionId: sessionId,
    updatedAt: nowIso(),
  };
  invoices.splice(idx, 1, next);
  return next;
}

export async function markInvoicePaidOnline(input: {
  invoiceId: string;
  stripeSessionId: string;
  paymentMethod?: string;
}): Promise<EmrInvoice | undefined> {
  await hydrateInvoices();
  const idx = invoices.findIndex((i) => i.id === input.invoiceId);
  if (idx === -1) return undefined;
  const current = invoices[idx];
  // Idempotent — a Stripe redirect refresh shouldn't double-stamp.
  if (current.status === "paid") return current;
  const next: EmrInvoice = {
    ...current,
    status: "paid",
    paidAt: nowIso(),
    paymentMethod: input.paymentMethod || "card",
    stripeSessionId: input.stripeSessionId,
    updatedAt: nowIso(),
  };
  invoices.splice(idx, 1, next);
  return next;
}

/* ============================================================ */
/*  Audit log                                                   */
/* ============================================================ */

export interface AuditWriteInput {
  ownerEmail: string;
  actorEmail: string;
  action: AuditAction;
  resource: string;
  resourceId: string;
  meta?: EmrAuditEntry["meta"];
}

/** Append a single audit row. Fire-and-forget — callers should not
 *  block their response on this. We don't return the row because
 *  nothing reads it back. */
export async function writeAudit(input: AuditWriteInput): Promise<void> {
  await hydrateAudit();
  const row: EmrAuditEntry = {
    id: uid("au"),
    ownerEmail: input.ownerEmail.toLowerCase(),
    actorEmail: (input.actorEmail || "").toLowerCase(),
    action: input.action,
    resource: input.resource,
    resourceId: input.resourceId,
    meta: input.meta,
    createdAt: nowIso(),
  };
  auditLog.push(row);
}

export interface ListAuditOptions {
  ownerEmail: string;
  /** Filter by actor (e.g. show only what one staff member did). */
  actorEmail?: string;
  /** Filter by resource type. */
  resource?: string;
  /** ISO date "2026-04-29" — only entries on or after. */
  since?: string;
  limit?: number;
}

export async function listAudit(opts: ListAuditOptions): Promise<EmrAuditEntry[]> {
  await hydrateAudit();
  const owner = opts.ownerEmail.toLowerCase();
  const actor = opts.actorEmail?.toLowerCase();
  return auditLog
    .filter((a) => a.ownerEmail === owner)
    .filter((a) => (actor ? a.actorEmail === actor : true))
    .filter((a) => (opts.resource ? a.resource === opts.resource : true))
    .filter((a) => (opts.since ? a.createdAt.slice(0, 10) >= opts.since : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, opts.limit ?? 200);
}

/* ============================================================ */
/*  HL7 v2 export                                               */
/* ============================================================ */

/** Escape characters that have special meaning in HL7 v2 field encoding. */
function hl7Escape(s: string): string {
  if (!s) return "";
  return s
    .replace(/\\/g, "\\E\\")
    .replace(/\|/g, "\\F\\")
    .replace(/\^/g, "\\S\\")
    .replace(/&/g, "\\T\\")
    .replace(/~/g, "\\R\\")
    .replace(/\r?\n/g, " ");
}

function hl7Date(iso: string): string {
  // HL7 v2 timestamps: YYYYMMDDHHMMSS or YYYYMMDD.
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds())
  );
}

/** Build a small HL7 v2.5.1 ADT^A08 + visit OBX message stream for
 *  the given patient + their visits. Returns the message as a single
 *  string with \r segment terminators (per HL7 spec). Not certified,
 *  but parses cleanly in HAPI v2 and Mirth. */
export function buildHl7v2(patient: EmrPatient, patientVisits: EmrVisit[]): string {
  const sendingApp = "OduDocEMR";
  const sendingFacility = "OduDoc";
  const receivingApp = "RECEIVER";
  const receivingFacility = "FACILITY";
  const messageId = `MSG-${patient.id}-${Date.now()}`;
  const timestamp = hl7Date(new Date().toISOString());

  const fhirSex =
    patient.sex === "Male" ? "M" : patient.sex === "Female" ? "F" : "U";

  const segments: string[] = [];

  // MSH — message header. Field 1 is the field separator |, field 2
  // declares the encoding characters ^~\&.
  segments.push(
    [
      "MSH",
      "^~\\&",
      sendingApp,
      sendingFacility,
      receivingApp,
      receivingFacility,
      timestamp,
      "",
      "ADT^A08",
      messageId,
      "P",
      "2.5.1",
    ].join("|")
  );

  // EVN — event type.
  segments.push(["EVN", "A08", timestamp].join("|"));

  // PID — patient identifier + demographics.
  segments.push(
    [
      "PID",
      "1",
      "",
      `${patient.id}^^^${sendingFacility}^MR`,
      "",
      `${hl7Escape(patient.lastName)}^${hl7Escape(patient.firstName)}`,
      "",
      "", // DOB — we only store age, leave blank
      fhirSex,
      "",
      "",
      hl7Escape(patient.address || ""),
      "",
      hl7Escape(patient.phone || ""),
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ].join("|")
  );

  // AL1 — allergies.
  if (patient.allergies) {
    segments.push(["AL1", "1", "DA", hl7Escape(patient.allergies)].join("|"));
  }

  // DG1 — chronic diagnoses, one per condition.
  (patient.chronicConditions || "")
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((cond, i) => {
      segments.push(["DG1", String(i + 1), "", hl7Escape(cond), "", "", "F"].join("|"));
    });

  // PV1 + OBX per visit — visit + SOAP encoded as observations.
  patientVisits.forEach((v, vi) => {
    const visitTs = hl7Date(v.visitDate + "T00:00:00Z");
    segments.push(
      [
        "PV1",
        String(vi + 1),
        "O", // outpatient
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        visitTs,
      ].join("|")
    );
    let obxIdx = 1;
    const addObx = (label: string, text: string) => {
      if (!text) return;
      segments.push(
        [
          "OBX",
          String(obxIdx++),
          "TX",
          `${label}^${label}^L`,
          "",
          hl7Escape(text),
          "",
          "",
          "",
          "",
          "F",
          "",
          "",
          visitTs,
        ].join("|")
      );
    };
    addObx("CC", v.chiefComplaint);
    addObx("S", v.subjective);
    addObx("O", v.objective);
    addObx("A", v.assessment);
    addObx("P", v.plan);
    if (v.vitals) addObx("VITALS", v.vitals);
  });

  // HL7 spec uses \r between segments. Most parsers also accept \n;
  // some are strict, so we emit canonical \r.
  return segments.join("\r") + "\r";
}
