// Clinic registry — each doctor can register one or more physical clinics
// they operate. Patients see these on the doctor profile and can book an
// in-person slot at a specific clinic. The clinicId travels with the
// booking so the right clinic's reception can pull it up.

import { bindPersistentArray } from "./persistent-array";

export interface ClinicHours {
  /** Day index 0=Sun..6=Sat */
  day: number;
  open: string;   // "09:00"
  close: string;  // "18:00"
  closed?: boolean;
}

export interface Clinic {
  id: string;                        // CL-XXXX
  doctorId: string;                  // owning doctor (user id or slug)
  doctorEmail?: string;              // for cross-reference
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  phone?: string;
  lat?: number;
  lng?: number;
  mapsUrl?: string;                  // Google Maps share link (optional)
  hours: ClinicHours[];
  /** Accept payment at booking time (true) and/or at clinic (false). Both
   *  may be true — patient picks at booking. Default: both enabled. */
  acceptOnlinePayment: boolean;
  acceptClinicPayment: boolean;
  /** Per-visit consultation fee at this clinic (USD authoring, displayed
   *  in patient currency). If omitted, the doctor's default fee applies. */
  feeOverride?: number;
  photoUrls?: string[];
  /** Admin can disable a clinic without deleting (preserves booking history) */
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const clinics: Clinic[] = [];
const { hydrate, flush } = bindPersistentArray<Clinic>(
  "clinics",
  clinics,
  () => []
);
await hydrate();

let nextId = clinics.reduce((max, c) => {
  const m = /^CL-(\d+)$/.exec(c.id);
  const n = m ? parseInt(m[1], 10) : 0;
  return n > max ? n : max;
}, 1000) + 1;

export function createClinic(
  data: Omit<Clinic, "id" | "createdAt" | "updatedAt">
): Clinic {
  const now = new Date().toISOString();
  const clinic: Clinic = {
    ...data,
    id: `CL-${nextId++}`,
    createdAt: now,
    updatedAt: now,
  };
  clinics.push(clinic);
  flush();
  return clinic;
}

export function getClinicById(id: string): Clinic | undefined {
  return clinics.find((c) => c.id === id);
}

export function listClinicsByDoctor(doctorId: string): Clinic[] {
  return clinics
    .filter((c) => c.doctorId === doctorId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Public-facing list — only active clinics, used on patient doctor profile */
export function listActiveClinicsByDoctor(doctorId: string): Clinic[] {
  return listClinicsByDoctor(doctorId).filter((c) => c.active);
}

export function updateClinic(
  id: string,
  patch: Partial<Omit<Clinic, "id" | "createdAt">>
): Clinic | undefined {
  const c = clinics.find((x) => x.id === id);
  if (!c) return undefined;
  Object.assign(c, patch, { updatedAt: new Date().toISOString() });
  flush();
  return c;
}

export function deleteClinic(id: string): boolean {
  const idx = clinics.findIndex((c) => c.id === id);
  if (idx === -1) return false;
  clinics.splice(idx, 1);
  flush();
  return true;
}

/** Lookup helper used during booking — checks the clinic belongs to the
 *  given doctor before letting a patient book there. Prevents tampering
 *  with the clinicId in the booking payload. */
export function clinicBelongsToDoctor(
  clinicId: string,
  doctorId: string
): boolean {
  const c = getClinicById(clinicId);
  return !!c && c.doctorId === doctorId && c.active;
}
