// Visitor Management. Tenant-scoped.
//
// Issues visitor passes at reception, tracks who is inside the facility at
// any moment, detects overstays, and maintains a blacklist that blocks
// re-entry (matches on phone OR ID proof number OR normalized name).
//
// Pass lifecycle:
//   checked_in → checked_out
//              ↘ overstay (derived at read time when expectedOutAt passes)
//              ↘ expired (explicit admin action for stale/lost badges)

import { bindPersistentArray } from "../persistent-array";

export type VisitPurpose =
  | "patient_visit"
  | "vendor"
  | "contractor"
  | "interview"
  | "official"
  | "delivery"
  | "other";

export type PassStatus = "checked_in" | "checked_out" | "expired";

export type IdProofType =
  | "aadhaar"
  | "pan"
  | "passport"
  | "driving_license"
  | "voter_id"
  | "employee_id"
  | "other";

export interface VisitorPass {
  id: string;
  organizationId: string;
  passNumber: string; // VIS-{suffix}-{seq}
  badgeNumber: string; // short display code, e.g. B-042

  visitorName: string;
  phone?: string;
  idProofType?: IdProofType;
  idProofNumber?: string;

  purpose: VisitPurpose;

  // Host / destination
  patientId?: string;
  patientName?: string;
  hostName?: string; // staff / doctor / dept head
  department?: string;

  checkInAt: string;
  expectedOutAt?: string;
  checkOutAt?: string;

  status: PassStatus;
  notes?: string;

  createdAt: string;
  updatedAt: string;
}

export interface VisitorBlacklist {
  id: string;
  organizationId: string;
  name: string;
  phone?: string;
  idProofNumber?: string;
  reason: string;
  bannedBy?: string;
  bannedAt: string;
  active: boolean;
}

const passes: VisitorPass[] = [];
const blacklist: VisitorBlacklist[] = [];

const passBinding = bindPersistentArray<VisitorPass>(
  "hospital-visitor-passes",
  passes,
  () => []
);
const blBinding = bindPersistentArray<VisitorBlacklist>(
  "hospital-visitor-blacklist",
  blacklist,
  () => []
);
await passBinding.hydrate();
await blBinding.hydrate();

const flushPasses = passBinding.flush;
const flushBL = blBinding.flush;

function orgSuffix(orgId: string): string {
  return orgId.replace(/^org-/, "").slice(0, 4).toUpperCase();
}
function nextPassNumber(orgId: string): string {
  const n = passes.filter((p) => p.organizationId === orgId).length + 1;
  return `VIS-${orgSuffix(orgId)}-${String(n).padStart(5, "0")}`;
}
function nextBadgeNumber(orgId: string): string {
  // Daily-scoped display badge: B-{nnn} within the current day.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startMs = today.getTime();
  const todayCount = passes.filter(
    (p) =>
      p.organizationId === orgId &&
      new Date(p.checkInAt).getTime() >= startMs
  ).length;
  return `B-${String(todayCount + 1).padStart(3, "0")}`;
}

export const PURPOSE_LABEL: Record<VisitPurpose, string> = {
  patient_visit: "Patient visit",
  vendor: "Vendor",
  contractor: "Contractor",
  interview: "Interview",
  official: "Official",
  delivery: "Delivery",
  other: "Other",
};

export const ID_LABEL: Record<IdProofType, string> = {
  aadhaar: "Aadhaar",
  pan: "PAN",
  passport: "Passport",
  driving_license: "Driving License",
  voter_id: "Voter ID",
  employee_id: "Employee ID",
  other: "Other",
};

function normName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function checkBlacklist(
  organizationId: string,
  input: { name?: string; phone?: string; idProofNumber?: string }
): VisitorBlacklist | null {
  const n = input.name ? normName(input.name) : "";
  const phone = input.phone?.replace(/\D/g, "") || "";
  const idn = input.idProofNumber?.trim().toLowerCase() || "";
  for (const b of blacklist) {
    if (b.organizationId !== organizationId || !b.active) continue;
    if (n && normName(b.name) === n) return b;
    if (phone && b.phone && b.phone.replace(/\D/g, "") === phone) return b;
    if (idn && b.idProofNumber && b.idProofNumber.trim().toLowerCase() === idn)
      return b;
  }
  return null;
}

