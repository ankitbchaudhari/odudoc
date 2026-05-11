import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError, requireActiveBilling } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import {
  listStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  type StaffRole,
  type StaffStatus,
} from "@/lib/hospital/staff-store";
import { deleteAppointmentsForStaff } from "@/lib/hospital/appointments-store";
import { bootstrapStaffUser } from "@/lib/staff-user-bootstrap";
import { getOrganizationById } from "@/lib/organizations-store";

import { parseJson, z } from "@/lib/validate";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function handleError(e: unknown) {
  if (e instanceof TenantError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  return NextResponse.json({ error: "internal" }, { status: 500 });
}

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireOrg();
    const { searchParams } = new URL(req.url);
    return NextResponse.json({
      staff: listStaff({
        organizationId: orgId,
        role: (searchParams.get("role") as StaffRole) || undefined,
        department: searchParams.get("department") || undefined,
        status: (searchParams.get("status") as StaffStatus) || undefined,
        search: searchParams.get("search") || undefined,
      }),
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "create", entityType: "staff", module: "staff" });
    const __parsed_1 = await parseJson(req, z.any());
    if (__parsed_1 instanceof NextResponse) return __parsed_1;
    const body: any = __parsed_1;
    if (!body.firstName || !body.lastName || !body.role) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const s = createStaff(orgId, body);

    // Auto-provision the auth account + send credentials when the
    // staff record has an email. Username = their email, temp
    // password expires in 3 days (lib/auth.ts enforces the block).
    // Failures here MUST NOT roll back the staff record — the admin
    // can re-trigger delivery from /admin/staff later.
    let bootstrap: Awaited<ReturnType<typeof bootstrapStaffUser>> | null = null;
    if (body.email && typeof body.email === "string" && body.email.includes("@")) {
      try {
        const org = getOrganizationById(orgId);
        bootstrap = await bootstrapStaffUser({
          orgId,
          orgName: org?.name || "your hospital",
          staffName: `${s.firstName} ${s.lastName}`.trim(),
          staffEmail: body.email,
          staffPhone: body.phone,
          staffRole: s.role,
        });
      } catch (err) {
        // Swallow — surface a `delivery: { failed: ... }` so the
        // admin sees what happened without losing the staff record.
        bootstrap = null;
      }
    }

    return NextResponse.json({
      staff: s,
      // Surfaced only on create so the org admin can copy the temp
      // password if SMS / email delivery silently fails. The UI
      // shows a one-time "credentials" panel when present.
      credentials: bootstrap
        ? {
            email: bootstrap.email,
            tempPassword: bootstrap.tempPassword,
            expiresAt: bootstrap.expiresAt,
            userCreated: bootstrap.userCreated,
            delivery: bootstrap.delivery,
          }
        : null,
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "update", entityType: "staff", module: "staff" });
    const __parsed_2 = await parseJson(req, z.any());
    if (__parsed_2 instanceof NextResponse) return __parsed_2;
    const body: any = __parsed_2;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const s = updateStaff(String(body.id), orgId, body);
    if (!s) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ staff: s });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "delete", entityType: "staff", module: "staff" });
    const __parsed_3 = await parseJson(req, z.any());
    if (__parsed_3 instanceof NextResponse) return __parsed_3;
    const body: any = __parsed_3;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const ok = deleteStaff(String(body.id), orgId);
    if (ok) deleteAppointmentsForStaff(String(body.id), orgId);
    return NextResponse.json({ ok });
  } catch (e) {
    return handleError(e);
  }
}
