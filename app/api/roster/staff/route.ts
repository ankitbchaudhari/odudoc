// Roster staff — list / add / update.

import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError } from "@/lib/tenant";
import { listStaff, addStaff, updateStaff, type StaffRole } from "@/lib/roster/store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ROLES: StaffRole[] = [
  "doctor", "nurse", "receptionist", "lab_tech", "pharmacist", "radiology_tech", "ot_tech",
];

export async function GET() {
  try {
    const { orgId } = await requireOrg();
    return NextResponse.json({ staff: listStaff(orgId) });
  } catch (err) {
    if (err instanceof TenantError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireOrg();
    if (!ctx.isSuperAdmin && ctx.membership && !["owner", "admin"].includes(ctx.membership.role)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const body = await req.json();
    if (body.id) {
      const updated = updateStaff(String(body.id), body);
      if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
      try { await awaitAllFlushesStrict(); } catch {
        return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
      }
      return NextResponse.json({ staff: updated });
    }
    const role = body.role as StaffRole;
    if (!ALLOWED_ROLES.includes(role)) return NextResponse.json({ error: "invalid_role" }, { status: 400 });
    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ error: "missing_name" }, { status: 400 });
    const s = addStaff({
      organizationId: orgId,
      name, role,
      specialty: body.specialty,
      email: body.email,
      phone: body.phone,
      maxHoursPerWeek: typeof body.maxHoursPerWeek === "number" ? body.maxHoursPerWeek : undefined,
      preferredShifts: Array.isArray(body.preferredShifts) ? body.preferredShifts : undefined,
      blockedShifts: Array.isArray(body.blockedShifts) ? body.blockedShifts : undefined,
    });
    try { await awaitAllFlushesStrict(); } catch {
      return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
    }
    return NextResponse.json({ staff: s });
  } catch (err) {
    if (err instanceof TenantError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
