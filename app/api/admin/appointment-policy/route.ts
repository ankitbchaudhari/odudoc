// Admin API for the appointment-penalty policy.
//
//   GET  /api/admin/appointment-policy
//     → { policies, platformDefault, hardDefault, scopes }
//
//   PUT  /api/admin/appointment-policy
//     → save one (scope, scopeId) policy
//
//   DELETE /api/admin/appointment-policy?scope=..&scopeId=..
//     → drop an override so the cascade falls through
//
//   POST /api/admin/appointment-policy/preview is in its own file —
//   keeps this endpoint pure CRUD.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import {
  deletePolicy,
  getPlatformDefault,
  listPolicies,
  savePolicy,
} from "@/lib/appointment-penalty-store";
import {
  PLATFORM_DEFAULT_POLICY,
  isValidPolicyShape,
  type PenaltyPolicy,
  type PenaltyScope,
} from "@/lib/appointment-penalty-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_SCOPES: PenaltyScope[] = [
  "platform",
  "organization",
  "clinic",
  "doctor",
];

function canEditScope(
  scope: PenaltyScope,
  ctx: Awaited<ReturnType<typeof getTenantContext>>,
  role: string | undefined,
): boolean {
  // Super-admin can edit anything.
  if (ctx.isSuperAdmin) return true;
  // Platform-default is super-admin only.
  if (scope === "platform") return false;
  // Tenant admin can edit their org's policy.
  if (scope === "organization" && role === "admin") return true;
  // Clinic policies need clinic-owner / admin scope — covered by org
  // admin role for V1; deeper RBAC is a follow-up.
  if (scope === "clinic" && role === "admin") return true;
  // Doctor policies are editable by the doctor themselves or their
  // org admin.
  if (scope === "doctor" && (role === "doctor" || role === "admin")) return true;
  return false;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const policies = await listPolicies();
  const platformDefault = await getPlatformDefault();
  return NextResponse.json({
    policies,
    platformDefault,
    hardDefault: PLATFORM_DEFAULT_POLICY,
    scopes: VALID_SCOPES,
  });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const ctx = await getTenantContext();
  const body = (await req.json().catch(() => ({}))) as Partial<PenaltyPolicy>;
  const scope = body.scope as PenaltyScope | undefined;
  if (!scope || !VALID_SCOPES.includes(scope)) {
    return NextResponse.json({ error: "invalid_scope" }, { status: 400 });
  }
  if (!canEditScope(scope, ctx, role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  // Platform default has no scopeId; everything else must carry one.
  const scopeId = scope === "platform" ? null : body.scopeId || null;
  if (scope !== "platform" && !scopeId) {
    return NextResponse.json({ error: "missing_scope_id" }, { status: 400 });
  }
  const shapeError = isValidPolicyShape(body);
  if (shapeError) {
    return NextResponse.json({ error: shapeError }, { status: 400 });
  }
  const saved = await savePolicy({
    scope,
    scopeId,
    noShowPenaltyPercent: body.noShowPenaltyPercent!,
    lateCancelPenaltyPercent: body.lateCancelPenaltyPercent!,
    lateCancelWindowMinutes: body.lateCancelWindowMinutes!,
    earlyCancelRefundPercent: body.earlyCancelRefundPercent!,
    rescheduleFeeRupees: body.rescheduleFeeRupees!,
    notes: body.notes,
    doctorCancelRefundsFull: true,
    updatedAt: new Date().toISOString(),
  });
  return NextResponse.json({ ok: true, policy: saved });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const ctx = await getTenantContext();
  const url = req.nextUrl;
  const scope = url.searchParams.get("scope") as PenaltyScope | null;
  const scopeId = url.searchParams.get("scopeId");
  if (!scope || !VALID_SCOPES.includes(scope)) {
    return NextResponse.json({ error: "invalid_scope" }, { status: 400 });
  }
  if (!canEditScope(scope, ctx, role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  await deletePolicy(scope, scopeId);
  return NextResponse.json({ ok: true });
}
