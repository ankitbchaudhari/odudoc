// Daily cron: manages the lifecycle of demo orgs (the ones seeded by
// /api/admin/super/seed-demo, identified by the @odudoc.example contact
// sentinel).
//
// What it does per run:
//   1. For every demo org whose trial ends in the next 3 days AND hasn't
//      been reminded yet (demoReminderSentAt unset): send a conversion
//      reminder email to the demo admin.
//   2. For every demo org whose trial has expired AND is still active:
//      suspend it.
//
// Vercel Cron hits this once a day at 07:00 UTC. Auth is the standard
// CRON_SECRET Bearer header — set `CRON_SECRET` env var to enforce; if
// it's unset we allow the call through (useful for local/dev).
//
// Configure in vercel.json:
//   { "path": "/api/cron/cleanup-demos", "schedule": "0 7 * * *" }

import { NextRequest, NextResponse } from "next/server";
import { listOrganizations, updateOrganization } from "@/lib/organizations-store";
import { getMembershipsForOrg } from "@/lib/memberships-store";
import { findUserById } from "@/lib/users-store";
import { sendAdminBroadcastEmail } from "@/lib/email";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const expected = secret ? `Bearer ${secret}` : null;
  if (expected && authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const demoOrgs = listOrganizations().filter((o) =>
    o.contactEmail.endsWith("@odudoc.example"),
  );

  let remindersSent = 0;
  let suspended = 0;

  for (const org of demoOrgs) {
    if (!org.trialEndsAt) continue;
    const trialEnd = new Date(org.trialEndsAt).getTime();
    const msUntilEnd = trialEnd - now;

    // Step 1: expiry reminder, 3 days before trial end, once per org.
    if (
      msUntilEnd > 0 &&
      msUntilEnd <= 3 * DAY_MS &&
      !org.demoReminderSentAt &&
      org.status === "active"
    ) {
      // Find the demo admin user (first admin membership).
      const admins = getMembershipsForOrg(org.id).filter((m) => m.role === "admin");
      const adminUser = admins
        .map((m) => findUserById(m.userId))
        .find((u) => u && u.email.endsWith("@odudoc.com"));

      if (adminUser) {
        const daysLeft = Math.max(1, Math.ceil(msUntilEnd / DAY_MS));
        const message =
          `Your OduDoc demo hospital "${org.name}" trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.\n\n` +
          `We hope the demo gave your team a feel for how OduDoc can run your OPD, IPD, telemedicine, and billing in one place.\n\n` +
          `Want to convert to a real account with your hospital's own data? Just reply to this email and our team will move you from demo to production — we'll migrate your branding, set up real staff logins, and enable the modules you need.\n\n` +
          `If you'd rather let the demo expire, no action is needed. Your demo tenant will be suspended automatically once the trial ends.`;

        try {
          const r = await sendAdminBroadcastEmail({
            to: adminUser.email,
            recipientName: adminUser.name,
            subject: `Your OduDoc demo ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"} — want to convert?`,
            message,
            from: "admin",
            ctaLabel: "Reply to convert",
            ctaUrl: "https://www.odudoc.com/contact",
          });
          if (r.ok) {
            updateOrganization(org.id, { demoReminderSentAt: new Date().toISOString() });
            remindersSent++;
          } else {
            log.warn("cron.cleanup_demos.reminder_failed", { orgId: org.id, error: r.error });
          }
        } catch (e) {
          log.error("cron.cleanup_demos.reminder_threw", e, { orgId: org.id });
        }
      } else {
        // No admin user found — mark reminder sent anyway so we don't retry
        // forever on orgs that were seeded by older code paths.
        updateOrganization(org.id, { demoReminderSentAt: new Date().toISOString() });
      }
    }

    // Step 2: suspend if trial has expired and org is still active.
    if (msUntilEnd <= 0 && org.status === "active") {
      updateOrganization(org.id, { status: "suspended" });
      suspended++;
    }
  }

  log.info("cron.cleanup_demos", {
    demoOrgs: demoOrgs.length,
    remindersSent,
    suspended,
  });

  return NextResponse.json({
    ok: true,
    demoOrgs: demoOrgs.length,
    remindersSent,
    suspended,
  });
}
