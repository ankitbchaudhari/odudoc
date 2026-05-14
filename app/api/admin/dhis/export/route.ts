// CSV export of a single DHIS quarter — formatted for direct upload
// on the NHA DHIS submission portal.

import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { getOrganizationById } from "@/lib/organizations-store";
import {
  computeDhisYtdForFy,
  fyYearForDate,
} from "@/lib/abdm/dhis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvEscape(v: string | number): string {
  const s = String(v);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: NextRequest) {
  const ctx = await getTenantContext();
  if (!ctx.email) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const url = new URL(req.url);
  const requestedOrgId = url.searchParams.get("organizationId") || "";
  const fyParam = url.searchParams.get("fyYear");
  const qParam = url.searchParams.get("quarter");
  const fyYear = fyParam ? Number(fyParam) : fyYearForDate(new Date());
  const quarter = qParam ? Number(qParam) : NaN;
  if (!Number.isFinite(fyYear) || ![1, 2, 3, 4].includes(quarter)) {
    return NextResponse.json({ error: "bad_params" }, { status: 400 });
  }

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

  const reports = computeDhisYtdForFy(orgId, fyYear, org.hfrFacilityId);
  const report = reports[quarter - 1];

  const header = ["facility_id", "period_start", "period_end", "category", "record_count", "rate_inr", "amount_inr"];
  const rows: string[] = [header.join(",")];
  for (const b of report.breakdown) {
    rows.push([
      csvEscape(org.hfrFacilityId || ""),
      csvEscape(report.period.startIso),
      csvEscape(report.period.endIso),
      csvEscape(b.category),
      csvEscape(b.count),
      csvEscape(b.rateInr),
      csvEscape(b.amountInr),
    ].join(","));
  }
  const csv = rows.join("\r\n") + "\r\n";

  const filename = `dhis_${fyYear}_q${quarter}_${org.slug}.csv`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
