// Super-admin only: given an enterprise lead, seed a demo org in one shot,
// email the login credentials to the lead's contact email, and move the
// lead to "demoed". Called from the "Create demo" button on the
// /admin/enterprise-leads page.
//
// POST /api/admin/super/seed-demo-for-lead  { leadId: string }

import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { getLeadById, updateLead } from "@/lib/enterprise-leads-store";
import { seedDemoOrg } from "@/lib/seed-demo-org";
import { sendAdminBroadcastEmail } from "@/lib/email";
import { log } from "@/lib/log";
import { awaitAllFlushes } from "@/lib/persistent-array";
import { recordAudit } from "@/lib/audit-log-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_URL = "https://www.odudoc.com";

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext();
  if (!ctx.isSuperAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const leadId = String(body?.leadId || "").trim();
  if (!leadId) return NextResponse.json({ error: "missing_lead_id" }, { status: 400 });

  const lead = getLeadById(leadId);
  if (!lead) return NextResponse.json({ error: "lead_not_found" }, { status: 404 });

  const result = seedDemoOrg({ name: lead.organizationName });

  // Seeding fires dozens of synchronous mutations (patients, appointments,
  // users, memberships) whose Postgres writes are queued fire-and-forget.
  // Drain them before we respond — otherwise Vercel freezes the Lambda
  // the moment this handler returns and late writes (especially the staff
  // users created last) never land, which makes the emailed credentials
  // non-functional.
  await awaitAllFlushes();

  const loginUrl = `${SITE_URL}${result.login.url}`;
  const staffLines = result.staff
    .map((s) => `  • ${s.title} — ${s.name}\n    ${s.email} / ${s.password}`)
    .join("\n");

  const message =
    `Hi ${lead.contactName},\n\n` +
    `Thanks for your interest in OduDoc. We've spun up a live demo hospital for you called "${result.org.name}" with 12 sample patients, 12 appointments, and a full staff roster so you can try every module end-to-end.\n\n` +
    `— Your admin login —\n` +
    `URL: ${loginUrl}\n` +
    `Email: ${result.login.email}\n` +
    `Password: ${result.login.password}\n\n` +
    `— Staff logins (for role-switching) —\n${staffLines}\n\n` +
    `The demo is valid for 30 days. Reply to this email any time if you'd like a guided walkthrough or want to convert it into a real production tenant with your hospital's branding and data.\n\n` +
    `— The OduDoc team`;

  let emailOk = false;
  let emailError: string | undefined;
  try {
    const r = await sendAdminBroadcastEmail({
      to: lead.contactEmail,
      recipientName: lead.contactName,
      subject: `Your OduDoc demo hospital is ready — login inside`,
      message,
      from: "admin",
      ctaLabel: "Sign in to your demo",
      ctaUrl: loginUrl,
    });
    emailOk = r.ok;
    emailError = r.error;
  } catch (e) {
    emailError = e instanceof Error ? e.message : String(e);
  }

  // Bump lead to "demoed" regardless of email outcome — the demo exists.
  const existingNotes = lead.notes ? `${lead.notes}\n\n` : "";
  const demoNote =
    `[${new Date().toISOString().slice(0, 16).replace("T", " ")}] Demo seeded by ${ctx.email}. ` +
    `Org: ${result.org.name} (${result.org.slug}). ` +
    `Admin login: ${result.login.email} / ${result.login.password}. ` +
    `Email ${emailOk ? "sent" : `FAILED: ${emailError || "unknown"}`}.`;
  updateLead(lead.id, {
    status: "demoed",
    notes: `${existingNotes}${demoNote}`,
  });

  recordAudit({
    actorEmail: ctx.email || "unknown",
    action: "demo.seed_for_lead",
    orgId: result.org.id,
    orgName: result.org.name,
    summary: `Seeded demo for lead ${lead.contactName} (${lead.contactEmail})`,
    meta: { leadId: lead.id, counts: result.counts, emailOk },
  });

  log.info("enterprise_lead.demo_seeded", {
    leadId: lead.id,
    orgId: result.org.id,
    by: ctx.email,
    emailOk,
  });

  return NextResponse.json({
    ok: true,
    org: result.org,
    counts: result.counts,
    login: result.login,
    staff: result.staff,
    email: { sent: emailOk, error: emailError },
  });
}
