// Vendor store-locations + inventory.
//
// A Vendor (see vendors-store.ts) is a company. One vendor can run many
// physical shops, each with its own lat/lng, pickup/delivery config,
// and price list. Phase D keeps this deliberately simple:
//
//   - StoreLocation: one row per physical shop
//   - InventoryRow:  one row per (storeId, medicineId); holds price,
//                    stock, and an optional brand override (so "Dolo 650"
//                    and the generic Paracetamol can both live under
//                    the same catalog medicineId while still showing the
//                    right label on the receipt)
//
// Both are backed by bindPersistentArray so they survive Lambda
// recycles but stay cheap to query.

import { bindPersistentArray } from "./persistent-array";
import type { LatLng } from "./geo";

export interface StoreLocation {
  id: string;
  vendorId: string;
  name: string; // "OduDoc Pharmacy — Indiranagar"
  addressLine: string;
  city: string;
  pincode: string;
  lat: number;
  lng: number;
  pickup: boolean; // can patient collect in-store?
  delivery: boolean; // does store deliver?
  deliveryRadiusKm?: number; // optional hard cap for delivery offers
  phone?: string;
  hours?: string; // free-text: "9am – 10pm daily"
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryRow {
  id: string;
  storeId: string;
  medicineId: string; // foreign key into medicines-catalog
  brandLabel?: string; // which brand of the generic this row represents
  strength?: string; // e.g. "500mg" — narrows inside a medicineId
  priceInr: number; // price per unit (tab / strip / bottle etc.)
  unit: string; // free-text: "per strip of 10", "per bottle"
  stock: number; // current qty on hand
  expiresAt?: string; // ISO date
  createdAt: string;
  updatedAt: string;
}

const stores: StoreLocation[] = [];
const inventory: InventoryRow[] = [];

const { hydrate: hydrateStores, flush: flushStores } = bindPersistentArray<StoreLocation>(
  "vendor-store-locations",
  stores,
  () => seedStores(),
);

const { hydrate: hydrateInv, flush: flushInv } = bindPersistentArray<InventoryRow>(
  "vendor-inventory",
  inventory,
  () => seedInventory(),
);

await hydrateStores();
await hydrateInv();

function nowIso() {
  return new Date().toISOString();
}

function genStoreId() {
  return `st-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}
function genInvId() {
  return `inv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

// ---- seeds ---------------------------------------------------------
// Demo data only — dropped in so the pharmacy picker isn't empty on a
// fresh install. Centered around Bangalore (vendor owner based there).
function seedStores(): StoreLocation[] {
  const n = nowIso();
  return [
    {
      id: "st-demo-indiranagar",
      vendorId: "v-demo",
      name: "Demo Pharmacy — Indiranagar",
      addressLine: "100 Feet Road, Indiranagar",
      city: "Bangalore",
      pincode: "560038",
      lat: 12.9719,
      lng: 77.6412,
      pickup: true,
      delivery: true,
      deliveryRadiusKm: 8,
      phone: "+91 98450 00001",
      hours: "9:00 AM – 10:30 PM",
      active: true,
      createdAt: n,
      updatedAt: n,
    },
    {
      id: "st-demo-koramangala",
      vendorId: "v-demo",
      name: "Demo Pharmacy — Koramangala",
      addressLine: "80 Feet Road, 4th Block",
      city: "Bangalore",
      pincode: "560034",
      lat: 12.9352,
      lng: 77.6245,
      pickup: true,
      delivery: true,
      deliveryRadiusKm: 6,
      phone: "+91 98450 00002",
      hours: "8:00 AM – 11:00 PM",
      active: true,
      createdAt: n,
      updatedAt: n,
    },
    {
      id: "st-house-online",
      vendorId: "v-house",
      name: "OduDoc Pharmacy — Online",
      addressLine: "Nationwide delivery",
      city: "Online",
      pincode: "000000",
      lat: 0,
      lng: 0,
      pickup: false,
      delivery: true,
      phone: "+1-800-ODUDOC",
      hours: "24x7",
      active: true,
      createdAt: n,
      updatedAt: n,
    },
  ];
}

function seedInventory(): InventoryRow[] {
  const n = nowIso();
  // Helper: make stock & price deterministic across stores so the UI
  // has something to compare.
  const row = (
    storeId: string,
    medicineId: string,
    priceInr: number,
    unit: string,
    stock: number,
    brandLabel?: string,
    strength?: string,
  ): InventoryRow => ({
    id: `inv-seed-${storeId}-${medicineId}-${strength || "std"}`,
    storeId,
    medicineId,
    brandLabel,
    strength,
    priceInr,
    unit,
    stock,
    createdAt: n,
    updatedAt: n,
  });

  const combos: InventoryRow[] = [];
  const shops = ["st-demo-indiranagar", "st-demo-koramangala", "st-house-online"];
  const items: Array<[string, number, string, string | undefined, string | undefined]> = [
    ["paracetamol", 28, "per strip of 10", "Dolo", "650mg"],
    ["ibuprofen", 34, "per strip of 10", "Brufen", "400mg"],
    ["amoxicillin", 72, "per strip of 10", "Mox", "500mg"],
    ["amoxiclav", 180, "per strip of 10", "Augmentin", "625mg"],
    ["azithromycin", 95, "per strip of 3", "Azithral", "500mg"],
    ["pantoprazole", 48, "per strip of 10", "Pan", "40mg"],
    ["omeprazole", 42, "per strip of 10", "Omez", "20mg"],
    ["cetirizine", 22, "per strip of 10", "Cetzine", "10mg"],
    ["levocetirizine", 35, "per strip of 10", "Xyzal", "5mg"],
    ["ondansetron", 55, "per strip of 10", "Emeset", "4mg"],
    ["ors", 20, "per sachet", "Electral", undefined],
    ["metformin", 18, "per strip of 10", "Glycomet", "500mg"],
    ["amlodipine", 26, "per strip of 10", "Amlokind", "5mg"],
    ["telmisartan", 48, "per strip of 10", "Telma", "40mg"],
    ["atorvastatin", 82, "per strip of 10", "Atorva", "20mg"],
    ["vitamin-d3", 120, "per sachet", "Uprise D3", "60000 IU"],
    ["thyroxine", 115, "per strip of 10", "Thyronorm", "50mcg"],
    ["clotrimazole", 95, "per 20g tube", "Candid", "1% cream"],
  ];
  for (const s of shops) {
    for (const [med, price, unit, brand, strength] of items) {
      // Slight per-store jitter so the UI has something to compare.
      const jitter = s === "st-demo-koramangala" ? 0.92 : s === "st-house-online" ? 1.08 : 1;
      combos.push(row(s, med, Math.round(price * jitter), unit, 200, brand, strength));
    }
  }
  return combos;
}

// Top-up on already-hydrated DBs: add seed rows whose id isn't present.
// This is how we keep the demo data in sync after edits without wiping
// any real rows a vendor has added.
(function ensureSeedStores() {
  let added = 0;
  for (const s of seedStores()) {
    if (!stores.some((x) => x.id === s.id)) {
      stores.push(s);
      added++;
    }
  }
  if (added > 0) flushStores();
})();

(function ensureSeedInventory() {
  let added = 0;
  for (const r of seedInventory()) {
    if (!inventory.some((x) => x.id === r.id)) {
      inventory.push(r);
      added++;
    }
  }
  if (added > 0) flushInv();
})();

// ---- store locations ----------------------------------------------

export function listStoreLocations(opts: { vendorId?: string; active?: boolean } = {}): StoreLocation[] {
  let list = stores.slice();
  if (opts.vendorId) list = list.filter((s) => s.vendorId === opts.vendorId);
  if (opts.active !== undefined) list = list.filter((s) => s.active === opts.active);
  return list;
}

export function getStoreLocation(id: string): StoreLocation | null {
  return stores.find((s) => s.id === id) || null;
}

export interface CreateStoreInput {
  vendorId: string;
  name: string;
  addressLine: string;
  city: string;
  pincode: string;
  lat: number;
  lng: number;
  pickup?: boolean;
  delivery?: boolean;
  deliveryRadiusKm?: number;
  phone?: string;
  hours?: string;
}

export function createStoreLocation(input: CreateStoreInput): StoreLocation {
  const n = nowIso();
  const s: StoreLocation = {
    id: genStoreId(),
    vendorId: input.vendorId,
    name: input.name.trim(),
    addressLine: input.addressLine.trim(),
    city: input.city.trim(),
    pincode: input.pincode.trim(),
    lat: input.lat,
    lng: input.lng,
    pickup: input.pickup ?? true,
    delivery: input.delivery ?? false,
    deliveryRadiusKm: input.deliveryRadiusKm,
    phone: input.phone?.trim(),
    hours: input.hours?.trim(),
    active: true,
    createdAt: n,
    updatedAt: n,
  };
  stores.push(s);
  flushStores();
  return s;
}

export function updateStoreLocation(id: string, patch: Partial<StoreLocation>): StoreLocation | null {
  const s = stores.find((x) => x.id === id);
  if (!s) return null;
  const updatable: (keyof StoreLocation)[] = [
    "name", "addressLine", "city", "pincode", "lat", "lng",
    "pickup", "delivery", "deliveryRadiusKm", "phone", "hours", "active",
  ];
  for (const k of updatable) {
    if (patch[k] !== undefined) (s as unknown as Record<string, unknown>)[k] = patch[k];
  }
  s.updatedAt = nowIso();
  flushStores();
  return s;
}

export function deleteStoreLocation(id: string): boolean {
  const i = stores.findIndex((s) => s.id === id);
  if (i < 0) return false;
  stores.splice(i, 1);
  flushStores();
  // Also clear inventory tied to the store so we don't strand rows.
  let removed = 0;
  for (let j = inventory.length - 1; j >= 0; j--) {
    if (inventory[j].storeId === id) {
      inventory.splice(j, 1);
      removed++;
    }
  }
  if (removed > 0) flushInv();
  return true;
}

// ---- inventory ----------------------------------------------------

export function listInventoryByStore(storeId: string): InventoryRow[] {
  return inventory.filter((r) => r.storeId === storeId);
}

export function listInventoryByVendor(vendorId: string): InventoryRow[] {
  const ids = new Set(stores.filter((s) => s.vendorId === vendorId).map((s) => s.id));
  return inventory.filter((r) => ids.has(r.storeId));
}

export function listInventoryByMedicine(medicineId: string): InventoryRow[] {
  return inventory.filter((r) => r.medicineId === medicineId);
}

export interface UpsertInventoryInput {
  id?: string;
  storeId: string;
  medicineId: string;
  brandLabel?: string;
  strength?: string;
  priceInr: number;
  unit: string;
  stock: number;
  expiresAt?: string;
}

export function upsertInventory(input: UpsertInventoryInput): InventoryRow {
  const n = nowIso();
  let row = input.id ? inventory.find((r) => r.id === input.id) : null;
  if (!row) {
    row = {
      id: genInvId(),
      storeId: input.storeId,
      medicineId: input.medicineId,
      brandLabel: input.brandLabel,
      strength: input.strength,
      priceInr: input.priceInr,
      unit: input.unit,
      stock: input.stock,
      expiresAt: input.expiresAt,
      createdAt: n,
      updatedAt: n,
    };
    inventory.push(row);
  } else {
    row.storeId = input.storeId;
    row.medicineId = input.medicineId;
    row.brandLabel = input.brandLabel;
    row.strength = input.strength;
    row.priceInr = input.priceInr;
    row.unit = input.unit;
    row.stock = input.stock;
    row.expiresAt = input.expiresAt;
    row.updatedAt = n;
  }
  flushInv();
  return row;
}

export function deleteInventoryRow(id: string): boolean {
  const i = inventory.findIndex((r) => r.id === id);
  if (i < 0) return false;
  inventory.splice(i, 1);
  flushInv();
  return true;
}

// ---- search helpers -----------------------------------------------

// Pick the cheapest in-stock inventory row for a given medicine at a
// given store. Used by the pharmacy-match API when it's building the
// "what's in my basket at each store" list.
export function pickInventoryFor(storeId: string, medicineId: string): InventoryRow | null {
  const rows = inventory.filter(
    (r) => r.storeId === storeId && r.medicineId === medicineId && r.stock > 0,
  );
  if (rows.length === 0) return null;
  rows.sort((a, b) => a.priceInr - b.priceInr);
  return rows[0];
}

// Returns stores whose location is within `radiusKm` of `origin`. Also
// filters out inactive stores and stores whose delivery radius is
// tighter than the requested distance when `requireDelivery` is true.
export function findStoresNear(
  origin: LatLng,
  radiusKm: number,
  opts: { requireDelivery?: boolean } = {},
): Array<StoreLocation & { distanceKm: number }> {
  const out: Array<StoreLocation & { distanceKm: number }> = [];
  for (const s of stores) {
    if (!s.active) continue;
    // "Online" stores (lat=0,lng=0) always match — they deliver anywhere.
    const online = s.lat === 0 && s.lng === 0;
    if (online) {
      if (opts.requireDelivery && !s.delivery) continue;
      out.push({ ...s, distanceKm: 0 });
      continue;
    }
    const distanceKm = haversine(origin, { lat: s.lat, lng: s.lng });
    if (distanceKm > radiusKm) continue;
    if (opts.requireDelivery) {
      if (!s.delivery) continue;
      if (s.deliveryRadiusKm !== undefined && distanceKm > s.deliveryRadiusKm) continue;
    }
    out.push({ ...s, distanceKm });
  }
  out.sort((a, b) => a.distanceKm - b.distanceKm);
  return out;
}

// Re-exported from geo.ts but inlined here to avoid circular imports.
function haversine(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
