// GET /api/cron/followup-reminder
//
// Fires the odudoc_followup_reminder WhatsApp template to patients
// whose last consultation was ~14 days ago. The pattern follows
// chronic-care best practice: a gentle "How are you feeling now? Book
// a follow-up to check progress" nudge two weeks after the original
// visit catches medication non-adherence and conditions that didn't
// resolve.
//
// Idempotency: cron runs once daily and we look at a ±12h window
// around 14 days post-consult. Each consultation matches at most one
// cron run, so we don't track a per-consultation "reminder sent"
// flag — the window collision rate is effectively zero.
//
// Scheduled via vercel.json: "0 10 * * *" (10:00 UTC daily, ~3:30 PM IST).

import { NextResponse } from "next/server";
import { listConsultations } from "@/lib/consultations-store";
import { sendFollowupReminderViaSentDm } from "@/lib/sent-dm";
import { log } from "@/lib/log";

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

  // Window: 14 days ago ± 12h. Captures every approved consult that
  // happened in roughly the last cron-run's worth of "two weeks ago".
  const now = Date.now();
  const windowStart = now - 14.5 * 24 * 3600 * 1000;
  const windowEnd = now - 13.5 * 24 * 3600 * 1000;

  const all = listConsultations({});
  const candidates = all.filter((c) => {
    if (c.status !== "approved") return false;
    if (!c.patientPhone) return false;
    const t = new Date(c.scheduledFor).getTime();
    if (!Number.isFinite(t)) return false;
    return t >= windowStart && t <= windowEnd;
  });

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const c of candidates) {
    try {
      const daysAgo = Math.round((now - new Date(c.scheduledFor).getTime()) / (24 * 3600 * 1000));
      const r = await sendFollowupReminderViaSentDm(c.patientPhone!, {
        patientName: c.patientName || "there",
        timeElapsed: `${daysAgo} days`,
        doctorName: c.doctorName || "your doctor",
      });
      if (r.ok) {
        sent++;
      } else {
        failed++;
        if (errors.length < 5) errors.push(r.error || "unknown");
        log.warn("cron.followup.wa_template_failed", {
          error: r.error || "unknown",
          consultationId: c.id,
        });
      }
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : "send threw";
      if (errors.length < 5) errors.push(msg);
      log.warn("cron.followup.wa_template_threw", { error: msg, consultationId: c.id });
    }
  }

  log.info("cron.followup.completed", {
    candidates: candidates.length,
    sent,
    failed,
  });

  return NextResponse.json({
    ok: true,
    candidates: candidates.length,
    sent,
    failed,
    errors,
  });
}