// ---------- Passes ----------

export function listPasses(opts: {
  organizationId: string;
  status?: PassStatus;
  purpose?: VisitPurpose;
  patientId?: string;
  insideOnly?: boolean;
  overstayOnly?: boolean;
  from?: string;
  to?: string;
}): VisitorPass[] {
  let list = passes.filter((p) => p.organizationId === opts.organizationId);
  if (opts.status) list = list.filter((p) => p.status === opts.status);
  if (opts.purpose) list = list.filter((p) => p.purpose === opts.purpose);
  if (opts.patientId) list = list.filter((p) => p.patientId === opts.patientId);
  if (opts.insideOnly) list = list.filter((p) => p.status === "checked_in");
  if (opts.overstayOnly) {
    const now = Date.now();
    list = list.filter(
      (p) =>
        p.status === "checked_in" &&
        p.expectedOutAt &&
        new Date(p.expectedOutAt).getTime() < now
    );
  }
  if (opts.from) {
    const f = new Date(opts.from).getTime();
    list = list.filter((p) => new Date(p.checkInAt).getTime() >= f);
  }
  if (opts.to) {
    const t = new Date(opts.to).getTime();
    list = list.filter((p) => new Date(p.checkInAt).getTime() <= t);
  }
  const statusOrder: Record<PassStatus, number> = {
    checked_in: 0,
    checked_out: 1,
    expired: 2,
  };
  return list.sort((a, b) => {
    const s = statusOrder[a.status] - statusOrder[b.status];
    if (s !== 0) return s;
    return new Date(b.checkInAt).getTime() - new Date(a.checkInAt).getTime();
  });
}

export interface PassInput {
  visitorName: string;
  phone?: string;
  idProofType?: IdProofType;
  idProofNumber?: string;
  purpose?: VisitPurpose;
  patientId?: string;
  patientName?: string;
  hostName?: string;
  department?: string;
  expectedOutAt?: string;
  notes?: string;
}

