// Hourly cron: send a reminder email to the patient ~24h before their
// scheduled consultation. Idempotent via the `reminder24hSentAt` marker
// on the consultation record.

import { NextResponse } from "next/server";
import { listConsultations } from "@/lib/consultations-store";
import { sendEmail } from "@/lib/email";

import { log } from "@/lib/log";
const SITE_URL = "https://www.odudoc.com";

function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // allow if not configured (Vercel cron also sends a bearer)
  const header = req.headers.get("authorization") || "";
  return header === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Runs once daily at 08:00 UTC. Widen the window to catch every
  // appointment in the next 12–36h so no one slips through between runs.
  const now = Date.now();
  const windowStart = now + 12 * 3600 * 1000;
  const windowEnd = now + 36 * 3600 * 1000;

  const all = listConsultations({ status: "approved" }).concat(
    listConsultations({ status: "rescheduled" })
  );

  const due = all.filter((c) => {
    const at = new Date(c.scheduledFor).getTime();
    if (Number.isNaN(at)) return false;
    if (at < windowStart || at > windowEnd) return false;
    // Use an ad-hoc marker on the record to avoid duplicate sends
    const record = c as typeof c & { reminder24hSentAt?: string };
    return !record.reminder24hSentAt;
  });

  let sent = 0;
  for (const c of due) {
    if (!c.patientEmail) continue;
    try {
      await sendEmail({
        from: "notifications",
        to: c.patientEmail,
        subject: `Reminder: consultation tomorrow with ${c.doctorName}`,
        html: `<!doctype html><html><body style="margin:0;padding:32px 16px;background:#f3f4f6;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111827;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
            <table width="100%" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden;" cellpadding="0" cellspacing="0">
              <tr><td style="background:#0E7490;padding:18px 24px;color:#fff;font-weight:700;font-size:18px;">OduDoc</td></tr>
              <tr><td style="padding:28px;">
                <h1 style="margin:0 0 16px 0;font-size:20px;">Your consultation is tomorrow</h1>
                <p style="margin:0 0 12px 0;">Hi ${escape(c.patientName)}, just a quick reminder — your video consultation with <b>${escape(c.doctorName)}</b> is scheduled for <b>${escape(c.dateLabel)} at ${escape(c.timeSlot)}</b>.</p>
                <p style="margin:0 0 12px 0;">Make sure you have a quiet space, good lighting, and a stable internet connection. Join 2–3 minutes early.</p>
                <p style="margin:24px 0 0 0;"><a href="${SITE_URL}/dashboard/consultations" style="display:inline-block;background:#0E7490;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">Open your dashboard</a></p>
              </td></tr>
            </table>
          </td></tr></table></body></html>`,
      });
      (c as typeof c & { reminder24hSentAt?: string }).reminder24hSentAt = new Date().toISOString();
      sent++;
    } catch (err) {
      log.error("console.error", undefined, { args: ["[cron/appointment-reminders] send failed", c.id, err] });
    }
  }

  return NextResponse.json({ ok: true, scanned: all.length, eligible: due.length, sent });
}
