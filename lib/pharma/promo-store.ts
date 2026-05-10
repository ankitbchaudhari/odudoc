// Pharma drug promo / detailing.
//
// Pharma orgs publish promo cards targeting doctor specialties.
// Doctors see a small inbox of "what's new from pharma" inside
// /dashboard/doctor — non-blocking, dismissable. Click-through is
// counted (impressions + clicks) so the pharma can measure reach.
//
// Compliance note: gifts / kickbacks vary jurisdiction-by-jurisdiction
// and are not handled here. This store records advertising
// impressions only. Operators must ensure their use of these slots
// complies with local pharma promotion law.

import { bindPersistentArray } from "../persistent-array";

export interface PromoSlot {
  id: string;
  organizationId: string;        // pharma company
  drugId?: string;               // links to /lib/pharma/catalogue-store
  headline: string;
  subhead?: string;
  bodyText?: string;
  /** Image URL (data: URL ok). */
  imageUrl?: string;
  /** Target specialties — empty = all. */
  specialties?: string[];
  /** Target cities — empty = all. */
  cities?: string[];
  /** Spending — for billing the pharma org. */
  cpcRupees?: number;
  /** Lifecycle. */
  startsAt?: string;
  endsAt?: string;
  active: boolean;
  /** Engagement counters — pure analytics, no PII. */
  impressions: number;
  clicks: number;
  createdAt: string;
  updatedAt: string;
}

const slots: PromoSlot[] = [];
const { hydrate, flush, tombstone } = bindPersistentArray<PromoSlot>(
  "pharma_promo_slots",
  slots,
  () => []
);
await hydrate();

export interface CreateSlotInput {
  organizationId: string;
  drugId?: string;
  headline: string;
  subhead?: string;
  bodyText?: string;
  imageUrl?: string;
  specialties?: string[];
  cities?: string[];
  cpcRupees?: number;
  startsAt?: string;
  endsAt?: string;
}

export function createSlot(input: CreateSlotInput): PromoSlot {
  const at = new Date().toISOString();
  const s: PromoSlot = {
    id: `promo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId: input.organizationId,
    drugId: input.drugId,
    headline: input.headline.trim(),
    subhead: input.subhead?.trim() || undefined,
    bodyText: input.bodyText?.trim() || undefined,
    imageUrl: input.imageUrl,
    specialties: input.specialties?.map((x) => x.trim()).filter(Boolean),
    cities: input.cities?.map((x) => x.trim()).filter(Boolean),
    cpcRupees: input.cpcRupees,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    active: true,
    impressions: 0,
    clicks: 0,
    createdAt: at, updatedAt: at,
  };
  slots.unshift(s);
  flush();
  return s;
}

export function listSlots(opts: { organizationId?: string; activeOnly?: boolean } = {}): PromoSlot[] {
  let list = [...slots];
  if (opts.organizationId) list = list.filter((s) => s.organizationId === opts.organizationId);
  if (opts.activeOnly) {
    const now = Date.now();
    list = list.filter((s) =>
      s.active &&
      (!s.startsAt || new Date(s.startsAt).getTime() <= now) &&
      (!s.endsAt || new Date(s.endsAt).getTime() >= now)
    );
  }
  return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Slots targeted at a viewer doctor — filtered by specialty + city. */
export function listForViewer(opts: { specialty?: string; city?: string }): PromoSlot[] {
  return listSlots({ activeOnly: true }).filter((s) => {
    if (s.specialties && s.specialties.length > 0) {
      if (!opts.specialty) return false;
      if (!s.specialties.some((sp) => sp.toLowerCase() === opts.specialty!.toLowerCase())) return false;
    }
    if (s.cities && s.cities.length > 0) {
      if (!opts.city) return false;
      if (!s.cities.some((c) => c.toLowerCase() === opts.city!.toLowerCase())) return false;
    }
    return true;
  });
}

export function recordImpression(id: string): void {
  const s = slots.find((x) => x.id === id);
  if (!s) return;
  s.impressions++;
  flush();
}

export function recordClick(id: string): void {
  const s = slots.find((x) => x.id === id);
  if (!s) return;
  s.clicks++;
  flush();
}

export function setSlotActive(id: string, organizationId: string, active: boolean): PromoSlot | null {
  const s = slots.find((x) => x.id === id && x.organizationId === organizationId);
  if (!s) return null;
  s.active = active;
  s.updatedAt = new Date().toISOString();
  flush();
  return s;
}

export function deleteSlot(id: string, organizationId: string): boolean {
  const i = slots.findIndex((s) => s.id === id && s.organizationId === organizationId);
  if (i < 0) return false;
  tombstone(slots[i].id);
  slots.splice(i, 1);
  flush();
  return true;
}

export function deleteSlotsForOrg(organizationId: string): number {
  let n = 0;
  for (let i = slots.length - 1; i >= 0; i--) {
    if (slots[i].organizationId === organizationId) {
      tombstone(slots[i].id);
      slots.splice(i, 1);
      n++;
    }
  }
  if (n) flush();
  return n;
}
