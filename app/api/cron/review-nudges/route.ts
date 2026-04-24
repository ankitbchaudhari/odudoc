// Daily cron: nudge patients ~24h after consultation completion to leave
// a review. Idempotent via the `reviewNudgeSentAt` marker.

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
  if (!secret) return true;
  const header = req.headers.get("authorization") || "";
  return header === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const windowStart = now - 48 * 3600 * 1000; // 48h ago
  const windowEnd = now - 20 * 3600 * 1000; // 20h ago

  const completed = listConsultations({ status: "completed" });

  const due = completed.filter((c) => {
    const completedAt = new Date(c.updatedAt).getTime();
    if (Number.isNaN(completedAt)) return false;
    if (completedAt < windowStart || completedAt > windowEnd) return false;
    const record = c as typeof c & { reviewNudgeSentAt?: string };
    return !record.reviewNudgeSentAt;
  });

  let sent = 0;
  for (const c of due) {
    if (!c.patientEmail) continue;
    try {
      await sendEmail({
        from: "notifications",
        to: c.patientEmail,
        subject: `How was your consultation with ${c.doctorName}?`,
        html: `<!doctype html><html><body style="margin:0;padding:32px 16px;background:#f3f4f6;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111827;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
            <table width="100%" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden;" cellpadding="0" cellspacing="0">
              <tr><td style="background:#0E7490;padding:18px 24px;color:#fff;font-weight:700;font-size:18px;">OduDoc</td></tr>
              <tr><td style="padding:28px;">
                <h1 style="margin:0 0 16px 0;font-size:20px;">Thanks for choosing OduDoc</h1>
                <p style="margin:0 0 12px 0;">Hi ${escape(c.patientName)}, we hope your recent consultation with <b>${escape(c.doctorName)}</b> went well.</p>
                <p style="margin:0 0 12px 0;">Your review helps other patients find great doctors — it only takes 30 seconds.</p>
                <p style="margin:24px 0 0 0;"><a href="${SITE_URL}/doctors/${c.doctorId}#reviews" style="display:inline-block;background:#0E7490;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">Leave a review</a></p>
              </td></tr>
            </table>
          </td></tr></table></body></html>`,
      });
      (c as typeof c & { reviewNudgeSentAt?: string }).reviewNudgeSentAt = new Date().toISOString();
      sent++;
    } catch (err) {
      log.error("cron.review_nudges.send_failed", err, { id: c.id });
    }
  }

  return NextResponse.json({ ok: true, scanned: completed.length, eligible: due.length, sent });
}
