// Pharmacy-company staff directory.
//
// Phase F adds multi-user access for a single Vendor (pharmacy
// company). Up to now, `vendors.ownerEmail` was the sole identity
// authorized to manage the company. That's fine for a single-owner
// shop but breaks as soon as a real pharmacy has a pharmacist + two
// cashiers behind the counter.
//
// Model:
//   - Each VendorStaff row = one person (by email) granted access to
//     one Vendor at a specific role and (optionally) scoped to a
//     subset of stores.
//   - The Vendor's ownerEmail is implicitly the top-level owner and
//     never needs a staff row.
//   - Invitations start in `invited` status; when the invitee signs
//     in and hits /api/vendor-staff/accept, status flips to `active`.
//
// Role capabilities (enforced by lib/vendor-permissions.ts):
//
//   owner        : everything (implicit via vendors.ownerEmail — no staff row)
//   manager      : invite staff · manage stores · manage inventory · process orders
//   pharmacist   : manage inventory · process orders
//   cashier      : process orders only
//
// We deliberately keep this orthogonal to the NextAuth top-level role.
// A user whose primary account role is "patient" can still hold a
// pharmacy staff seat — their patient experience is unaffected and
// the staff-scoped endpoints work purely off the staff table.

import { bindPersistentArray } from "./persistent-array";

export type VendorStaffRole = "manager" | "pharmacist" | "cashier";
export type VendorStaffStatus = "invited" | "active" | "revoked";

export interface VendorStaff {
  id: string;
  vendorId: string;
  email: string;
  displayName?: string;
  role: VendorStaffRole;
  // null / empty = access to every store on the vendor. Non-empty =
  // restricted to these storeIds (cashier assigned to a single counter,
  // pharmacist covering two branches, etc.).
  storeIds: string[];
  status: VendorStaffStatus;
  invitedAt: string;
  invitedByEmail: string;
  acceptedAt?: string;
  revokedAt?: string;
  revokedByEmail?: string;
  updatedAt: string;
}

const staff: VendorStaff[] = [];
const { hydrate, flush } = bindPersistentArray<VendorStaff>(
  "vendor-staff",
  staff,
  () => [],
);
await hydrate();

const nowIso = () => new Date().toISOString();
const genId = () =>
  `vs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;

function norm(email: string): string {
  return email.trim().toLowerCase();
}

// ---- lookups ------------------------------------------------------

export function listStaffByVendor(vendorId: string): VendorStaff[] {
  return staff.filter((s) => s.vendorId === vendorId);
}

// All active or invited memberships for a given user, across vendors.
// Most users have 0 or 1 rows; pharmacists working at multiple chains
// is the reason we return a list instead of a single entry.
export function listStaffByEmail(email: string): VendorStaff[] {
  const e = norm(email);
  return staff.filter((s) => s.email === e);
}

export function getStaff(id: string): VendorStaff | null {
  return staff.find((s) => s.id === id) || null;
}

export function findStaffMembership(
  email: string,
  vendorId: string,
): VendorStaff | null {
  const e = norm(email);
  return staff.find((s) => s.email === e && s.vendorId === vendorId) || null;
}

// ---- mutations ----------------------------------------------------

export interface InviteStaffInput {
  vendorId: string;
  email: string;
  displayName?: string;
  role: VendorStaffRole;
  storeIds?: string[];
  invitedByEmail: string;
}

export function inviteStaff(input: InviteStaffInput): VendorStaff {
  const e = norm(input.email);
  // Re-invite re-uses the existing row so we don't fan out duplicates.
  let row = staff.find((s) => s.vendorId === input.vendorId && s.email === e);
  const n = nowIso();
  if (row) {
    row.role = input.role;
    row.storeIds = input.storeIds || [];
    row.displayName = input.displayName?.trim() || row.displayName;
    if (row.status === "revoked") row.status = "invited";
    row.invitedByEmail = norm(input.invitedByEmail);
    row.updatedAt = n;
  } else {
    row = {
      id: genId(),
      vendorId: input.vendorId,
      email: e,
      displayName: input.displayName?.trim(),
      role: input.role,
      storeIds: input.storeIds || [],
      status: "invited",
      invitedAt: n,
      invitedByEmail: norm(input.invitedByEmail),
      updatedAt: n,
    };
    staff.push(row);
  }
  flush();
  return row;
}

export function updateStaff(
  id: string,
  patch: Partial<Pick<VendorStaff, "role" | "storeIds" | "displayName">>,
): VendorStaff | null {
  const row = staff.find((s) => s.id === id);
  if (!row) return null;
  if (patch.role) row.role = patch.role;
  if (patch.storeIds) row.storeIds = patch.storeIds;
  if (patch.displayName !== undefined) row.displayName = patch.displayName;
  row.updatedAt = nowIso();
  flush();
  return row;
}

export function acceptStaffInvite(email: string): VendorStaff[] {
  const e = norm(email);
  const accepted: VendorStaff[] = [];
  const n = nowIso();
  for (const row of staff) {
    if (row.email === e && row.status === "invited") {
      row.status = "active";
      row.acceptedAt = n;
      row.updatedAt = n;
      accepted.push(row);
    }
  }
  if (accepted.length > 0) flush();
  return accepted;
}

export function revokeStaff(id: string, revokedByEmail: string): VendorStaff | null {
  const row = staff.find((s) => s.id === id);
  if (!row) return null;
  row.status = "revoked";
  row.revokedAt = nowIso();
  row.revokedByEmail = norm(revokedByEmail);
  row.updatedAt = row.revokedAt;
  flush();
  return row;
}
