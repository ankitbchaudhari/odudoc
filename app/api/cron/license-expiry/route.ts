// Daily cron: doctor medical-license expiry monitor.
//
// What it does per run:
//   1. Mark every doctor whose `licenseExpiry` is in the past as Inactive
//      (they cannot accept consultations once unlicensed). One-shot —
//      we only deactivate, we don't reactivate even if expiry is bumped
//      forward; admin must Active the doctor manually after seeing the
//      new license document.
//   2. Email doctors whose license expires in the next 30 / 14 / 3 days
//      and hasn't been reminded for that bucket yet. Idempotency is
//      tracked via the `licenseReminderTier` flag on the Doctor (one
//      of "30" | "14" | "3" | "expired") so a 3-day reminder doesn't
//      fire after the 14-day reminder has fired.
//   3. Drop a row in admin_notifications so the dashboard surfaces
//      expiring + expired licenses front and centre.
//
// Vercel Cron hits this at 10:00 UTC daily. Auth is the standard
// CRON_SECRET Bearer header — set CRON_SECRET to enforce; if it's
// unset we allow the call through (useful for local/dev).
//
// Configure in vercel.json:
//   { "path": "/api/cron/license-expiry", "schedule": "0 10 * * *" }

import { NextRequest, NextResponse } from "next/server";
import { listDoctors, updateDoctor } from "@/lib/doctors-store";
import { addAdminNotification } from "@/lib/admin-notifications-store";
import { sendEmail } from "@/lib/email";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

interface DoctorWithReminder {
  id: string;
  licenseReminderTier?: "30" | "14" | "3" | "expired";
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const expected = secret ? `Bearer ${secret}` : null;
  if (expected && authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const doctors = listDoctors();

  let deactivated = 0;
  let reminded = 0;
  const expiredIds: string[] = [];
  const expiringIds: string[] = [];

  for (const d of doctors) {
    if (!d.licenseExpiry) continue;
    const expiryMs = Date.parse(d.licenseExpiry);
    if (!Number.isFinite(expiryMs)) continue;
    const daysLeft = Math.floor((expiryMs - now) / DAY);

    // Bucket the reminder so we send a 30-day, then a 14-day, then a
    // 3-day, then an expired notice — and never repeat the same bucket.
    let nextTier: DoctorWithReminder["licenseReminderTier"] | null = null;
    if (daysLeft < 0) nextTier = "expired";
    else if (daysLeft <= 3) nextTier = "3";
    else if (daysLeft <= 14) nextTier = "14";
    else if (daysLeft <= 30) nextTier = "30";

    const cur = (d as DoctorWithReminder).licenseReminderTier;
    const tierOrder = { expired: 4, "3": 3, "14": 2, "30": 1 } as const;
    const shouldFire = nextTier && (!cur || tierOrder[nextTier] > tierOrder[cur]);

    if (daysLeft < 0) {
      // Force Inactive on expiry; only call updateDoctor once per
      // doctor per run.
      if (d.status === "Active") {
        updateDoctor(d.id, { status: "Inactive" });
        deactivated++;
        expiredIds.push(d.id);
      }
    } else if (daysLeft <= 30) {
      expiringIds.push(d.id);
    }

    if (shouldFire && nextTier) {
      // Stash the reminder tier on the doctor row so subsequent runs
      // skip the same bucket. Cast through `unknown` because
      // licenseReminderTier isn't on the typed DoctorInput patch shape
      // — it's an internal cron-only flag.
      (d as unknown as DoctorWithReminder).licenseReminderTier = nextTier;
      // Email the doctor.
      try {
        const subject =
          nextTier === "expired"
            ? "Your medical license has expired — action required"
            : `Your medical license expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;
        const html = `
          <div style="font-family:system-ui,-apple-system,sans-serif;padding:24px;max-width:520px;margin:auto;">
            <h2 style="color:#0f766e;">${subject}</h2>
            <p>Dear Dr. ${d.name},</p>
            ${
              nextTier === "expired"
                ? `<p>Our records show your medical license expired on <strong>${d.licenseExpiry}</strong>. We have temporarily moved your profile to <strong>Inactive</strong>. To resume accepting consultations, please upload a renewed license to your dashboard so an administrator can verify it.</p>`
                : `<p>Our records show your medical license expires on <strong>${d.licenseExpiry}</strong>. To avoid an interruption in service, please renew your license and upload the updated document to your OduDoc dashboard before that date.</p>`
            }
            <p style="margin-top:16px;">
              <a href="https://www.odudoc.com/dashboard/doctor" style="background:linear-gradient(90deg,#0d9488,#2563eb);color:white;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">Open dashboard</a>
            </p>
            <p style="color:#94a3b8;font-size:12px;margin-top:24px;">This is an automated reminder from OduDoc compliance. Reply to this email if you have questions.</p>
          </div>
        `;
        await sendEmail({
          from: "admin",
          to: d.email,
          subject,
          html,
        });
        reminded++;
      } catch (err) {
        log.error("cron.license_expiry.email_failed", err, { doctorId: d.id });
      }
    }
  }

  if (expiredIds.length > 0 || expiringIds.length > 0) {
    try {
      addAdminNotification({
        type: "license_expiry",
        title: "License expiry status",
        body: `${expiredIds.length} expired (deactivated), ${expiringIds.length} expiring within 30 days.`,
        link: "/admin/doctors",
      });
    } catch (err) {
      log.error("cron.license_expiry.admin_notify_failed", err);
    }
  }

  log.info("cron.license_expiry.done", {
    scanned: doctors.length,
    deactivated,
    reminded,
    expired: expiredIds.length,
    expiring: expiringIds.length,
  });

  return NextResponse.json({
    ok: true,
    scanned: doctors.length,
    deactivated,
    reminded,
    expired: expiredIds.length,
    expiring: expiringIds.length,
  });
}
