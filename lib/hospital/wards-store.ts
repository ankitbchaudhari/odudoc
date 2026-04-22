// Wards & beds — hospital IPD capacity model. Tenant-scoped.
//
// A ward has many beds. Each bed has a status (available / occupied /
// reserved / maintenance). The actual admission (patient, dates, doctor)
// lives in admissions-store; this store just tracks the physical capacity
// and the currently-occupying admissionId per bed.

import { bindPersistentArray } from "../persistent-array";

export type BedStatus = "available" | "occupied" | "reserved" | "maintenance";
export type WardType =
  | "general"
  | "private"
  | "semi_private"
  | "icu"
  | "nicu"
  | "picu"
  | "hdu"
  | "isolation"
  | "maternity"
  | "other";

export interface Bed {
  id: string;
  bedNumber: string;
  status: BedStatus;
  currentAdmissionId?: string;
  dailyRate?: number; // override; else inherit from ward
  notes?: string;
}

export interface Ward {
  id: string;
  organizationId: string;
  name: string;
  type: WardType;
  floor?: string;
  dailyRate: number; // default per-bed per-day
  beds: Bed[];
  active: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const wards: Ward[] = [];
const { hydrate, flush } = bindPersistentArray<Ward>(
  "hospital-wards",
  wards,
  () => []
);
await hydrate();

function newBedId() {
  return `bed-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function listWards(opts: {
  organizationId: string;
  type?: WardType;
  activeOnly?: boolean;
}): Ward[] {
  let list = wards.filter((w) => w.organizationId === opts.organizationId);
  if (opts.type) list = list.filter((w) => w.type === opts.type);
  if (opts.activeOnly) list = list.filter((w) => w.active);
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

export function getWardById(id: string, organizationId: string): Ward | null {
  const w = wards.find((x) => x.id === id);
  if (!w || w.organizationId !== organizationId) return null;
  return w;
}

export function findBed(
  bedId: string,
  organizationId: string
): { ward: Ward; bed: Bed } | null {
  for (const w of wards) {
    if (w.organizationId !== organizationId) continue;
    const b = w.beds.find((x) => x.id === bedId);
    if (b) return { ward: w, bed: b };
  }
  return null;
}

export interface WardInput {
  name: string;
  type: WardType;
  floor?: string;
  dailyRate?: number;
  active?: boolean;
  notes?: string;
}

export function createWard(organizationId: string, input: WardInput): Ward {
  const now = new Date().toISOString();
  const w: Ward = {
    id: `ward-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    name: input.name.trim(),
    type: input.type,
    floor: input.floor?.trim() || undefined,
    dailyRate: Math.max(0, Number(input.dailyRate) || 0),
    beds: [],
    active: input.active ?? true,
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  wards.push(w);
  flush();
  return w;
}

export function updateWard(
  id: string,
  organizationId: string,
  patch: Partial<WardInput>
): Ward | null {
  const w = wards.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!w) return null;
  if (patch.name !== undefined) w.name = patch.name.trim();
  if (patch.type !== undefined) w.type = patch.type;
  if (patch.floor !== undefined) w.floor = patch.floor?.trim() || undefined;
  if (patch.dailyRate !== undefined)
    w.dailyRate = Math.max(0, Number(patch.dailyRate) || 0);
  if (patch.active !== undefined) w.active = patch.active;
  if (patch.notes !== undefined) w.notes = patch.notes?.trim() || undefined;
  w.updatedAt = new Date().toISOString();
  flush();
  return w;
}

export function deleteWard(id: string, organizationId: string): boolean {
  const i = wards.findIndex(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (i < 0) return false;
  // Refuse if any bed is occupied.
  if (wards[i].beds.some((b) => b.status === "occupied")) return false;
  wards.splice(i, 1);
  flush();
  return true;
}

export function addBed(
  wardId: string,
  organizationId: string,
  input: { bedNumber: string; dailyRate?: number; notes?: string }
): Bed | null {
  const w = wards.find(
    (x) => x.id === wardId && x.organizationId === organizationId
  );
  if (!w) return null;
  const b: Bed = {
    id: newBedId(),
    bedNumber: input.bedNumber.trim() || `B${w.beds.length + 1}`,
    status: "available",
    dailyRate:
      input.dailyRate !== undefined
        ? Math.max(0, Number(input.dailyRate))
        : undefined,
    notes: input.notes?.trim() || undefined,
  };
  w.beds.push(b);
  w.updatedAt = new Date().toISOString();
  flush();
  return b;
}

export function updateBed(
  wardId: string,
  bedId: string,
  organizationId: string,
  patch: Partial<{
    bedNumber: string;
    status: BedStatus;
    dailyRate?: number;
    notes?: string;
  }>
): Bed | null {
  const w = wards.find(
    (x) => x.id === wardId && x.organizationId === organizationId
  );
  if (!w) return null;
  const b = w.beds.find((x) => x.id === bedId);
  if (!b) return null;
  if (patch.bedNumber !== undefined) b.bedNumber = patch.bedNumber.trim();
  if (patch.status !== undefined) {
    // Don't allow forcing status change when a live admission is linked —
    // admissions module is the only thing that should flip occupied↔available.
    if (b.currentAdmissionId && patch.status === "available") {
      return null;
    }
    b.status = patch.status;
  }
  if (patch.dailyRate !== undefined) b.dailyRate = patch.dailyRate;
  if (patch.notes !== undefined) b.notes = patch.notes?.trim() || undefined;
  w.updatedAt = new Date().toISOString();
  flush();
  return b;
}

export function removeBed(
  wardId: string,
  bedId: string,
  organizationId: string
): boolean {
  const w = wards.find(
    (x) => x.id === wardId && x.organizationId === organizationId
  );
  if (!w) return false;
  const i = w.beds.findIndex((x) => x.id === bedId);
  if (i < 0) return false;
  if (w.beds[i].status === "occupied") return false;
  w.beds.splice(i, 1);
  w.updatedAt = new Date().toISOString();
  flush();
  return true;
}

// Mark a bed occupied by an admission. Called by admissions-store.
export function occupyBed(
  bedId: string,
  organizationId: string,
  admissionId: string
): { ward: Ward; bed: Bed } | null {
  const hit = findBed(bedId, organizationId);
  if (!hit) return null;
  if (hit.bed.status === "occupied") return null;
  hit.bed.status = "occupied";
  hit.bed.currentAdmissionId = admissionId;
  hit.ward.updatedAt = new Date().toISOString();
  flush();
  return hit;
}

// Free a bed when the admission discharges / cancels.
export function freeBed(
  bedId: string,
  organizationId: string
): { ward: Ward; bed: Bed } | null {
  const hit = findBed(bedId, organizationId);
  if (!hit) return null;
  hit.bed.status = "available";
  hit.bed.currentAdmissionId = undefined;
  hit.ward.updatedAt = new Date().toISOString();
  flush();
  return hit;
}

export function bedDailyRate(bedId: string, organizationId: string): number {
  const hit = findBed(bedId, organizationId);
  if (!hit) return 0;
  return hit.bed.dailyRate ?? hit.ward.dailyRate ?? 0;
}
