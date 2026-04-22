// Tenant admin → super admin: "I want these modules enabled on my org".
//
// Fires an in-app bell notification + email to every super-admin so the
// platform operator can enable the flags from /admin/organizations. Stays
// deliberately lightweight: no new persistence, no ticket state machine —
// the notification link deep-links to the org row the super-admin needs to
// edit.

import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { addAdminNotification } from "@/lib/admin-notifications-store";
import { sendAdminBroadcastEmail } from "@/lib/email";
import { log } from "@/lib/log";
import { allowedModulesForPlan } from "@/lib/organizations-store";
import { recordAudit } from "@/lib/audit-log-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_MODULES = new Set([
  "patient", "opd", "ipd", "lab", "pharmacy", "billing",
  "surgery", "inventory", "radiology", "telemedicine", "aiVoice",
]);

export async function POST(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx.email) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!ctx.organization) {
    return NextResponse.json({ error: "no_active_org" }, { status: 400 });
  }

  let body: { modules?: unknown; note?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const requested = Array.isArray(body.modules)
    ? body.modules.filter((m): m is string => typeof m === "string" && VALID_MODULES.has(m))
    : [];
  if (requested.length === 0) {
    return NextResponse.json({ error: "no_modules_specified" }, { status: 400 });
  }

  const note = typeof body.note === "string" ? body.note.slice(0, 500) : "";
  const org = ctx.organization;

  // Split the request into "included in the org's current plan" (super-
  // admin can just flip the flag) vs "needs a plan upgrade" (super-admin
  // needs to renegotiate pricing first). Both still go through but the
  // notification is labeled so ops knows which conversation to have.
  const planAllowed = allowedModulesForPlan(org.plan);
  const inPlan = requested.filter((m) => planAllowed.has(m as never));
  const upgradeRequired = requested.filter((m) => !planAllowed.has(m as never));
  const modulesList = requested.join(", ");
  const upgradeSuffix = upgradeRequired.length > 0
    ? ` (plan upgrade needed for: ${upgradeRequired.join(", ")})`
    : "";

  // Bell notification — visible on every super-admin's admin layout. Links
  // straight to the org editor so they can tick the boxes without hunting.
  addAdminNotification({
    type: "module_request",
    title: `Module request from ${org.name}`,
    body: `${ctx.email} requested: ${modulesList}${upgradeSuffix}${note ? ` — "${note}"` : ""}`,
    link: `/admin/organizations?highlight=${encodeURIComponent(org.id)}`,
  });

  // Email fan-out to every configured super-admin. We do this best-effort
  // and don't fail the request if SMTP is down — the bell notification is
  // the durable signal.
  const superEmails = (process.env.SUPER_ADMIN_EMAILS || "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const recipients = superEmails.length > 0 ? superEmails : ["admin@odudoc.com"];

  const subject = `Module request: ${org.name} wants ${modulesList}`;
  const message =
    `${ctx.email} (admin of ${org.name}, plan: ${org.plan}) has requested the following modules be enabled on their organization:\n\n` +
    `  • ${requested.join("\n  • ")}\n\n` +
    (inPlan.length > 0 ? `Included in current plan — can be toggled directly:\n  • ${inPlan.join("\n  • ")}\n\n` : "") +
    (upgradeRequired.length > 0 ? `Requires plan upgrade:\n  • ${upgradeRequired.join("\n  • ")}\n\n` : "") +
    (note ? `Note from requester:\n"${note}"\n\n` : "") +
    `Enable the flags from the Organizations page, or reply to the requester if you'd like to discuss plan changes first.`;

  let sent = 0;
  for (const to of recipients) {
    try {
      const r = await sendAdminBroadcastEmail({
        to,
        subject,
        message,
        from: "admin",
        ctaLabel: "Open organization",
        ctaUrl: `https://www.odudoc.com/admin/organizations?highlight=${encodeURIComponent(org.id)}`,
      });
      if (r.ok) sent++;
    } catch {
      // Swallow — logged below, notification still fired.
    }
  }

  recordAudit({
    actorEmail: ctx.email,
    action: "module.request_submitted",
    orgId: org.id,
    orgName: org.name,
    summary: `Requested modules: ${modulesList}${upgradeSuffix}`,
    meta: { requested, inPlan, upgradeRequired, notified: sent },
  });

  log.info("module_request.submitted", {
    orgId: org.id,
    orgName: org.name,
    by: ctx.email,
    modules: requested,
    emailsSent: sent,
    emailsAttempted: recipients.length,
  });

  return NextResponse.json({ ok: true, modules: requested, notified: sent });
}
