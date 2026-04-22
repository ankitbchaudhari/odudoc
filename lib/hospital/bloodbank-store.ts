// Blood Bank — donors, blood units, and transfusion requests. Tenant-scoped.
//
// Three entities:
// - Donor: person record with blood group and last-donation date (for eligibility).
// - BloodUnit: one physical bag. One donor → 1..N units (whole blood separates
//   into PRBC + plasma + platelets). Status flows:
//     quarantined → available → reserved → issued → transfused
//     (discarded / expired at any point)
// - TransfusionRequest: patient needs N units of (group, component). FIFO
//   reservation of matching available units, with ABO/Rh compatibility.
//
// Component shelf lives (days, from collection):
//   whole_blood 35, prbc 42, platelets 5, plasma 365 (frozen), cryo 365.

import { bindPersistentArray } from "../persistent-array";

export type BloodGroup =
  | "A+"
  | "A-"
  | "B+"
  | "B-"
  | "AB+"
  | "AB-"
  | "O+"
  | "O-";

export type BloodComponent =
  | "whole_blood"
  | "prbc"
  | "platelets"
  | "plasma"
  | "cryoprecipitate";

export const COMPONENT_SHELF_DAYS: Record<BloodComponent, number> = {
  whole_blood: 35,
  prbc: 42,
  platelets: 5,
  plasma: 365,
  cryoprecipitate: 365,
};

export type UnitStatus =
  | "quarantined"
  | "available"
  | "reserved"
  | "issued"
  | "transfused"
  | "discarded"
  | "expired";

export type DonorEligibility = "eligible" | "deferred" | "permanent_deferral";

