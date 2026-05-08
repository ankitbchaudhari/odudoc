import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/tenant";
import {
  listOrganizations,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  getOrganizationById,
  type OrgPlan,
  type OrgStatus,
  type Organization,
} from "@/lib/organizations-store";
import { deleteMembershipsForOrg } from "@/lib/memberships-store";
import { recordAudit, type AuditAction } from "@/lib/audit-log-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard(): Promise<{ email: string } | NextResponse> {
  const s = await getServerSession(authOptions);
  const email = s?.user?.email;
  if (!email || !isSuperAdmin(email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return { email };
}

export async function GET() {
  const g = await guard();
  if (g instanceof NextResponse) return g;
  return NextResponse.json({ organizations: listOrganizations() });
}

export async function POST(req: NextRequest) {
  const g = await guard();
  if (g instanceof NextResponse) return g;
  const body = await req.json();
  if (!body.name || !body.contactEmail) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  const org = createOrganization({
    name: String(body.name),
    contactEmail: String(body.contactEmail),
    contactPhone: body.contactPhone ? String(body.contactPhone) : undefined,
    country: body.country ? String(body.country) : undefined,
    plan: body.plan as OrgPlan | undefined,
    trialDays: body.trialDays ? Number(body.trialDays) : undefined,
    modules: body.modules,
  });
  recordAudit({
    actorEmail: g.email,
    action: "org.create",
    orgId: org.id,
    orgName: org.name,
    summary: `Created organization "${org.name}" on ${org.plan} plan`,
    meta: { plan: org.plan, modules: org.modules },
  });
  // Drain pending Postgres writes before returning. Vercel freezes
  // the Lambda the moment we respond, so a fire-and-forget flush()
  // can be killed mid-write — the operator sees a 200 + the row in
  // the table, but on the next page load it's gone.
  try {
    await awaitAllFlushesStrict();
  } catch {
    return NextResponse.json(
      { error: "saved_but_not_persisted" },
      { status: 500 },
    );
  }
  return NextResponse.json({ organization: org });
}

export async function PATCH(req: NextRequest) {
  const g = await guard();
  if (g instanceof NextResponse) return g;
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const before = getOrganizationById(String(body.id));
  if (!before) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const snapshot: Organization = { ...before, modules: { ...before.modules } };

  const updated = updateOrganization(String(body.id), {
    name: body.name,
    contactEmail: body.contactEmail,
    contactPhone: body.contactPhone,
    country: body.country,
    plan: body.plan as OrgPlan | undefined,
    status: body.status as OrgStatus | undefined,
    modules: body.modules,
    trialEndsAt: body.trialEndsAt,
  });
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Emit one audit entry per "thing that actually changed" so the log
  // reads naturally — avoids a single noisy "updated" blob that forces
  // the reader to diff JSON to understand what happened.
  const events: Array<{ action: AuditAction; summary: string; meta?: Record<string, unknown> }> = [];
  if (snapshot.plan !== updated.plan) {
    events.push({
      action: "org.plan_change",
      summary: `Plan: ${snapshot.plan} → ${updated.plan}`,
      meta: { from: snapshot.plan, to: updated.plan },
    });
  }
  if (snapshot.status !== updated.status) {
    events.push({
      action: "org.status_change",
      summary: `Status: ${snapshot.status} → ${updated.status}`,
      meta: { from: snapshot.status, to: updated.status },
    });
  }
  const moduleDiffs: string[] = [];
  for (const k of Object.keys(updated.modules) as (keyof Organization["modules"])[]) {
    if (snapshot.modules[k] !== updated.modules[k]) {
      moduleDiffs.push(`${k}: ${snapshot.modules[k] ? "on" : "off"} → ${updated.modules[k] ? "on" : "off"}`);
    }
  }
  if (moduleDiffs.length > 0) {
    events.push({
      action: "org.modules_change",
      summary: `Modules: ${moduleDiffs.join(", ")}`,
      meta: { diff: moduleDiffs, before: snapshot.modules, after: updated.modules },
    });
  }
  // Catch-all for field edits that don't have their own action code, so
  // contact-info changes aren't silently invisible.
  const fieldChanges: string[] = [];
  if (snapshot.name !== updated.name) fieldChanges.push(`name: "${snapshot.name}" → "${updated.name}"`);
  if (snapshot.contactEmail !== updated.contactEmail) fieldChanges.push(`contactEmail: ${snapshot.contactEmail} → ${updated.contactEmail}`);
  if (snapshot.contactPhone !== updated.contactPhone) fieldChanges.push(`contactPhone changed`);
  if (snapshot.country !== updated.country) fieldChanges.push(`country: ${snapshot.country || "—"} → ${updated.country || "—"}`);
  if (fieldChanges.length > 0 && events.every((e) => e.action !== "org.update")) {
    events.push({
      action: "org.update",
      summary: fieldChanges.join("; "),
      meta: { changes: fieldChanges },
    });
  }

  for (const ev of events) {
    recordAudit({
      actorEmail: g.email,
      action: ev.action,
      orgId: updated.id,
      orgName: updated.name,
      summary: ev.summary,
      meta: ev.meta,
    });
  }

  try {
    await awaitAllFlushesStrict();
  } catch {
    return NextResponse.json(
      { error: "saved_but_not_persisted" },
      { status: 500 },
    );
  }
  return NextResponse.json({ organization: updated });
}

export async function DELETE(req: NextRequest) {
  const g = await guard();
  if (g instanceof NextResponse) return g;
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const before = getOrganizationById(String(body.id));
  if (!before) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  const ok = deleteOrganization(String(body.id));
  if (!ok) {
    return NextResponse.json({ ok: false, error: "delete_failed" }, { status: 500 });
  }
  deleteMembershipsForOrg(String(body.id));
  recordAudit({
    actorEmail: g.email,
    action: "org.delete",
    orgId: String(body.id),
    orgName: before.name,
    summary: `Deleted organization "${before.name}"`,
    meta: { plan: before.plan, status: before.status },
  });
  // Critical: drain Postgres writes before responding. Without this
  // the Lambda freezes after the JSON response and the underlying
  // delete is killed mid-flight, so the org reappears on the next
  // page load. Same fix we applied to /api/admin/doctors.
  try {
    await awaitAllFlushesStrict();
  } catch {
    return NextResponse.json(
      { ok: false, error: "deleted_but_not_persisted" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
