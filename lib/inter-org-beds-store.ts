// Bed availability live feed.
//
// Each org publishes a snapshot of its bed counts by ward type. Other
// connected orgs (and ambulance dispatch services) read the feed to
// route patients to the nearest available facility.
//
// We deliberately keep this simple — orgs UPSERT their full snapshot
// on each push rather than incrementing/decrementing per-bed. That
// mirrors how hospital information systems publish bed-board telemetry
// (a SCADA-style snapshot) and avoids replay/race issues.
//
// Rows are tombstoned when the org is deleted.

import { bindPersistentArray } from "./persistent-array";

/** Categories the dashboard surfaces. We pick the operationally
 *  meaningful tiers, not every micro-bay — high-acuity (ICU, NICU),
 *  surgical (post-op), maternity, paediatric, general, isolation,
 *  emergency. The schema is a flat record so adding a new category
 *  doesn't break older readers. */
export type BedCategory =
  | "icu"
  | "hdu"          // high-dependency unit
  | "ventilator"
  | "general"
  | "private"
  | "maternity"
  | "nicu"
  | "paediatric"
  | "emergency"
  | "isolation"
  | "post_op";

export interface BedSnapshot {
  id: string;            // == organizationId; one row per org
  organizationId: string;
  /** capacity[cat] = total beds of that category. */
  capacity: Partial<Record<BedCategory, number>>;
  /** available[cat] = currently free, ≤ capacity[cat]. */
  available: Partial<Record<BedCategory, number>>;
  /** Optional staffing flag — even with a free bed, no nurse means
   *  it can't be used. Hospitals tick this when they're short-staffed. */
  staffShortage?: boolean;
  /** Free-text note: "RT shortage on 3rd floor", "trauma team prepping". */
  notice?: string;
  updatedAt: string;
  updatedByUserId?: string;
  updatedByEmail?: string;
}

const snapshots: BedSnapshot[] = [];
const {
  hydrate,
  reload: reloadBedsInternal,
  flush,
  tombstone,
} = bindPersistentArray<BedSnapshot>(
  "bed_snapshots",
  snapshots,
  () => []
);
await hydrate();

export async function reloadBedSnapshots() {
  await reloadBedsInternal();
}

export function getBedSnapshot(orgId: string): BedSnapshot | null {
  return snapshots.find((s) => s.organizationId === orgId) || null;
}

export function listBedSnapshots(orgIds?: string[]): BedSnapshot[] {
  if (!orgIds) return [...snapshots];
  const want = new Set(orgIds);
  return snapshots.filter((s) => want.has(s.organizationId));
}

export interface UpsertSnapshotInput {
  organizationId: string;
  capacity: Partial<Record<BedCategory, number>>;
  available: Partial<Record<BedCategory, number>>;
  staffShortage?: boolean;
  notice?: string;
  updatedByUserId?: string;
  updatedByEmail?: string;
}

export function upsertBedSnapshot(input: UpsertSnapshotInput): BedSnapshot {
  // Defensive clamp: free can't exceed total. Hospitals don't intend
  // to publish bad data but a typo on a BMS feed could.
  const cleanAvail: Partial<Record<BedCategory, number>> = {};
  for (const cat of Object.keys(input.available) as BedCategory[]) {
    const cap = input.capacity[cat] ?? 0;
    const av = input.available[cat] ?? 0;
    cleanAvail[cat] = Math.max(0, Math.min(av, cap));
  }
  const now = new Date().toISOString();
  const existing = snapshots.find(
    (s) => s.organizationId === input.organizationId,
  );
  if (existing) {
    existing.capacity = input.capacity;
    existing.available = cleanAvail;
    existing.staffShortage = input.staffShortage;
    existing.notice = input.notice?.trim() || undefined;
    existing.updatedAt = now;
    existing.updatedByUserId = input.updatedByUserId;
    existing.updatedByEmail = input.updatedByEmail;
    flush();
    return existing;
  }
  const snap: BedSnapshot = {
    id: input.organizationId,
    organizationId: input.organizationId,
    capacity: input.capacity,
    available: cleanAvail,
    staffShortage: input.staffShortage,
    notice: input.notice?.trim() || undefined,
    updatedAt: now,
    updatedByUserId: input.updatedByUserId,
    updatedByEmail: input.updatedByEmail,
  };
  snapshots.push(snap);
  flush();
  return snap;
}

export function deleteBedSnapshot(orgId: string): boolean {
  const i = snapshots.findIndex((s) => s.organizationId === orgId);
  if (i < 0) return false;
  tombstone(snapshots[i].id);
  snapshots.splice(i, 1);
  flush();
  return true;
}
