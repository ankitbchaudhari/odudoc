// Per-clinic TPA empanelment.
//
// Sibling to OrgEmpanelment in lib/insurance/tpa-store.ts (which is
// keyed on organizationId for the hospital module). Standalone clinics
// register here, keyed on clinicId. Cashless pre-auth from a clinic
// reads this table to know which TPAs the clinic is empanelled with,
// the agreed discount %, and where to submit the claim.

import { bindPersistentArray } from "../persistent-array";
import { getTpa } from "./tpa-store";

export interface ClinicEmpanelment {
  id: string;
  clinicId: string;
  tpaId: string;
  /** Discount % the clinic extends to this TPA's members. */
  discountPct: number;
  /** Claim portal URL the front desk uses for cashless. */
  portalUrl?: string;
  /** Direct contact at the TPA / insurer for cashless desk. */
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  /** Empanelment expiry — drives the renewal-nudge banner. */
  validUntil?: string;
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const empanelments: ClinicEmpanelment[] = [];
const persistence = bindPersistentArray<ClinicEmpanelment>(
  "clinic_tpa_empanelments",
  empanelments,
  () => [],
);
const { hydrate, flush, reload } = persistence;
await hydrate();

export async function reloadClinicEmpanelments(): Promise<void> {
  await reload();
}

let nextSeq = empanelments.reduce((max, e) => {
  const m = /^CEMP-(\d+)$/.exec(e.id);
  const n = m ? parseInt(m[1], 10) : 0;
  return n > max ? n : max;
}, 1000) + 1;

export function listEmpanelmentsForClinic(clinicId: string): ClinicEmpanelment[] {
  return empanelments
    .filter((e) => e.clinicId === clinicId)
    .sort((a, b) => a.tpaId.localeCompare(b.tpaId));
}

export function getClinicEmpanelment(clinicId: string, tpaId: string): ClinicEmpanelment | null {
  return empanelments.find((e) => e.clinicId === clinicId && e.tpaId === tpaId) || null;
}

export interface UpsertClinicEmpanelmentInput {
  clinicId: string;
  tpaId: string;
  discountPct?: number;
  portalUrl?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  validUntil?: string;
  notes?: string;
  active?: boolean;
}

export function upsertClinicEmpanelment(input: UpsertClinicEmpanelmentInput): ClinicEmpanelment {
  if (!getTpa(input.tpaId)) throw new Error("unknown_tpa");
  const existing = getClinicEmpanelment(input.clinicId, input.tpaId);
  const now = new Date().toISOString();
  if (existing) {
    if (input.discountPct !== undefined) existing.discountPct = input.discountPct;
    if (input.portalUrl !== undefined) existing.portalUrl = input.portalUrl;
    if (input.contactPerson !== undefined) existing.contactPerson = input.contactPerson;
    if (input.contactPhone !== undefined) existing.contactPhone = input.contactPhone;
    if (input.contactEmail !== undefined) existing.contactEmail = input.contactEmail;
    if (input.validUntil !== undefined) existing.validUntil = input.validUntil;
    if (input.notes !== undefined) existing.notes = input.notes;
    if (input.active !== undefined) existing.active = input.active;
    existing.updatedAt = now;
    flush();
    return existing;
  }
  // Race-safe id — same pattern as other stores in this codebase.
  const maxExisting = empanelments.reduce((max, e) => {
    const m = /^CEMP-(\d+)$/.exec(e.id);
    const n = m ? parseInt(m[1], 10) : 0;
    return n > max ? n : max;
  }, 1000);
  const candidate = Math.max(nextSeq, maxExisting + 1);
  nextSeq = candidate + 1;
  const row: ClinicEmpanelment = {
    id: `CEMP-${candidate}`,
    clinicId: input.clinicId,
    tpaId: input.tpaId,
    discountPct: input.discountPct ?? 0,
    portalUrl: input.portalUrl,
    contactPerson: input.contactPerson,
    contactPhone: input.contactPhone,
    contactEmail: input.contactEmail,
    validUntil: input.validUntil,
    notes: input.notes,
    active: input.active ?? true,
    createdAt: now,
    updatedAt: now,
  };
  empanelments.push(row);
  flush();
  return row;
}

export function deleteClinicEmpanelment(id: string, clinicId: string): boolean {
  const idx = empanelments.findIndex((e) => e.id === id && e.clinicId === clinicId);
  if (idx === -1) return false;
  empanelments.splice(idx, 1);
  flush();
  return true;
}
