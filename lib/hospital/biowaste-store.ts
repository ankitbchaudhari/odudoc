// Biomedical Waste Management. Tenant-scoped.
//
// India BMW Rules 2016 — color-coded segregation at source, quantified
// by weight (kg) and bag count per category, and handed over to an
// authorized CBWTF (Common BioMedical Waste Treatment Facility) with a
// manifest/challan number and driver/collector signature.
//
// Two entities:
//   WasteVendor  — authorized CBWTF operator (catalog)
//   WasteRecord  — per-day per-category entry with optional handover
//
// Status: collected → handed_over (→ disposed once vendor confirms, or
// rejected if vendor rejects on arrival).

import { bindPersistentArray } from "../persistent-array";

export type WasteColor = "yellow" | "red" | "white" | "blue" | "black"; // black = general/non-bmw
export type WasteStatus = "collected" | "handed_over" | "disposed" | "rejected";

export type WasteCategory =
  | "pathological" // yellow
  | "contaminated" // yellow — soiled dressings, linen
  | "expired_meds" // yellow
  | "microbiology" // yellow — cultures, stocks
  | "chemical_liquid" // yellow
  | "infected_plastic" // red — catheters, IV sets, tubing
  | "sharps" // white — needles, blades
  | "glass_metal" // blue — glass vials, ampules
  | "general"; // black — non-hazardous