export function createPass(
  organizationId: string,
  input: PassInput
):
  | { ok: false; error: string; blacklistReason?: string }
  | { ok: true; pass: VisitorPass } {
  if (!input.visitorName || !input.visitorName.trim()) {
    return { ok: false, error: "missing_name" };
  }
  const hit = checkBlacklist(organizationId, {
    name: input.visitorName,
    phone: input.phone,
    idProofNumber: input.idProofNumber,
  });
  if (hit) {
    return { ok: false, error: "blacklisted", blacklistReason: hit.reason };
  }
  const now = new Date().toISOString();
  const p: VisitorPass = {
    id: `vis-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    passNumber: nextPassNumber(organizationId),
    badgeNumber: nextBadgeNumber(organizationId),
    visitorName: input.visitorName.trim(),
    phone: input.phone?.trim() || undefined,
    idProofType: input.idProofType,
    idProofNumber: input.idProofNumber?.trim() || undefined,
    purpose: input.purpose || "patient_visit",
    patientId: input.patientId || undefined,
    patientName: input.patientName?.trim() || undefined,
    hostName: input.hostName?.trim() || undefined,
    department: input.department?.trim() || undefined,
    checkInAt: now,
    expectedOutAt: input.expectedOutAt || undefined,
    status: "checked_in",
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  passes.unshift(p);
  flushPasses();
  return { ok: true, pass: p };
}

export interface PassUpdate {
  expectedOutAt?: string;
  notes?: string;
  status?: PassStatus;
  hostName?: string;
  department?: string;
}

export function updatePass(
  id: string,
  organizationId: string,
  patch: PassUpdate
): VisitorPass | null {
  const p = passes.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!p) return null;
  const now = new Date().toISOString();

  if (patch.expectedOutAt !== undefined)
    p.expectedOutAt = patch.expectedOutAt || undefined;
  if (patch.notes !== undefined) p.notes = patch.notes?.trim() || undefined;
  if (patch.hostName !== undefined)
    p.hostName = patch.hostName?.trim() || undefined;
  if (patch.department !== undefined)
    p.department = patch.department?.trim() || undefined;

  if (patch.status !== undefined && patch.status !== p.status) {
    const prev = p.status;
    p.status = patch.status;
    if (patch.status === "checked_out" && prev === "checked_in") {
      p.checkOutAt = now;
    }
    if (prev === "checked_out" && patch.status === "checked_in") {
      p.checkOutAt = undefined;
    }
  }

  p.updatedAt = now;
  flushPasses();
  return p;
}

export function checkOutPass(
  id: string,
  organizationId: string
): VisitorPass | null {
  return updatePass(id, organizationId, { status: "checked_out" });
}

export function deletePass(id: string, organizationId: string): boolean {
  const idx = passes.findIndex(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (idx < 0) return false;
  passes.splice(idx, 1);
  flushPasses();
  return true;
}

export function unlinkPassesForPatient(
  patientId: string,
  organizationId: string
): number {
  let n = 0;
  for (const p of passes) {
    if (p.patientId === patientId && p.organizationId === organizationId) {
      p.patientId = undefined;
      n++;
    }
  }
  if (n) flushPasses();
  return n;
  // flush:auto-unlink
  passes.splice(passes.length, 0);
}

// ---------- Blacklist ----------

export function listBlacklist(organizationId: string): VisitorBlacklist[] {
  return blacklist
    .filter((b) => b.organizationId === organizationId)
    .sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return new Date(b.bannedAt).getTime() - new Date(a.bannedAt).getTime();
    });
}

export interface BlacklistInput {
  name: string;
  phone?: string;
  idProofNumber?: string;
  reason: string;
  bannedBy?: string;
}

export function addBlacklist(
  organizationId: string,
  input: BlacklistInput
): VisitorBlacklist {
  const now = new Date().toISOString();
  const b: VisitorBlacklist = {
    id: `bl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    name: input.name.trim(),
    phone: input.phone?.trim() || undefined,
    idProofNumber: input.idProofNumber?.trim() || undefined,
    reason: input.reason.trim(),
    bannedBy: input.bannedBy?.trim() || undefined,
    bannedAt: now,
    active: true,
  };
  blacklist.unshift(b);
  flushBL();
  return b;
}

export function updateBlacklist(
  id: string,
  organizationId: string,
  patch: { active?: boolean; reason?: string }
): VisitorBlacklist | null {
  const b = blacklist.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!b) return null;
  if (patch.active !== undefined) b.active = patch.active;
  if (patch.reason !== undefined) b.reason = patch.reason.trim();
  flushBL();
  return b;
}

export function deleteBlacklist(id: string, organizationId: string): boolean {
  const idx = blacklist.findIndex(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (idx < 0) return false;
  blacklist.splice(idx, 1);
  flushBL();
  return true;
}

// ---------- Analytics ----------

export interface VisitorStats {
  currentlyInside: number;
  todayIn: number;
  todayOut: number;
  overstay: number;
  blacklisted: number;
}

export function computeStats(organizationId: string): VisitorStats {
  const now = Date.now();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const s = startOfDay.getTime();

  const orgPasses = passes.filter((p) => p.organizationId === organizationId);
  const currentlyInside = orgPasses.filter((p) => p.status === "checked_in").length;
  const todayIn = orgPasses.filter(
    (p) => new Date(p.checkInAt).getTime() >= s
  ).length;
  const todayOut = orgPasses.filter(
    (p) =>
      p.status === "checked_out" &&
      p.checkOutAt &&
      new Date(p.checkOutAt).getTime() >= s
  ).length;
  const overstay = orgPasses.filter(
    (p) =>
      p.status === "checked_in" &&
      p.expectedOutAt &&
      new Date(p.expectedOutAt).getTime() < now
  ).length;
  const blacklisted = blacklist.filter(
    (b) => b.organizationId === organizationId && b.active
  ).length;

  return { currentlyInside, todayIn, todayOut, overstay, blacklisted };
}
