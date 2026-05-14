// ABDM Digital Health Incentive Scheme (DHIS) report API.
//
// GET /api/admin/dhis?organizationId=&fyYear=
//   Super admin can request any orgId; org admins are restricted to
//   their own active org. Returns the four quarterly reports for the
//   requested fiscal year plus the current-quarter report.

import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { getOrganizationById } from "@/lib/organizations-store";
import {
  computeDhisReport,
  computeDhisYtdForFy,
  currentDhisQuarter,
  fyYearForDate,
} from "@/lib/abdm/dhis";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ctx = await getTenantContext();
  if (!ctx.email) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const url = new URL(req.url);
  const requestedOrgId = url.searchParams.get("organizationId") || "";
  const fyParam = url.searchParams.get("fyYear");
  const fyYear = fyParam ? Number(fyParam) : fyYearForDate(new Date());
  if (!Number.isFinite(fyYear)) {
    return NextResponse.json({ error: "bad_fy_year" }, { status: 400 });
  }

  // Org admins may only query their own active org. Super admins
  // can query any org (defaulting to their active impersonated org,
  // then falling back to the supplied id).
  let orgId = requestedOrgId;
  if (!ctx.isSuperAdmin) {
    if (!ctx.organization) {
      return NextResponse.json({ error: "no_active_org" }, { status: 400 });
    }
    if (requestedOrgId && requestedOrgId !== ctx.organization.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    orgId = ctx.organization.id;
  }
  if (!orgId) {
    return NextResponse.json({ error: "missing_organization_id" }, { status: 400 });
  }
  const org = getOrganizationById(orgId);
  if (!org) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const quarters = computeDhisYtdForFy(orgId, fyYear, org.hfrFacilityId);
    const currentQuarter = computeDhisReport(
      orgId,
      currentDhisQuarter(),
      org.hfrFacilityId,
    );
    return NextResponse.json({
      organizationId: orgId,
      fyYear,
      hfrFacilityId: org.hfrFacilityId,
      quarters,
      currentQuarter,
    });
  } catch (err) {
    log.warn("admin.dhis.compute_failed", {
      orgId,
      fyYear,
      message: (err as Error).message,
    });
    return NextResponse.json({ error: "compute_failed" }, { status: 500 });
  }
}
