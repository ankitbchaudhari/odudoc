// Clinic staff accounts — receptionists and assistants who log in at the
// front desk to look up bookings, mark arrivals, and record EMR entries.
//
// Auth model: bcrypt password hash, scoped to one clinic. The doctor adds
// staff from their dashboard; staff log in at /c/[clinicId]/login. A
// successful login mints a signed cookie (clinic-session) holding
// { staffId, clinicId, role, exp } valid for 12h.

import bcrypt from "bcryptjs";
import { bindPersistentArray } from "./persistent-array";

export type ClinicRole = "receptionist" | "assistant" | "manager";

export interface ClinicStaff {
  id: string;             // CST-XXXX
  clinicId: string;
  name: string;
  email: string;          // login identifier, lowercased
  phone?: string;
  role: ClinicRole;
  passwordHash: string;
  active: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

const staff: ClinicStaff[] = [];
const persistence = bindPersistentArray<ClinicStaff>(
  "clinic_staff",
  staff,
  () => []
);
const { hydrate, flush, reload } = persistence;
await hydrate();

/** Force a re-pull from Postgres. Required on the login path because
 *  staff created by Lambda A (via the doctor's clinic-management page)
 *  isn't visible to Lambda B (handling the staff's login request)
 *  until B's in-memory array is refreshed — Vercel serverless doesn't
 *  share state across Lambdas. */
export async function reloadStaff(): Promise<void> {
  await reload();
}

let nextId = staff.reduce((max, s) => {
  const m = /^CST-(\d+)$/.exec(s.id);
  const n = m ? parseInt(m[1], 10) : 0;
  return n > max ? n : max;
}, 1000) + 1;

export async function createClinicStaff(input: {
  clinicId: string;
  name: string;
  email: string;
  phone?: string;
  role: ClinicRole;
  password: string;
}): Promise<ClinicStaff> {
  const email = input.email.trim().toLowerCase();
  const existing = staff.find((s) => s.clinicId === input.clinicId && s.email === email);
  if (existing) throw new Error("A staff member with this email already exists at this clinic.");
  const passwordHash = await bcrypt.hash(input.password, 10);
  // Race-safe id — see bookings-store createBooking for rationale.
  const maxExisting = staff.reduce((max, s) => {
    const m = /^CST-(\d+)$/.exec(s.id);
    const n = m ? parseInt(m[1], 10) : 0;
    return n > max ? n : max;
  }, 1000);
  const candidate = Math.max(nextId, maxExisting + 1);
  nextId = candidate + 1;
  const record: ClinicStaff = {
    id: `CST-${candidate}`,
    clinicId: input.clinicId,
    name: input.name.trim(),
    email,
    phone: input.phone?.trim(),
    role: input.role,
    passwordHash,
    active: true,
    createdAt: new Date().toISOString(),
  };
  staff.push(record);
  flush();
  return record;
}

export function listStaffByClinic(clinicId: string): ClinicStaff[] {
  return staff.filter((s) => s.clinicId === clinicId);
}

export function getStaffById(id: string): ClinicStaff | undefined {
  return staff.find((s) => s.id === id);
}

export async function verifyClinicStaffCredentials(
  clinicId: string,
  email: string,
  password: string
): Promise<ClinicStaff | null> {
  const normalized = email.trim().toLowerCase();
  const record = staff.find(
    (s) => s.clinicId === clinicId && s.email === normalized && s.active
  );
  if (!record) return null;
  const ok = await bcrypt.compare(password, record.passwordHash);
  if (!ok) return null;
  record.lastLoginAt = new Date().toISOString();
  flush();
  return record;
}

export function deactivateStaff(id: string): boolean {
  const s = staff.find((x) => x.id === id);
  if (!s) return false;
  s.active = false;
  flush();
  return true;
}

export function deleteStaff(id: string): boolean {
  const idx = staff.findIndex((s) => s.id === id);
  if (idx === -1) return false;
  staff.splice(idx, 1);
  flush();
  return true;
}