export interface Donor {
  id: string;
  organizationId: string;
  donorCode: string; // BD-{suffix}-{seq}
  firstName: string;
  lastName: string;
  bloodGroup: BloodGroup;
  dateOfBirth?: string;
  gender?: "M" | "F" | "O";
  phone?: string;
  email?: string;
  address?: string;
  lastDonationDate?: string;
  totalDonations: number;
  eligibility: DonorEligibility;
  deferralReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BloodUnit {
  id: string;
  organizationId: string;
  unitNumber: string; // BU-{suffix}-{seq}
  donorId?: string; // optional — some units purchased from external bank
  bloodGroup: BloodGroup;
  component: BloodComponent;
  volumeMl: number;
  collectedAt: string;
  expiresAt: string;
  status: UnitStatus;
  reservedForRequestId?: string;
  reservedForPatientId?: string;
  issuedAt?: string;
  transfusedAt?: string;
  discardReason?: string;
  screeningComplete: boolean; // HIV/HCV/HBV/VDRL/malaria
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type RequestStatus =
  | "requested"
  | "crossmatching"
  | "ready"
  | "issued"
  | "transfused"
  | "cancelled";

export type RequestPriority = "routine" | "urgent" | "stat";

export interface TransfusionRequest {
  id: string;
  organizationId: string;
  requestNumber: string; // TR-{suffix}-{seq}
  patientId: string;
  patientBloodGroup: BloodGroup;
  component: BloodComponent;
  unitsRequested: number;
  priority: RequestPriority;
  indication?: string;
  orderedBy?: string;
  orderedAt: string;
  reservedUnitIds: string[];
  issuedUnitIds: string[];
  transfusedUnitIds: string[];
  status: RequestStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const donors: Donor[] = [];
const units: BloodUnit[] = [];
const requests: TransfusionRequest[] = [];

const { hydrate: hd, flush: fd } = bindPersistentArray<Donor>(
  "hospital-blood-donors",
  donors,
  () => []
);
const { hydrate: hu, flush: fu } = bindPersistentArray<BloodUnit>(
  "hospital-blood-units",
  units,
  () => []
);
const { hydrate: hr, flush: fr } = bindPersistentArray<TransfusionRequest>(
  "hospital-blood-requests",
  requests,
  () => []
);
await hd();
await hu();
await hr();

function seqCode(prefix: string, orgId: string, count: number): string {
  const suffix = orgId.replace(/^org-/, "").slice(0, 4).toUpperCase();
  return `${prefix}-${suffix}-${String(count + 1).padStart(5, "0")}`;
}

// --- ABO/Rh compatibility --------------------------------------------------
// Donor group must be compatible with recipient for the given component.
// PRBC / whole blood: recipient antibodies attack donor RBC antigens.
// Plasma / cryo: reversed (recipient antigens attacked by donor antibodies).
// Platelets: ABO-preferred but flexible; we treat as PRBC-style.

const RBC_COMPAT: Record<BloodGroup, BloodGroup[]> = {
  "O-": ["O-"],
  "O+": ["O-", "O+"],
  "A-": ["O-", "A-"],
  "A+": ["O-", "O+", "A-", "A+"],
  "B-": ["O-", "B-"],
  "B+": ["O-", "O+", "B-", "B+"],
  "AB-": ["O-", "A-", "B-", "AB-"],
  "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
};

const PLASMA_COMPAT: Record<BloodGroup, BloodGroup[]> = {
  "AB+": ["AB+", "AB-"],
  "AB-": ["AB+", "AB-"],
  "A+": ["A+", "A-", "AB+", "AB-"],
  "A-": ["A+", "A-", "AB+", "AB-"],
  "B+": ["B+", "B-", "AB+", "AB-"],
  "B-": ["B+", "B-", "AB+", "AB-"],
  "O+": ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"],
  "O-": ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"],
};

export function isCompatible(
  recipient: BloodGroup,
  donor: BloodGroup,
  component: BloodComponent
): boolean {
  if (component === "plasma" || component === "cryoprecipitate") {
    return PLASMA_COMPAT[recipient].includes(donor);
  }
  return RBC_COMPAT[recipient].includes(donor);
}

// --- Donors ----------------------------------------------------------------

export function listDonors(opts: {
  organizationId: string;
  bloodGroup?: BloodGroup;
  eligibility?: DonorEligibility;
  search?: string;
}): Donor[] {
  let list = donors.filter((d) => d.organizationId === opts.organizationId);
  if (opts.bloodGroup)
    list = list.filter((d) => d.bloodGroup === opts.bloodGroup);
  if (opts.eligibility)
    list = list.filter((d) => d.eligibility === opts.eligibility);
  if (opts.search) {
    const q = opts.search.toLowerCase();
    list = list.filter(
      (d) =>
        d.firstName.toLowerCase().includes(q) ||
        d.lastName.toLowerCase().includes(q) ||
        d.donorCode.toLowerCase().includes(q) ||
        (d.phone || "").includes(q)
    );
  }
  return list.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export interface DonorInput {
  firstName: string;
  lastName: string;
  bloodGroup: BloodGroup;
  dateOfBirth?: string;
  gender?: "M" | "F" | "O";
  phone?: string;
  email?: string;
  address?: string;
  lastDonationDate?: string;
  eligibility?: DonorEligibility;
  deferralReason?: string;
  notes?: string;
}

export function createDonor(organizationId: string, input: DonorInput): Donor {
  const now = new Date().toISOString();
  const count = donors.filter((d) => d.organizationId === organizationId).length;
  const d: Donor = {
    id: `don-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    donorCode: seqCode("BD", organizationId, count),
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    bloodGroup: input.bloodGroup,
    dateOfBirth: input.dateOfBirth,
    gender: input.gender,
    phone: input.phone?.trim() || undefined,
    email: input.email?.trim() || undefined,
    address: input.address?.trim() || undefined,
    lastDonationDate: input.lastDonationDate,
    totalDonations: 0,
    eligibility: input.eligibility || "eligible",
    deferralReason: input.deferralReason?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  donors.unshift(d);
  fd();
  return d;
}

export function updateDonor(
  id: string,
  organizationId: string,
  patch: Partial<DonorInput> & { totalDonations?: number }
): Donor | null {
  const d = donors.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!d) return null;
  if (patch.firstName !== undefined) d.firstName = patch.firstName.trim();
  if (patch.lastName !== undefined) d.lastName = patch.lastName.trim();
  if (patch.bloodGroup !== undefined) d.bloodGroup = patch.bloodGroup;
  if (patch.dateOfBirth !== undefined) d.dateOfBirth = patch.dateOfBirth;
  if (patch.gender !== undefined) d.gender = patch.gender;
  if (patch.phone !== undefined) d.phone = patch.phone?.trim() || undefined;
  if (patch.email !== undefined) d.email = patch.email?.trim() || undefined;
  if (patch.address !== undefined) d.address = patch.address?.trim() || undefined;
  if (patch.lastDonationDate !== undefined)
    d.lastDonationDate = patch.lastDonationDate;
  if (patch.eligibility !== undefined) d.eligibility = patch.eligibility;
  if (patch.deferralReason !== undefined)
    d.deferralReason = patch.deferralReason?.trim() || undefined;
  if (patch.notes !== undefined) d.notes = patch.notes;
  if (patch.totalDonations !== undefined) d.totalDonations = patch.totalDonations;
  d.updatedAt = new Date().toISOString();
  fd();
  return d;
}

export function deleteDonor(id: string, organizationId: string): boolean {
  const i = donors.findIndex(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (i < 0) return false;
  donors.splice(i, 1);
  fd();
  return true;
}

// --- Blood Units -----------------------------------------------------------

function markExpiredIfDue(u: BloodUnit) {
  if (
    (u.status === "available" ||
      u.status === "quarantined" ||
      u.status === "reserved") &&
    new Date(u.expiresAt).getTime() < Date.now()
  ) {
    u.status = "expired";
  }
}

export function listUnits(opts: {
  organizationId: string;
  bloodGroup?: BloodGroup;
  component?: BloodComponent;
  status?: UnitStatus;
  donorId?: string;
}): BloodUnit[] {
  let list = units.filter((u) => u.organizationId === opts.organizationId);
  // Sweep-expire on read
  for (const u of list) markExpiredIfDue(u);
  if (opts.bloodGroup)
    list = list.filter((u) => u.bloodGroup === opts.bloodGroup);
  if (opts.component) list = list.filter((u) => u.component === opts.component);
  if (opts.status) list = list.filter((u) => u.status === opts.status);
  if (opts.donorId) list = list.filter((u) => u.donorId === opts.donorId);
  return list.sort(
    (a, b) =>
      new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()
  );
}

export interface UnitInput {
  donorId?: string;
  bloodGroup: BloodGroup;
  component: BloodComponent;
  volumeMl?: number;
  collectedAt?: string;
  expiresAt?: string;
  screeningComplete?: boolean;
  notes?: string;
}

export function createUnit(
  organizationId: string,
  input: UnitInput
): BloodUnit {
  const now = new Date().toISOString();
  const count = units.filter((u) => u.organizationId === organizationId).length;
  const collectedAt = input.collectedAt || now;
  const expiresAt =
    input.expiresAt ||
    new Date(
      new Date(collectedAt).getTime() +
        COMPONENT_SHELF_DAYS[input.component] * 24 * 3600 * 1000
    ).toISOString();
  const defaultVolume =
    input.component === "platelets" ? 50 : input.component === "cryoprecipitate" ? 20 : 250;
  const u: BloodUnit = {
    id: `bu-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    unitNumber: seqCode("BU", organizationId, count),
    donorId: input.donorId || undefined,
    bloodGroup: input.bloodGroup,
    component: input.component,
    volumeMl: input.volumeMl ?? defaultVolume,
    collectedAt,
    expiresAt,
    status: input.screeningComplete ? "available" : "quarantined",
    screeningComplete: !!input.screeningComplete,
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  units.unshift(u);

  // Bump donor totals + last donation date
  if (u.donorId) {
    const d = donors.find(
      (x) => x.id === u.donorId && x.organizationId === organizationId
    );
    if (d) {
      d.totalDonations += 1;
      d.lastDonationDate = collectedAt.slice(0, 10);
      d.updatedAt = now;
      fd();
    }
  }

  fu();
  return u;
}

export interface UnitPatch {
  bloodGroup?: BloodGroup;
  component?: BloodComponent;
  volumeMl?: number;
  expiresAt?: string;
  screeningComplete?: boolean;
  status?: UnitStatus;
  discardReason?: string;
  notes?: string;
}

export function updateUnit(
  id: string,
  organizationId: string,
  patch: UnitPatch
): BloodUnit | null {
  const u = units.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!u) return null;
  const now = new Date().toISOString();
  if (patch.bloodGroup !== undefined) u.bloodGroup = patch.bloodGroup;
  if (patch.component !== undefined) u.component = patch.component;
  if (patch.volumeMl !== undefined) u.volumeMl = patch.volumeMl;
  if (patch.expiresAt !== undefined) u.expiresAt = patch.expiresAt;
  if (patch.screeningComplete !== undefined) {
    u.screeningComplete = !!patch.screeningComplete;
    if (u.status === "quarantined" && u.screeningComplete)
      u.status = "available";
  }
  if (patch.status !== undefined) {
    u.status = patch.status;
    if (patch.status === "issued" && !u.issuedAt) u.issuedAt = now;
    if (patch.status === "transfused" && !u.transfusedAt) u.transfusedAt = now;
  }
  if (patch.discardReason !== undefined) u.discardReason = patch.discardReason;
  if (patch.notes !== undefined) u.notes = patch.notes;
  u.updatedAt = now;
  fu();
  return u;
}

export function deleteUnit(id: string, organizationId: string): boolean {
  const i = units.findIndex(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (i < 0) return false;
  units.splice(i, 1);
  fu();
  return true;
}

// --- Transfusion Requests --------------------------------------------------

export function listRequests(opts: {
  organizationId: string;
  patientId?: string;
  status?: RequestStatus;
  priority?: RequestPriority;
}): TransfusionRequest[] {
  let list = requests.filter(
    (r) => r.organizationId === opts.organizationId
  );
  if (opts.patientId) list = list.filter((r) => r.patientId === opts.patientId);
  if (opts.status) list = list.filter((r) => r.status === opts.status);
  if (opts.priority) list = list.filter((r) => r.priority === opts.priority);
  return list.sort(
    (a, b) =>
      new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime()
  );
}

export interface RequestInput {
  patientId: string;
  patientBloodGroup: BloodGroup;
  component: BloodComponent;
  unitsRequested: number;
  priority?: RequestPriority;
  indication?: string;
  orderedBy?: string;
  notes?: string;
}

export function createRequest(
  organizationId: string,
  input: RequestInput
): TransfusionRequest {
  const now = new Date().toISOString();
  const count = requests.filter(
    (r) => r.organizationId === organizationId
  ).length;
  const r: TransfusionRequest = {
    id: `tr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    requestNumber: seqCode("TR", organizationId, count),
    patientId: input.patientId,
    patientBloodGroup: input.patientBloodGroup,
    component: input.component,
    unitsRequested: Math.max(1, Math.floor(input.unitsRequested)),
    priority: input.priority || "routine",
    indication: input.indication?.trim() || undefined,
    orderedBy: input.orderedBy?.trim() || undefined,
    orderedAt: now,
    reservedUnitIds: [],
    issuedUnitIds: [],
    transfusedUnitIds: [],
    status: "requested",
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  requests.unshift(r);
  fr();
  return r;
}

// Reserve compatible units (FIFO by expiry) for a request. Returns the
// reserved unit IDs. Does not fail if fewer units available — caller can
// re-run as more units come in.
export type ReserveResult = {
  ok: true;
  request: TransfusionRequest;
  newlyReserved: string[];
};

export function reserveForRequest(
  id: string,
  organizationId: string
): ReserveResult | { ok: false; error: string } {
  const r = requests.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!r) return { ok: false, error: "not_found" };
  if (r.status === "cancelled" || r.status === "transfused")
    return { ok: false, error: "request_closed" };

  const need = r.unitsRequested - r.reservedUnitIds.length;
  if (need <= 0) return { ok: true, request: r, newlyReserved: [] };

  // FIFO by expiresAt, matching component + compatible group + available.
  const candidates = units
    .filter(
      (u) =>
        u.organizationId === organizationId &&
        u.status === "available" &&
        u.component === r.component &&
        isCompatible(r.patientBloodGroup, u.bloodGroup, r.component)
    )
    .sort(
      (a, b) =>
        new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()
    );

  const taken = candidates.slice(0, need);
  const now = new Date().toISOString();
  for (const u of taken) {
    u.status = "reserved";
    u.reservedForRequestId = r.id;
    u.reservedForPatientId = r.patientId;
    u.updatedAt = now;
    r.reservedUnitIds.push(u.id);
  }
  if (r.reservedUnitIds.length >= r.unitsRequested) r.status = "ready";
  else r.status = "crossmatching";
  r.updatedAt = now;
  fu();
  fr();
  return { ok: true, request: r, newlyReserved: taken.map((u) => u.id) };
}

export function issueRequest(
  id: string,
  organizationId: string
): TransfusionRequest | null {
  const r = requests.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!r) return null;
  const now = new Date().toISOString();
  for (const uid of r.reservedUnitIds) {
    const u = units.find((x) => x.id === uid);
    if (u && u.status === "reserved") {
      u.status = "issued";
      u.issuedAt = now;
      u.updatedAt = now;
      if (!r.issuedUnitIds.includes(u.id)) r.issuedUnitIds.push(u.id);
    }
  }
  r.status = "issued";
  r.updatedAt = now;
  fu();
  fr();
  return r;
}

export function transfuseRequest(
  id: string,
  organizationId: string
): TransfusionRequest | null {
  const r = requests.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!r) return null;
  const now = new Date().toISOString();
  for (const uid of r.issuedUnitIds.length ? r.issuedUnitIds : r.reservedUnitIds) {
    const u = units.find((x) => x.id === uid);
    if (u && (u.status === "issued" || u.status === "reserved")) {
      u.status = "transfused";
      u.transfusedAt = now;
      u.updatedAt = now;
      if (!r.transfusedUnitIds.includes(u.id)) r.transfusedUnitIds.push(u.id);
    }
  }
  r.status = "transfused";
  r.updatedAt = now;
  fu();
  fr();
  return r;
}

export function cancelRequest(
  id: string,
  organizationId: string
): TransfusionRequest | null {
  const r = requests.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!r) return null;
  const now = new Date().toISOString();
  // Release any still-reserved units back to available.
  for (const uid of r.reservedUnitIds) {
    const u = units.find((x) => x.id === uid);
    if (u && u.status === "reserved") {
      u.status = "available";
      u.reservedForRequestId = undefined;
      u.reservedForPatientId = undefined;
      u.updatedAt = now;
    }
  }
  r.reservedUnitIds = [];
  r.status = "cancelled";
  r.updatedAt = now;
  fu();
  fr();
  return r;
}

export function deleteRequest(id: string, organizationId: string): boolean {
  const r = requests.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!r) return false;
  // Release any reservations first
  cancelRequest(id, organizationId);
  const i = requests.findIndex((x) => x.id === id);
  if (i >= 0) {
    requests.splice(i, 1);
    fr();
  }
  return true;
}

export function deleteBloodDataForPatient(
  patientId: string,
  organizationId: string
): number {
  let removed = 0;
  // Cancel (releasing reservations) then purge requests for this patient.
  for (let i = requests.length - 1; i >= 0; i--) {
    const r = requests[i];
    if (r.patientId === patientId && r.organizationId === organizationId) {
      cancelRequest(r.id, organizationId);
      requests.splice(i, 1);
      removed++;
    }
  }
  // Clean up any stray unit pointers to this patient.
  for (const u of units) {
    if (
      u.organizationId === organizationId &&
      u.reservedForPatientId === patientId
    ) {
      u.reservedForPatientId = undefined;
      if (u.status === "reserved") u.status = "available";
    }
  }
  if (removed) {
    fr();
    fu();
  }
  return removed;
}

// Inventory summary: counts by (group, component, status).
export function inventorySummary(
  organizationId: string
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const u of units) {
    if (u.organizationId !== organizationId) continue;
    markExpiredIfDue(u);
    const key = `${u.bloodGroup}|${u.component}|${u.status}`;
    out[key] = (out[key] || 0) + 1;
  }
  return out;
}
