// Per-pharmacy stock for Rx fulfillment matching.
//
// Each pharmacy declares which drugs it carries, current stock, MRP
// (max retail price — Indian regulation), and any discount it
// extends. The matcher reads from this store to answer "given this
// Rx, which pharmacies near the patient have all the items in
// stock and what's the total?".
//
// We deliberately do NOT pull stock from the existing vendor /
// product catalog — that's a B2C marketplace SKU registry tuned to
// shopfront search. This is a "drug name + strength + form" rapid-
// lookup table optimised for Rx matching, indexed by normalised
// generic. New pharmacies onboard with a CSV import; the few rows
// of friction here vs reading vendor SKUs is worth it for the
// matching latency and flexibility.

import { bindPersistentArray } from "../persistent-array";

export interface PharmacyStockEntry {
  id: string;
  /** Pharmacy id — references existing vendors-store / a future
   *  pharmacy registry. Free-form so we don't hard-couple. */
  pharmacyId: string;
  pharmacyName: string;
  /** Geography for ranking. We keep a flat city + pincode model;
   *  geo-ranking improves with coordinates but isn't required for
   *  the demo. */
  city?: string;
  pincode?: string;
  lat?: number;
  lng?: number;
  /** Drug identity. We normalise on insert (lowercase, strip
   *  brand suffixes) so the matcher can do a direct equality. */
  genericName: string;
  /** Brand the pharmacy actually stocks (Crocin / Calpol / Dolo
   *  for paracetamol etc.). */
  brand?: string;
  /** Strength + form for the SKU disambiguation. */
  strength?: string;       // "500mg"
  form?: string;           // "tablet" | "syrup" | "injection" | "ointment"
  packSize?: number;       // tablets per strip; ml per bottle
  /** Current units in stock (number of strips / bottles / vials). */
  stockUnits: number;
  /** MRP per pack, INR rupees. */
  mrpRupees: number;
  /** Pharmacy-extended discount %. */
  discountPct: number;
  /** Standard delivery ETA from the pharmacy in hours. 0 = pickup-only. */
  deliveryEtaHours: number;
  /** Whether this pharmacy delivers at all. Some are pickup-only. */
  homeDelivery: boolean;
  /** Schedule-H drugs need a verified Rx; surface that constraint
   *  so the order UI prompts the patient to upload. */
  prescriptionRequired: boolean;
  updatedAt: string;
}

const stock: PharmacyStockEntry[] = [];
const { hydrate, flush, tombstone } = bindPersistentArray<PharmacyStockEntry>(
  "pharmacy_stock",
  stock,
  () => []
);
await hydrate();

/** Normalise a free-text drug name to canonical lowercase generic.
 *  Strips strength suffixes ("Crocin 500mg" → "crocin" → "paracetamol")
 *  and a small trade-name → generic alias table to maximise hit rate.
 *  Reuses the same alias table the drug-safety engine ships. */
import { normaliseDrug } from "../drug-safety/interactions-db";
export { normaliseDrug };

export function listStockForPharmacy(pharmacyId: string): PharmacyStockEntry[] {
  return stock.filter((s) => s.pharmacyId === pharmacyId);
}

export function listAllPharmacies(): Array<{ pharmacyId: string; pharmacyName: string; city?: string; pincode?: string; itemCount: number }> {
  const map = new Map<string, { pharmacyName: string; city?: string; pincode?: string; itemCount: number }>();
  for (const s of stock) {
    const e = map.get(s.pharmacyId);
    if (e) e.itemCount++;
    else map.set(s.pharmacyId, { pharmacyName: s.pharmacyName, city: s.city, pincode: s.pincode, itemCount: 1 });
  }
  return Array.from(map.entries()).map(([pharmacyId, e]) => ({ pharmacyId, ...e }));
}

/** Find every stock entry across all pharmacies that matches the
 *  given normalised generic. The matcher uses this for ranking. */
export function findStockByGeneric(genericName: string): PharmacyStockEntry[] {
  const norm = normaliseDrug(genericName);
  if (!norm) return [];
  return stock.filter((s) => normaliseDrug(s.genericName) === norm);
}

export interface UpsertStockInput {
  pharmacyId: string;
  pharmacyName: string;
  city?: string;
  pincode?: string;
  lat?: number;
  lng?: number;
  genericName: string;
  brand?: string;
  strength?: string;
  form?: string;
  packSize?: number;
  stockUnits: number;
  mrpRupees: number;
  discountPct?: number;
  deliveryEtaHours?: number;
  homeDelivery?: boolean;
  prescriptionRequired?: boolean;
}

