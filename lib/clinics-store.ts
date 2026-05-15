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

  // ── Tax details (filled at registration or first invoice) ──────────
  // Doctors / hospitals must declare their tax identity so every
  // invoice generated at this clinic carries valid tax info. India →
  // GSTIN (15 chars), US → EIN, UK → VAT number, etc. The tax engine
  // uses the clinic's country (above) to pick the right rate; the
  // identity fields below appear on the printed invoice.
  legalBusinessName?: string;
  /** ISO-3166 alpha-2, e.g. "IN". Defaults to the country field on
   *  the clinic; we copy it here at create time so the invoice path
   *  has a stable code without re-mapping the country name. */
  taxCountryCode?: string;
  /** Format of the tax id: GSTIN / PAN / VAT / EIN / etc. */
  taxIdType?: "GSTIN" | "PAN" | "VAT" | "EIN" | "TRN" | "ABN" | "OTHER";
  taxId?: string;
  /** When false, invoices issued by this clinic are zero-tax (e.g.
   *  individual doctor under threshold, services-exempt). */
  taxRegistered?: boolean;
  /** India only: doctor's state code (e.g. "GJ"). Drives intra-state
   *  vs inter-state GST split. */
  homeStateCode?: string;

  /** Admin can disable a clinic without deleting (preserves booking history) */
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const clinics: Clinic[] = [];
const { hydrate, flush, reload } = bindPersistentArray<Clinic>(
  "clinics",
  clinics,
  () => []
);
await hydrate();

/** Force a re-pull from Postgres. Needed on cross-Lambda paths like
 *  the patient-facing /doctors list (the doctor may have registered
 *  a clinic on a different Lambda than the one serving the visitor). */
export async function reloadClinics(): Promise<void> {
  await reload();
}

let nextId = clinics.reduce((max, c) => {
  const m = /^CL-(\d+)$/.exec(c.id);
  const n = m ? parseInt(m[1], 10) : 0;
  return n > max ? n : max;
}, 1000) + 1;

export function createClinic(
  data: Omit<Clinic, "id" | "createdAt" | "updatedAt">
): Clinic {
  const now = new Date().toISOString();
  // Race-safe id — see bookings-store createBooking for rationale.
  const maxExisting = clinics.reduce((max, c) => {
    const m = /^CL-(\d+)$/.exec(c.id);
    const n = m ? parseInt(m[1], 10) : 0;
    return n > max ? n : max;
  }, 1000);
  const candidate = Math.max(nextId, maxExisting + 1);
  nextId = candidate + 1;
  const clinic: Clinic = {
    ...data,
    id: `CL-${candidate}`,
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
