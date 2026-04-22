// Super-admin only: for a demo org that was seeded before the
// persistent-array flush race was fixed, the staff users are sometimes
// missing in Postgres even though their credentials went out by email.
// This endpoint rebuilds the 4 staff users (3 doctors + 1 receptionist)
// using the exact same email/password derivation rule as seedDemoOrg —
// so the originally-emailed credentials still work after repair.
//
// Idempotent: if a staff user already exists, we leave their password
// alone but ensure the membership row is in place.
//
// POST /api/admin/super/repair-demo-staff  { orgId: string }

import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { getOrganizationById } from "@/lib/organizations-store";
import { createUser, findUserByEmail, markEmailVerified } from "@/lib/users-store";
import { createMembership, getMembershipsForOrg } from "@/lib/memberships-store";
import { awaitAllFlushes } from "@/lib/persistent-array";
import { recordAudit } from "@/lib/audit-log-store";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// MUST match seedDemoOrg exactly — this is the whole point of the repair.
const STAFF_SEED: Array<{
  role: "doctor" | "staff";
  orgRole: "doctor" | "receptionist";
  first: string;
  last: string;
  title: string;
}> = [
  { role: "doctor", orgRole: "doctor", first: "Anika", last: "Desai", title: "General Physician" },
  { role: "doctor", orgRole: "doctor", first: "Rahul", last: "Verma", title: "Cardiologist" },
  { role: "doctor", orgRole: "doctor", first: "Sneha", last: "Kulkarni", title: "Pediatrician" },
  { role: "staff",  orgRole: "receptionist", first: "Kiran", last: "Shah", title: "Receptionist" },
];

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext();
  if (!ctx.isSuperAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const orgId = String(body?.orgId || "").trim();
  if (!orgId) {
    return NextResponse.json({ error: "missing_org_id" }, { status: 400 });
  }

  const org = getOrganizationById(orgId);
  if (!org) {
    return NextResponse.json({ error: "org_not_found" }, { status: 404 });
  }

  const slugKey = org.slug.slice(-6).toUpperCase();
  const existingMemberships = getMembershipsForOrg(org.id);
  const existingMembershipUserIds = new Set(existingMemberships.map((m) => m.userId));

  const repaired: Array<{
    name: string;
    email: string;
    password: string;
    title: string;
    action: "created" | "already_existed" | "membership_added";
  }> = [];

  for (const s of STAFF_SEED) {
    const email = `${s.first.toLowerCase()}.${s.last.toLowerCase()}.${org.slug}@odudoc.example`;
    const pw = `${s.first}@${slugKey}`;
    let action: "created" | "already_existed" | "membership_added" = "already_existed";

    let u = findUserByEmail(email);
    if (!u) {
      u = createUser({
        name: `${s.first} ${s.last}`,
        email,
        phone: "+910000000000",
        password: pw,
        role: s.role,
      });
      action = "created";
    }
    markEmailVerified(email);

    if (!existingMembershipUserIds.has(u.id)) {
      createMembership({
        userId: u.id,
        organizationId: org.id,
        role: s.orgRole,
        title: s.title,
      });
      if (action === "already_existed") action = "membership_added";
    }

    repaired.push({
      name: `${s.first} ${s.last}`,
      email,
      password: pw,
      title: s.title,
      action,
    });
  }

  // Critical: drain the write queue before the Lambda freezes — this is
  // exactly the bug that caused the original seed loss we're repairing.
  await awaitAllFlushes();

  const createdCount = repaired.filter((r) => r.action === "created").length;
  recordAudit({
    actorEmail: ctx.email || "unknown",
    action: "demo.repair_staff",
    orgId: org.id,
    orgName: org.name,
    summary: `Repaired demo staff for "${org.name}" — ${createdCount} recreated, ${repaired.length - createdCount} already existed`,
    meta: { actions: repaired.map((r) => ({ email: r.email, action: r.action })) },
  });

  log.info("demo_staff.repaired", {
    orgId: org.id,
    orgSlug: org.slug,
    by: ctx.email,
    counts: {
      created: repaired.filter((r) => r.action === "created").length,
      membershipAdded: repaired.filter((r) => r.action === "membership_added").length,
      alreadyExisted: repaired.filter((r) => r.action === "already_existed").length,
    },
  });

  return NextResponse.json({ ok: true, org: { id: org.id, slug: org.slug, name: org.name }, staff: repaired });
}