export function upsertStock(input: UpsertStockInput): PharmacyStockEntry {
  const norm = normaliseDrug(input.genericName);
  // Match on the (pharmacy, normalised generic, strength, form) tuple
  // so the same pharmacy carrying both 500mg and 250mg paracetamol
  // doesn't collapse to one row.
  const existing = stock.find(
    (s) =>
      s.pharmacyId === input.pharmacyId &&
      normaliseDrug(s.genericName) === norm &&
      (s.strength || "") === (input.strength || "") &&
      (s.form || "") === (input.form || ""),
  );
  const now = new Date().toISOString();
  if (existing) {
    existing.pharmacyName = input.pharmacyName;
    existing.city = input.city;
    existing.pincode = input.pincode;
    existing.lat = input.lat;
    existing.lng = input.lng;
    existing.brand = input.brand?.trim() || existing.brand;
    existing.packSize = input.packSize ?? existing.packSize;
    existing.stockUnits = input.stockUnits;
    existing.mrpRupees = input.mrpRupees;
    existing.discountPct = input.discountPct ?? existing.discountPct;
    existing.deliveryEtaHours = input.deliveryEtaHours ?? existing.deliveryEtaHours;
    existing.homeDelivery = input.homeDelivery ?? existing.homeDelivery;
    existing.prescriptionRequired = input.prescriptionRequired ?? existing.prescriptionRequired;
    existing.updatedAt = now;
    flush();
    return existing;
  }
  const e: PharmacyStockEntry = {
    id: `stk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    pharmacyId: input.pharmacyId,
    pharmacyName: input.pharmacyName,
    city: input.city,
    pincode: input.pincode,
    lat: input.lat,
    lng: input.lng,
    genericName: norm,
    brand: input.brand?.trim() || undefined,
    strength: input.strength?.trim() || undefined,
    form: input.form?.trim() || undefined,
    packSize: input.packSize,
    stockUnits: input.stockUnits,
    mrpRupees: input.mrpRupees,
    discountPct: input.discountPct ?? 0,
    deliveryEtaHours: input.deliveryEtaHours ?? 24,
    homeDelivery: input.homeDelivery ?? true,
    prescriptionRequired: input.prescriptionRequired ?? false,
    updatedAt: now,
  };
  stock.push(e);
  flush();
  return e;
}

export function decrementStock(stockId: string, units: number): PharmacyStockEntry | null {
  const e = stock.find((x) => x.id === stockId);
  if (!e) return null;
  e.stockUnits = Math.max(0, e.stockUnits - units);
  e.updatedAt = new Date().toISOString();
  flush();
  return e;
}

export function deleteStock(stockId: string): boolean {
  const i = stock.findIndex((s) => s.id === stockId);
  if (i < 0) return false;
  tombstone(stock[i].id);
  stock.splice(i, 1);
  flush();
  return true;
}

/** Seed helper — inserts a small demo dataset. Idempotent: skips
 *  pharmacies already in the store. Useful for first-run demos so
 *  the matcher actually returns results. */
export function seedDemoStock(): { inserted: number; pharmacies: string[] } {
  const existing = new Set(stock.map((s) => s.pharmacyId));
  let inserted = 0;
  const pharmacies: string[] = [];
  for (const p of DEMO_PHARMACIES) {
    if (existing.has(p.pharmacyId)) continue;
    pharmacies.push(p.pharmacyName);
    for (const item of p.items) {
      upsertStock({
        pharmacyId: p.pharmacyId,
        pharmacyName: p.pharmacyName,
        city: p.city,
        pincode: p.pincode,
        ...item,
      });
      inserted++;
    }
  }
  return { inserted, pharmacies };
}

const DEMO_PHARMACIES = [
  {
    pharmacyId: "ph-apollo-jubilee",
    pharmacyName: "Apollo Pharmacy — Jubilee Hills",
    city: "Hyderabad",
    pincode: "500033",
    items: [
      { genericName: "paracetamol", brand: "Calpol", strength: "500mg", form: "tablet", packSize: 15, stockUnits: 240, mrpRupees: 28, discountPct: 10, deliveryEtaHours: 2 },
      { genericName: "amoxicillin", brand: "Mox", strength: "500mg", form: "capsule", packSize: 10, stockUnits: 80, mrpRupees: 95, discountPct: 8, deliveryEtaHours: 2, prescriptionRequired: true },
      { genericName: "atorvastatin", brand: "Lipitor", strength: "20mg", form: "tablet", packSize: 10, stockUnits: 60, mrpRupees: 145, discountPct: 12, deliveryEtaHours: 2, prescriptionRequired: true },
      { genericName: "metformin", brand: "Glycomet", strength: "500mg", form: "tablet", packSize: 20, stockUnits: 120, mrpRupees: 42, discountPct: 5, deliveryEtaHours: 2, prescriptionRequired: true },
      { genericName: "pantoprazole", brand: "Pan", strength: "40mg", form: "tablet", packSize: 15, stockUnits: 160, mrpRupees: 110, discountPct: 10, deliveryEtaHours: 2 },
      { genericName: "azithromycin", brand: "Azithral", strength: "500mg", form: "tablet", packSize: 5, stockUnits: 50, mrpRupees: 72, discountPct: 8, deliveryEtaHours: 2, prescriptionRequired: true },
    ],
  },
  {
    pharmacyId: "ph-medplus-banj",
    pharmacyName: "MedPlus — Banjara Hills",
    city: "Hyderabad",
    pincode: "500034",
    items: [
      { genericName: "paracetamol", brand: "Crocin", strength: "500mg", form: "tablet", packSize: 15, stockUnits: 200, mrpRupees: 30, discountPct: 18, deliveryEtaHours: 4 },
      { genericName: "ibuprofen", brand: "Brufen", strength: "400mg", form: "tablet", packSize: 10, stockUnits: 90, mrpRupees: 28, discountPct: 18, deliveryEtaHours: 4 },
      { genericName: "amoxicillin", brand: "Amoxil", strength: "500mg", form: "capsule", packSize: 10, stockUnits: 0, mrpRupees: 95, discountPct: 18, deliveryEtaHours: 4, prescriptionRequired: true },
      { genericName: "metformin", brand: "Glucophage", strength: "500mg", form: "tablet", packSize: 20, stockUnits: 200, mrpRupees: 42, discountPct: 18, deliveryEtaHours: 4, prescriptionRequired: true },
      { genericName: "atorvastatin", brand: "Atorva", strength: "20mg", form: "tablet", packSize: 10, stockUnits: 100, mrpRupees: 145, discountPct: 22, deliveryEtaHours: 4, prescriptionRequired: true },
      { genericName: "pantoprazole", brand: "Pantop", strength: "40mg", form: "tablet", packSize: 15, stockUnits: 80, mrpRupees: 110, discountPct: 18, deliveryEtaHours: 4 },
    ],
  },
  {
    pharmacyId: "ph-netmeds-kondapur",
    pharmacyName: "Netmeds Hub — Kondapur",
    city: "Hyderabad",
    pincode: "500084",
    items: [
      { genericName: "paracetamol", brand: "Dolo", strength: "650mg", form: "tablet", packSize: 15, stockUnits: 180, mrpRupees: 32, discountPct: 25, deliveryEtaHours: 24 },
      { genericName: "azithromycin", brand: "Azee", strength: "500mg", form: "tablet", packSize: 5, stockUnits: 30, mrpRupees: 72, discountPct: 25, deliveryEtaHours: 24, prescriptionRequired: true },
      { genericName: "amlodipine", brand: "Amlong", strength: "5mg", form: "tablet", packSize: 30, stockUnits: 70, mrpRupees: 65, discountPct: 25, deliveryEtaHours: 24, prescriptionRequired: true },
      { genericName: "telmisartan", brand: "Telma", strength: "40mg", form: "tablet", packSize: 30, stockUnits: 50, mrpRupees: 145, discountPct: 25, deliveryEtaHours: 24, prescriptionRequired: true },
      { genericName: "metformin", brand: "Glycomet", strength: "500mg", form: "tablet", packSize: 20, stockUnits: 120, mrpRupees: 42, discountPct: 25, deliveryEtaHours: 24, prescriptionRequired: true },
      { genericName: "atorvastatin", brand: "Rozat", strength: "20mg", form: "tablet", packSize: 10, stockUnits: 0, mrpRupees: 145, discountPct: 25, deliveryEtaHours: 24, prescriptionRequired: true },
    ],
  },
];

export { DEMO_PHARMACIES };
