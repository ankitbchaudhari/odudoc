// Tele-ICU virtual-bed registry.
//
// Each row is one ICU bed at a hospital that's been onboarded into
// the tele-ICU service. The remote intensivist's command-center grid
// renders one tile per bed; bed detail shows live vitals + recent
// alerts + a notes thread for handover.
//
// We keep this distinct from the inter-org-beds-store (which tracks
// aggregate bed-availability for the bed-feed feature). That one
// answers "how many ICU beds are free across the network?". This one
// answers "which patient is in bed 12, what are their last vitals,
// and is anything alarming?".
//
// Wearable readings provide the vitals stream: bed.monitorDeviceId
// references a WearableDevice. The alert engine reads the last hour
// of readings via the wearables store API.

import { bindPersistentArray } from "../persistent-array";

export type BedStatus =
  | "vacant"          // no patient currently assigned
  | "occupied"        // patient admitted, monitoring active
  | "stepping_down"   // ready to leave ICU but still in
  | "transferred"     // patient moved to another facility
  | "discharged";     // patient out of hospital

export interface TeleIcuBed {
  id: string;
  /** Owning hospital — references organizations-store. */
  organizationId: string;
  /** Display name like "ICU-3 Bed 12". */
  bedLabel: string;
  ward?: string;
  /** Patient — references users-store. Null when vacant. */
  patientUserId?: string;
  patientName?: string;
  patientAge?: number;
  patientSex?: "male" | "female" | "other";
  /** Primary admitting diagnosis. */
  admissionDiagnosis?: string;
  /** ICU-relevant context the intensivist needs at-a-glance. */
  ventilatorMode?: string;
  vasopressors?: string[];      // e.g. ["noradrenaline 0.1 mcg/kg/min"]
  /** Wearable device feeding live vitals. Optional — manual-entry
   *  beds also work; the alert engine just won't have a stream. */
  monitorDeviceId?: string;
  status: BedStatus;
  /** Code-blue / DNR status flag. */
  codeStatus?: "full_code" | "dnr" | "dnar";
  admittedAt?: string;
  dischargedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const beds: TeleIcuBed[] = [];
const { hydrate, flush, tombstone } = bindPersistentArray<TeleIcuBed>(
  "teleicu_beds",
  beds,
  () => []
);
await hydrate();

export function listBedsForOrg(organizationId: string): TeleIcuBed[] {
  return beds
    .filter((b) => b.organizationId === organizationId)
    .sort((a, b) => a.bedLabel.localeCompare(b.bedLabel));
}

/** All beds across the network — the tele-ICU command center sees
 *  every bed it covers regardless of organisation, ranked by status
 *  + bed label so vacant beds sink to the bottom. */
export function listAllBeds(): TeleIcuBed[] {
  const order: Record<BedStatus, number> = {
    occupied: 0,
    stepping_down: 1,
    vacant: 2,
    transferred: 3,
    discharged: 4,
  };
  return [...beds].sort((a, b) => {
    const so = (order[a.status] ?? 9) - (order[b.status] ?? 9);
    if (so !== 0) return so;
    return a.bedLabel.localeCompare(b.bedLabel);
  });
}

export function getBed(id: string): TeleIcuBed | null {
  return beds.find((b) => b.id === id) || null;
}

export interface CreateBedInput {
  organizationId: string;
  bedLabel: string;
  ward?: string;
}

export function createBed(input: CreateBedInput): TeleIcuBed {
  const now = new Date().toISOString();
  const b: TeleIcuBed = {
    id: `tib-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId: input.organizationId,
    bedLabel: input.bedLabel.trim(),
    ward: input.ward?.trim() || undefined,
    status: "vacant",
    createdAt: now,
    updatedAt: now,
  };
  beds.push(b);
  flush();
  return b;
}

export interface UpdateBedInput {
  patientUserId?: string;
  patientName?: string;
  patientAge?: number;
  patientSex?: "male" | "female" | "other";
  admissionDiagnosis?: string;
  ventilatorMode?: string;
  vasopressors?: string[];
  monitorDeviceId?: string;
  status?: BedStatus;
  codeStatus?: "full_code" | "dnr" | "dnar";
  admittedAt?: string;
  dischargedAt?: string;
  bedLabel?: string;
  ward?: string;
}

export function updateBed(id: string, patch: UpdateBedInput): TeleIcuBed | null {
  const b = beds.find((x) => x.id === id);
  if (!b) return null;
  Object.assign(b, patch);
  b.updatedAt = new Date().toISOString();
  flush();
  return b;
}

export function deleteBed(id: string): boolean {
  const i = beds.findIndex((b) => b.id === id);
  if (i < 0) return false;
  tombstone(beds[i].id);
  beds.splice(i, 1);
  flush();
  return true;
}

export function deleteBedsForOrg(organizationId: string): number {
  let n = 0;
  for (let i = beds.length - 1; i >= 0; i--) {
    if (beds[i].organizationId === organizationId) {
      tombstone(beds[i].id);
      beds.splice(i, 1);
      n++;
    }
  }
  if (n > 0) flush();
  return n;
}
