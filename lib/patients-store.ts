// Patients store — FIRST tenant-scoped module.
// Every record carries an organizationId and is only ever queried in the
// context of an active org. Super-admins can pass an explicit orgId to
// read cross-tenant (for support); everyone else gets data for their own
// active org only.
//
// Pattern: every future clinical module (encounters, vitals, orders,
// prescriptions, labs, admissions) will follow this shape.

import { bindPersistentArray } from "./persistent-array";

export type Gender = "male" | "female" | "other" | "unknown";
export type BloodGroup =
  | "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "unknown";

export interface Patient {
  id: string;
  organizationId: string; // tenant scope
  mrn: string; // "Medical Record Number" — unique per org
  // Demographics
  firstName: string;
  lastName: string;
  gender: Gender;
  dateOfBirth?: string; // YYYY-MM-DD
  phone?: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  // Clinical baseline
  bloodGroup: BloodGroup;
  allergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
  // Emergency contact
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  // Insurance
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  // Government-issued IDs the patient has consented to share with the
  // clinic — e.g. Aadhaar / SSN / passport / driving licence. Multiple
  // entries supported because patients often carry several (national
  // ID + a passport, etc.). Searched by /api/admin/patients/search.
  // Stored as a flat list of { country, type, number } so the same
  // search field can scan across IDs from any country.
  //
  // verifiedAt + verifiedBy track whether a staff member confirmed the
  // ID against an external source (passport scan, ABHA OTP, NHS
  // lookup, etc.). The verification-gate counts an ID as "verified"
  // only when verifiedAt is set. Unverified entries are still searchable
  // but don't unlock wallet top-up / appointment booking.
  governmentIds?: Array<{
    country: string;
    type: string;
    number: string;
    verifiedAt?: string;
    verifiedBy?: string;
  }>;
  // Ops
  notes?: string;
  status: "active" | "discharged" | "deceased";
  createdAt: string;
  updatedAt: string;
}

const patients: Patient[] = [];
const { hydrate, flush } = bindPersistentArray<Patient>(
  "patients",
  patients,
  () => []
);
await hydrate();

// MRN scheme: "M-{orgPrefix}-{seq}" where orgPrefix is first 3 letters of
// the org id minus the "org-" prefix. Sequence is per-org.
function nextMrn(organizationId: string): string {
  const orgSuffix = organizationId.replace(/^org-/, "").slice(0, 4).toUpperCase();
  const n = patients.filter((p) => p.organizationId === organizationId).length + 1;
  const seq = String(n).padStart(5, "0");
  let candidate = `MRN-${orgSuffix}-${seq}`;
  let i = n;
  // In the unlikely event of a collision, increment.
  while (patients.some((p) => p.organizationId === organizationId && p.mrn === candidate)) {
    i++;
    candidate = `MRN-${orgSuffix}-${String(i).padStart(5, "0")}`;
  }
  return candidate;
}

export function listPatients(opts: {
  organizationId: string;
  search?: string;
  status?: Patient["status"];
}): Patient[] {
  let list = patients.filter((p) => p.organizationId === opts.organizationId);
  if (opts.status) list = list.filter((p) => p.status === opts.status);
  if (opts.search) {
    const q = opts.search.toLowerCase();
    list = list.filter(
      (p) =>
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        p.mrn.toLowerCase().includes(q) ||
        (p.phone && p.phone.includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q))
    );
  }
  return list.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function getPatientById(id: string, organizationId: string): Patient | null {
  const p = patients.find((x) => x.id === id);
  if (!p || p.organizationId !== organizationId) return null;
  return p;
}