export interface WasteVendor {
  id: string;
  organizationId: string;
  vendorCode: string; // VEN-{suffix}-{seq}
  name: string;
  authorizationNumber?: string; // CBWTF authorization from SPCB
  authorizationExpiresAt?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WasteRecord {
  id: string;
  organizationId: string;
  recordNumber: string; // BMW-{suffix}-{seq}
  collectionDate: string; // YYYY-MM-DD
  category: WasteCategory;
  color: WasteColor;
  source: string; // "OT-1", "Ward 3B", "Lab"
  weightKg: number;
  bagCount: number;
  collectedBy: string;

  // Handover
  vendorId?: string;
  manifestNumber?: string;
  handedOverAt?: string;
  handedOverBy?: string;
  driverName?: string;
  vehicleNumber?: string;

  status: WasteStatus;
  disposedAt?: string;
  rejectedReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const vendors: WasteVendor[] = [];
const records: WasteRecord[] = [];

const { hydrate: hydrateV, flush: flushV } = bindPersistentArray<WasteVendor>(
  "hospital-biowaste-vendors",
  vendors,
  () => []
);
const { hydrate: hydrateR, flush: flushR } = bindPersistentArray<WasteRecord>(
  "hospital-biowaste-records",
  records,
  () => []
);
await hydrateV();
await hydrateR();

function orgSuffix(orgId: string): string {
  return orgId.replace(/^org-/, "").slice(0, 4).toUpperCase();
}
function nextVendorCode(orgId: string): string {
  const n = vendors.filter((v) => v.organizationId === orgId).length + 1;
  return `VEN-${orgSuffix(orgId)}-${String(n).padStart(4, "0")}`;
}
function nextRecordNumber(orgId: string): string {
  const n = records.filter((r) => r.organizationId === orgId).length + 1;
  return `BMW-${orgSuffix(orgId)}-${String(n).padStart(6, "0")}`;
}

export const CATEGORY_LABEL: Record<WasteCategory, string> = {
  pathological: "Pathological (body parts, tissues)",
  contaminated: "Contaminated (dressings, linen)",
  expired_meds: "Expired / Discarded Medicines",
  microbiology: "Microbiology / Biotech",
  chemical_liquid: "Chemical & Liquid",
  infected_plastic: "Infected Plastic (catheters, tubing)",
  sharps: "Sharps (needles, blades)",
  glass_metal: "Glass / Metallic Implants",
  general: "General (non-BMW)",
};

export const DEFAULT_COLOR_FOR_CATEGORY: Record<WasteCategory, WasteColor> = {
  pathological: "yellow",
  contaminated: "yellow",
  expired_meds: "yellow",
  microbiology: "yellow",
  chemical_liquid: "yellow",
  infected_plastic: "red",
  sharps: "white",
  glass_metal: "blue",
  general: "black",
};

// Vendors ------------------------------------------------------------

export function listVendors(organizationId: string): WasteVendor[] {
  return vendors
    .filter((v) => v.organizationId === organizationId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export interface VendorInput {
  name: string;
  authorizationNumber?: string;
  authorizationExpiresAt?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  active?: boolean;
}

export function createVendor(organizationId: string, input: VendorInput): WasteVendor {
  const now = new Date().toISOString();
  const v: WasteVendor = {
    id: `wv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    vendorCode: nextVendorCode(organizationId),
    name: input.name.trim(),
    authorizationNumber: input.authorizationNumber?.trim() || undefined,
    authorizationExpiresAt: input.authorizationExpiresAt || undefined,
    contactName: input.contactName?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    email: input.email?.trim() || undefined,
    address: input.address?.trim() || undefined,
    active: input.active ?? true,
    createdAt: now,
    updatedAt: now,
  };
  vendors.unshift(v);
  flushV();
  return v;
}

export function updateVendor(
  id: string,
  organizationId: string,
  patch: Partial<VendorInput>
): WasteVendor | null {
  const v = vendors.find((x) => x.id === id && x.organizationId === organizationId);
  if (!v) return null;
  if (patch.name !== undefined) v.name = patch.name.trim();
  if (patch.authorizationNumber !== undefined)
    v.authorizationNumber = patch.authorizationNumber?.trim() || undefined;
  if (patch.authorizationExpiresAt !== undefined)
    v.authorizationExpiresAt = patch.authorizationExpiresAt || undefined;
  if (patch.contactName !== undefined)
    v.contactName = patch.contactName?.trim() || undefined;
  if (patch.phone !== undefined) v.phone = patch.phone?.trim() || undefined;
  if (patch.email !== undefined) v.email = patch.email?.trim() || undefined;
  if (patch.address !== undefined) v.address = patch.address?.trim() || undefined;
  if (patch.active !== undefined) v.active = patch.active;
  v.updatedAt = new Date().toISOString();
  flushV();
  return v;
}

export function deleteVendor(id: string, organizationId: string): boolean {
  const idx = vendors.findIndex((x) => x.id === id && x.organizationId === organizationId);
  if (idx < 0) return false;
  // Detach vendor from any records (vendor may delete but records keep manifest numbers).
  for (const r of records) {
    if (r.vendorId === id && r.organizationId === organizationId) {
      r.vendorId = undefined;
    }
  }
  vendors.splice(idx, 1);
  flushV();
  flushR();
  return true;
}

// Records ------------------------------------------------------------

export function listRecords(opts: {
  organizationId: string;
  status?: WasteStatus;
  category?: WasteCategory;
  color?: WasteColor;
  vendorId?: string;
  from?: string;
  to?: string;
}): WasteRecord[] {
  let list = records.filter((r) => r.organizationId === opts.organizationId);
  if (opts.status) list = list.filter((r) => r.status === opts.status);
  if (opts.category) list = list.filter((r) => r.category === opts.category);
  if (opts.color) list = list.filter((r) => r.color === opts.color);
  if (opts.vendorId) list = list.filter((r) => r.vendorId === opts.vendorId);
  if (opts.from) list = list.filter((r) => r.collectionDate >= opts.from!);
  if (opts.to) list = list.filter((r) => r.collectionDate <= opts.to!);
  return list.sort((a, b) => b.collectionDate.localeCompare(a.collectionDate));
}

export interface RecordInput {
  collectionDate?: string;
  category?: WasteCategory;
  color?: WasteColor;
  source?: string;
  weightKg?: number;
  bagCount?: number;
  collectedBy?: string;
  vendorId?: string;
  manifestNumber?: string;
  handedOverAt?: string;
  handedOverBy?: string;
  driverName?: string;
  vehicleNumber?: string;
  status?: WasteStatus;
  rejectedReason?: string;
  disposedAt?: string;
  notes?: string;
}

export function createRecord(
  organizationId: string,
  input: RecordInput
): WasteRecord {
  const now = new Date().toISOString();
  const category = input.category || "contaminated";
  const color = input.color || DEFAULT_COLOR_FOR_CATEGORY[category];
  const r: WasteRecord = {
    id: `bmw-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    recordNumber: nextRecordNumber(organizationId),
    collectionDate: input.collectionDate || now.slice(0, 10),
    category,
    color,
    source: input.source?.trim() || "",
    weightKg: Math.max(0, Number(input.weightKg ?? 0)),
    bagCount: Math.max(0, Math.round(input.bagCount ?? 0)),
    collectedBy: input.collectedBy?.trim() || "",
    vendorId: input.vendorId || undefined,
    manifestNumber: input.manifestNumber?.trim() || undefined,
    handedOverAt: input.handedOverAt || undefined,
    handedOverBy: input.handedOverBy?.trim() || undefined,
    driverName: input.driverName?.trim() || undefined,
    vehicleNumber: input.vehicleNumber?.trim() || undefined,
    status: input.status || "collected",
    disposedAt: input.disposedAt || undefined,
    rejectedReason: input.rejectedReason?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  records.unshift(r);
  flushR();
  return r;
}

export function updateRecord(
  id: string,
  organizationId: string,
  patch: Partial<RecordInput>
): WasteRecord | null {
  const r = records.find((x) => x.id === id && x.organizationId === organizationId);
  if (!r) return null;
  const now = new Date().toISOString();

  if (patch.collectionDate !== undefined) r.collectionDate = patch.collectionDate || r.collectionDate;
  if (patch.category !== undefined) {
    r.category = patch.category;
    // If color wasn't also patched, let it default to the category's standard.
    if (patch.color === undefined) r.color = DEFAULT_COLOR_FOR_CATEGORY[patch.category];
  }
  if (patch.color !== undefined) r.color = patch.color;
  if (patch.source !== undefined) r.source = patch.source.trim();
  if (patch.weightKg !== undefined) r.weightKg = Math.max(0, Number(patch.weightKg));
  if (patch.bagCount !== undefined) r.bagCount = Math.max(0, Math.round(patch.bagCount));
  if (patch.collectedBy !== undefined) r.collectedBy = patch.collectedBy.trim();
  if (patch.vendorId !== undefined) r.vendorId = patch.vendorId || undefined;
  if (patch.manifestNumber !== undefined)
    r.manifestNumber = patch.manifestNumber?.trim() || undefined;
  if (patch.handedOverAt !== undefined) r.handedOverAt = patch.handedOverAt || undefined;
  if (patch.handedOverBy !== undefined)
    r.handedOverBy = patch.handedOverBy?.trim() || undefined;
  if (patch.driverName !== undefined) r.driverName = patch.driverName?.trim() || undefined;
  if (patch.vehicleNumber !== undefined)
    r.vehicleNumber = patch.vehicleNumber?.trim() || undefined;
  if (patch.rejectedReason !== undefined)
    r.rejectedReason = patch.rejectedReason?.trim() || undefined;
  if (patch.disposedAt !== undefined) r.disposedAt = patch.disposedAt || undefined;
  if (patch.notes !== undefined) r.notes = patch.notes?.trim() || undefined;

  if (patch.status !== undefined && patch.status !== r.status) {
    r.status = patch.status;
    if (patch.status === "handed_over" && !r.handedOverAt) {
      r.handedOverAt = now;
    }
    if (patch.status === "disposed" && !r.disposedAt) {
      r.disposedAt = now;
    }
  }

  r.updatedAt = now;
  flushR();
  return r;
}

export function deleteRecord(id: string, organizationId: string): boolean {
  const idx = records.findIndex((x) => x.id === id && x.organizationId === organizationId);
  if (idx < 0) return false;
  records.splice(idx, 1);
  flushR();
  return true;
}
