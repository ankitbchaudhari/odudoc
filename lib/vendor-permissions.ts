// Centralized permission resolver for pharmacy-company routes.
//
// Every vendor-scoped API used to boil down to `getVendorByEmail(email)`
// and "is it approved?". With staff (Phase F) that's not enough — a
// cashier's email isn't on the vendor record, and a manager at chain A
// might also be a pharmacist at chain B.
//
// resolveVendorAccess() returns a single object the route can ask
// fine-grained questions of:
//
//   access.vendor            — the Vendor the caller is acting on
//   access.role              — "owner" | "manager" | "pharmacist" | "cashier"
//   access.storeIds          — null = unrestricted, array = scoped
//   access.canManageStaff    — bool
//   access.canManageStores   — bool
//   access.canManageInventory(storeId?) — bool (checks store scope)
//   access.canProcessOrders(storeId?)   — bool (checks store scope)
//
// For single-vendor requests we pick the first matching active
// membership; for cross-vendor endpoints callers pass an explicit
// vendorId and we only match that row.

import { getVendorByEmail, getVendorById, type Vendor } from "./vendors-store";
import {
  acceptStaffInvite,
  findStaffMembership,
  listStaffByEmail,
  type VendorStaffRole,
} from "./vendor-staff-store";

export type VendorActorRole = "owner" | VendorStaffRole;

export interface VendorAccess {
  vendor: Vendor;
  email: string;
  role: VendorActorRole;
  storeIds: string[] | null; // null = unrestricted
  canManageStaff: boolean;
  canManageStores: boolean;
  canManageInventory: (storeId?: string) => boolean;
  canProcessOrders: (storeId?: string) => boolean;
}

function buildAccess(
  vendor: Vendor,
  email: string,
  role: VendorActorRole,
  storeIds: string[] | null,
): VendorAccess {
  const hasScope = (storeId?: string) => {
    if (!storeId) return true;
    if (storeIds === null || storeIds.length === 0) return true;
    return storeIds.includes(storeId);
  };
  const canManageStaff = role === "owner" || role === "manager";
  const canManageStores = role === "owner" || role === "manager";
  const canManageInventory = (storeId?: string) => {
    if (role === "cashier") return false;
    return hasScope(storeId);
  };
  const canProcessOrders = (storeId?: string) => hasScope(storeId);
  return {
    vendor,
    email: email.toLowerCase(),
    role,
    storeIds,
    canManageStaff,
    canManageStores,
    canManageInventory,
    canProcessOrders,
  };
}

// Resolve the signed-in user's access to a specific vendor. If
// `vendorId` is omitted we take whatever the caller is naturally
// associated with (owned or first active staff seat).
export function resolveVendorAccess(
  email: string | null | undefined,
  vendorId?: string,
): VendorAccess | null {
  if (!email) return null;
  const e = email.trim().toLowerCase();
  // First call after an invite: auto-accept so the staff member's
  // very first API hit already carries the correct permissions.
  // No-op if they have no pending invites.
  acceptStaffInvite(e);

  // Explicit vendor target: must match either owner or staff row.
  if (vendorId) {
    const vendor = getVendorById(vendorId);
    if (!vendor || vendor.status !== "approved") return null;
    if (vendor.ownerEmail === e) {
      return buildAccess(vendor, e, "owner", null);
    }
    const staff = findStaffMembership(e, vendorId);
    if (staff && staff.status === "active") {
      return buildAccess(
        vendor,
        e,
        staff.role,
        staff.storeIds.length > 0 ? staff.storeIds : null,
      );
    }
    return null;
  }

  // No explicit vendor: prefer owner row, else first active staff seat.
  const ownedVendor = getVendorByEmail(e);
  if (ownedVendor && ownedVendor.status === "approved") {
    return buildAccess(ownedVendor, e, "owner", null);
  }

  for (const staffRow of listStaffByEmail(e)) {
    if (staffRow.status !== "active") continue;
    const v = getVendorById(staffRow.vendorId);
    if (!v || v.status !== "approved") continue;
    return buildAccess(
      v,
      e,
      staffRow.role,
      staffRow.storeIds.length > 0 ? staffRow.storeIds : null,
    );
  }

  return null;
}