export interface PatientInput {
  firstName: string;
  lastName: string;
  gender: Gender;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  bloodGroup?: BloodGroup;
  allergies?: string[];
  chronicConditions?: string[];
  currentMedications?: string[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  governmentIds?: Array<{ country: string; type: string; number: string }>;
  notes?: string;
}

export function createPatient(organizationId: string, input: PatientInput): Patient {
  const now = new Date().toISOString();
  const p: Patient = {
    id: `pt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    mrn: nextMrn(organizationId),
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    gender: input.gender,
    dateOfBirth: input.dateOfBirth,
    phone: input.phone?.trim() || undefined,
    email: input.email?.trim().toLowerCase() || undefined,
    addressLine1: input.addressLine1?.trim() || undefined,
    addressLine2: input.addressLine2?.trim() || undefined,
    city: input.city?.trim() || undefined,
    state: input.state?.trim() || undefined,
    country: input.country?.trim() || undefined,
    postalCode: input.postalCode?.trim() || undefined,
    bloodGroup: input.bloodGroup ?? "unknown",
    allergies: (input.allergies || []).map((a) => a.trim()).filter(Boolean),
    chronicConditions: (input.chronicConditions || []).map((a) => a.trim()).filter(Boolean),
    currentMedications: (input.currentMedications || []).map((a) => a.trim()).filter(Boolean),
    emergencyContactName: input.emergencyContactName?.trim() || undefined,
    emergencyContactPhone: input.emergencyContactPhone?.trim() || undefined,
    emergencyContactRelation: input.emergencyContactRelation?.trim() || undefined,
    insuranceProvider: input.insuranceProvider?.trim() || undefined,
    insurancePolicyNumber: input.insurancePolicyNumber?.trim() || undefined,
    governmentIds: (input.governmentIds || [])
      .map((g) => ({
        country: (g.country || "").trim().toUpperCase(),
        type: (g.type || "").trim(),
        number: (g.number || "").trim(),
      }))
      .filter((g) => g.country && g.type && g.number),
    notes: input.notes?.trim() || undefined,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
  patients.unshift(p);
  flush();
  return p;
}

export function updatePatient(
  id: string,
  organizationId: string,
  patch: Partial<PatientInput & { status: Patient["status"] }>
): Patient | null {
  const p = patients.find((x) => x.id === id && x.organizationId === organizationId);
  if (!p) return null;
  if (patch.firstName !== undefined) p.firstName = patch.firstName.trim();
  if (patch.lastName !== undefined) p.lastName = patch.lastName.trim();
  if (patch.gender !== undefined) p.gender = patch.gender;
  if (patch.dateOfBirth !== undefined) p.dateOfBirth = patch.dateOfBirth;
  if (patch.phone !== undefined) p.phone = patch.phone?.trim() || undefined;
  if (patch.email !== undefined) p.email = patch.email?.trim().toLowerCase() || undefined;
  if (patch.addressLine1 !== undefined) p.addressLine1 = patch.addressLine1?.trim() || undefined;
  if (patch.addressLine2 !== undefined) p.addressLine2 = patch.addressLine2?.trim() || undefined;
  if (patch.city !== undefined) p.city = patch.city?.trim() || undefined;
  if (patch.state !== undefined) p.state = patch.state?.trim() || undefined;
  if (patch.country !== undefined) p.country = patch.country?.trim() || undefined;
  if (patch.postalCode !== undefined) p.postalCode = patch.postalCode?.trim() || undefined;
  if (patch.bloodGroup !== undefined) p.bloodGroup = patch.bloodGroup;
  if (patch.allergies !== undefined) p.allergies = patch.allergies.map((a) => a.trim()).filter(Boolean);
  if (patch.chronicConditions !== undefined) p.chronicConditions = patch.chronicConditions.map((a) => a.trim()).filter(Boolean);
  if (patch.currentMedications !== undefined) p.currentMedications = patch.currentMedications.map((a) => a.trim()).filter(Boolean);
  if (patch.emergencyContactName !== undefined) p.emergencyContactName = patch.emergencyContactName?.trim() || undefined;
  if (patch.emergencyContactPhone !== undefined) p.emergencyContactPhone = patch.emergencyContactPhone?.trim() || undefined;
  if (patch.emergencyContactRelation !== undefined) p.emergencyContactRelation = patch.emergencyContactRelation?.trim() || undefined;
  if (patch.insuranceProvider !== undefined) p.insuranceProvider = patch.insuranceProvider?.trim() || undefined;
  if (patch.insurancePolicyNumber !== undefined) p.insurancePolicyNumber = patch.insurancePolicyNumber?.trim() || undefined;
  if (patch.governmentIds !== undefined) {
    p.governmentIds = (patch.governmentIds || [])
      .map((g) => ({
        country: (g.country || "").trim().toUpperCase(),
        type: (g.type || "").trim(),
        number: (g.number || "").trim(),
      }))
      .filter((g) => g.country && g.type && g.number);
  }
  if (patch.notes !== undefined) p.notes = patch.notes?.trim() || undefined;
  if (patch.status !== undefined) p.status = patch.status;
  p.updatedAt = new Date().toISOString();
  flush();
  return p;
}

export function deletePatient(id: string, organizationId: string): boolean {
  const i = patients.findIndex((x) => x.id === id && x.organizationId === organizationId);
  if (i < 0) return false;
  patients.splice(i, 1);
  flush();
  return true;
}
