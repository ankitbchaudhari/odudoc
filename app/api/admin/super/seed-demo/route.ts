// Super-admin only: creates a fully populated demo organization with
// sample patients, appointments, and notifications so new signups (or
// sales demos) see a live-feeling system instead of empty tables.
//
// POST /api/admin/super/seed-demo  { name?: string }
// Returns { org, counts, login, staff }

import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { seedDemoOrg } from "@/lib/seed-demo-org";
import { log } from "@/lib/log";
import { awaitAllFlushes } from "@/lib/persistent-array";
import { recordAudit } from "@/lib/audit-log-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext();
  if (!ctx.isSuperAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { name?: string } = {};
  try { body = await req.json(); } catch { /* empty body is fine */ }

  const result = seedDemoOrg({ name: body.name });

  // Drain pending Postgres writes before the Lambda freezes — without
  // this the late-seeded staff users can be lost, breaking their logins.
  await awaitAllFlushes();

  recordAudit({
    actorEmail: ctx.email || "unknown",
    action: "demo.seed",
    orgId: result.org.id,
    orgName: result.org.name,
    summary: `Seeded demo org "${result.org.name}"`,
    meta: { counts: result.counts },
  });

  log.info("seed.demo_org", {
    orgId: result.org.id,
    patients: result.counts.patients,
    appointments: result.counts.appointments,
    notifications: result.counts.notifications,
    demoUserId: result.demoUserId,
    staff: result.staff.length,
  });

  return NextResponse.json({
    org: result.org,
    counts: result.counts,
    login: result.login,
    staff: result.staff,
  });
}
