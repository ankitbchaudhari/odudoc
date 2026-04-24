// Vendor staff directory — list + invite.
//
// Only owners and managers can see or mutate the staff list. A manager
// can invite new staff but can't grant the "manager" role to anyone
// else (that's an owner-only escalation guard).

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveVendorAccess } from "@/lib/vendor-permissions";
import {
  inviteStaff,
  listStaffByVendor,
  type VendorStaffRole,
} from "@/lib/vendor-staff-store";

export const runtime = "nodejs";

const VALID_ROLES: VendorStaffRole[] = ["manager", "pharmacist", "cashier"];

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  const access = resolveVendorAccess(email);
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!access.canManageStaff) {
    return NextResponse.json(
      { error: "Only owners/managers can view the staff list" },
      { status: 403 },
    );
  }
  const rows = listStaffByVendor(access.vendor.id);
  return NextResponse.json({ staff: rows, myRole: access.role });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  const access = resolveVendorAccess(email);
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!access.canManageStaff) {
    return NextResponse.json(
      { error: "Only owners/managers can invite staff" },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const target = String(body.email || "").trim().toLowerCase();
  const role = body.role as VendorStaffRole;
  const displayName = typeof body.displayName === "string" ? body.displayName : undefined;
  const storeIds = Array.isArray(body.storeIds)
    ? (body.storeIds as unknown[]).map(String).filter(Boolean)
    : [];

  if (!target || !/^\S+@\S+\.\S+$/.test(target)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json(
      { error: `Role must be one of: ${VALID_ROLES.join(", ")}` },
      { status: 400 },
    );
  }
  // Escalation guard: only the owner can create manager-level staff.
  if (role === "manager" && access.role !== "owner") {
    return NextResponse.json(
      { error: "Only the pharmacy owner can grant the 'manager' role" },
      { status: 403 },
    );
  }
  // Don't let the owner accidentally staff-invite themselves — they're
  // already implicitly owner via vendors.ownerEmail.
  if (target === access.vendor.ownerEmail.toLowerCase()) {
    return NextResponse.json(
      { error: "The owner already has full access — no staff row needed" },
      { status: 400 },
    );
  }

  const row = inviteStaff({
    vendorId: access.vendor.id,
    email: target,
    displayName,
    role,
    storeIds,
    invitedByEmail: access.email,
  });
  return NextResponse.json({ staff: row }, { status: 201 });
}
