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
const { hydrate, flush } = bindPersistentArray<ClinicStaff>(
  "clinic_staff",
  staff,
  () => []
);
await hydrate();

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
  const record: ClinicStaff = {
    id: `CST-${nextId++}`,
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
