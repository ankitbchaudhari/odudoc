// Update or revoke a single staff seat.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveVendorAccess } from "@/lib/vendor-permissions";
import {
  getStaff,
  revokeStaff,
  updateStaff,
  type VendorStaffRole,
} from "@/lib/vendor-staff-store";

export const runtime = "nodejs";

const VALID_ROLES: VendorStaffRole[] = ["manager", "pharmacist", "cashier"];

async function loadRow(staffId: string) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  const row = getStaff(staffId);
  if (!row) {
    return { error: NextResponse.json({ error: "Staff not found" }, { status: 404 }) };
  }
  const access = resolveVendorAccess(email, row.vendorId);
  if (!access || !access.canManageStaff) {
    return { error: NextResponse.json({ error: "Staff not found" }, { status: 404 }) };
  }
  return { row, access };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { staffId: string } },
) {
  const r = await loadRow(params.staffId);
  if ("error" in r) return r.error;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: { role?: VendorStaffRole; storeIds?: string[]; displayName?: string } = {};
  if (typeof body.role === "string") {
    if (!VALID_ROLES.includes(body.role as VendorStaffRole)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    if (body.role === "manager" && r.access.role !== "owner") {
      return NextResponse.json(
        { error: "Only the owner can grant the 'manager' role" },
        { status: 403 },
      );
    }
    patch.role = body.role as VendorStaffRole;
  }
  if (Array.isArray(body.storeIds)) {
    patch.storeIds = (body.storeIds as unknown[]).map(String).filter(Boolean);
  }
  if (typeof body.displayName === "string") {
    patch.displayName = body.displayName;
  }

  const updated = updateStaff(params.staffId, patch);
  return NextResponse.json({ staff: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { staffId: string } },
) {
  const r = await loadRow(params.staffId);
  if ("error" in r) return r.error;
  // A manager can't revoke the pharmacy owner (who has no staff row
  // anyway) nor other managers — only the owner can.
  if (r.row.role === "manager" && r.access.role !== "owner") {
    return NextResponse.json(
      { error: "Only the owner can revoke another manager" },
      { status: 403 },
    );
  }
  const row = revokeStaff(params.staffId, r.access.email);
  return NextResponse.json({ staff: row });
}
