// Site-wide "Special Offers" — auto-applied discounts with banner text.
//
// Different from coupons: no code required, shown to every visitor in a
// banner, applied automatically at checkout while the offer is within its
// date window and marked active. An admin can run several at once (e.g.
// "20% off all consultations" + "Free shipping over $50"), but only the
// first active offer is auto-applied to the cart — the rest are display-only
// banners.

import { bindPersistentArray } from "./persistent-array";

export type OfferKind = "site" | "consult" | "shop";

export interface Offer {
  id: string;
  title: string;            // shown in admin list + internal reference
  bannerText: string;       // what visitors see, e.g. "20% OFF all consultations — today only!"
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrder: number;
  kind: OfferKind;          // where the discount applies
  startsAt: string;         // ISO date; "" = starts immediately
  endsAt: string;           // ISO date; "" = no end
  active: boolean;
  autoApply: boolean;       // when true, cart auto-deducts this offer's discount
  createdAt: string;
}

const offers: Offer[] = [];
const { hydrate, flush } = bindPersistentArray<Offer>(
  "offers",
  offers,
  () => []
);
await hydrate();

function isWithinWindow(o: Offer, now = new Date()): boolean {
  if (o.startsAt && new Date(o.startsAt) > now) return false;
  if (o.endsAt && new Date(o.endsAt) < now) return false;
  return true;
}

export function getOffers(): Offer[] {
  return [...offers].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}

export function getActiveOffers(): Offer[] {
  return offers.filter((o) => o.active && isWithinWindow(o));
}

// The single offer used for banner display + auto-apply. We pick the newest
// active auto-apply offer so admins can "supersede" an older one just by
// creating a new one.
export function getPrimaryOffer(): Offer | null {
  const active = getActiveOffers().filter((o) => o.autoApply);
  if (active.length === 0) return null;
  return active.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export function addOffer(
  input: Omit<Offer, "id" | "createdAt" | "bannerText"> & { bannerText?: string }
): Offer {
  const now = new Date().toISOString();
  const bannerText =
    input.bannerText ||
    `${input.discountType === "percentage" ? `${input.discountValue}% OFF` : `$${input.discountValue} OFF`} — ${input.title}`;
  const offer: Offer = {
    id: `o${Date.now()}`,
    createdAt: now,
    bannerText,
    title: input.title,
    discountType: input.discountType,
    discountValue: input.discountValue,
    minOrder: input.minOrder,
    kind: input.kind,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    active: input.active,
    autoApply: input.autoApply,
  };
  offers.push(offer);
  flush();
  return offer;
}

export function updateOffer(id: string, patch: Partial<Offer>): Offer | null {
  const idx = offers.findIndex((o) => o.id === id);
  if (idx < 0) return null;
  offers[idx] = { ...offers[idx], ...patch, id: offers[idx].id };
  flush();
  return offers[idx];
}

export function deleteOffer(id: string): boolean {
  const idx = offers.findIndex((o) => o.id === id);
  if (idx < 0) return false;
  offers.splice(idx, 1);
  flush();
  return true;
}
