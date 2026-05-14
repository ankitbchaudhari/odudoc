// Daily cron: WhatsApp nudge for patients with an active care plan.
//
// One outbound per active plan per day. The template is intentionally
// gentle — "here's today's focus" rather than "did you do X?" — so
// the patient isn't shamed when they skip a day. Skipped silently
// when the template isn't configured.

import { NextResponse } from "next/server";
import { CONDITION_LABEL, type CarePlan } from "@/lib/care-plan/store";
import { findUserById } from "@/lib/users-store";
import { sendCarePlanReminderViaSentDm } from "@/lib/sent-dm";
import { loadJson } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = req.headers.get("authorization") || "";
  return header === `Bearer ${secret}`;
}

function capitalise(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Read directly from app_kv to avoid forcing the cron lambda to
  // import the full care-plan store module (which has its own hydrate
  // path). loadJson is a safe read-only snapshot.
  const all = await loadJson<CarePlan[]>("care_plans", []);
  const active = all.filter((p) => p && p.active);

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const errors: Array<{ planId: string; error: string }> = [];

  for (const plan of active) {
    try {
      const user = findUserById(plan.userId);
      const phone = user?.phone;
      if (!phone) {
        skipped++;
        continue;
      }
      const firstGoal = (plan.goals || []).find((g) => g && g.trim().length > 0);
      if (!firstGoal) {
        skipped++;
        continue;
      }
      const conditionLabel = CONDITION_LABEL[plan.condition] || capitalise(String(plan.condition || "your condition"));
      const patientName = (user.name || "").trim().split(/\s+/)[0] || "there";

      const r = await sendCarePlanReminderViaSentDm(phone, {
        patientName,
        condition: conditionLabel,
        todayAction: firstGoal,
      });
      if (r.ok) {
        if (!r.skipped) sent++;
        else skipped++;
      } else {
        failed++;
        errors.push({ planId: plan.id, error: r.error || "unknown" });
        log.warn("cron.care_plan_reminder.send_failed", {
          planId: plan.id,
          error: r.error || "unknown",
        });
      }
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : "threw";
      errors.push({ planId: plan.id, error: msg });
      log.error("cron.care_plan_reminder.threw", err, { planId: plan.id });
    }
  }

  return NextResponse.json({
    ok: true,
    candidates: active.length,
    sent,
    skipped,
    failed,
    errors,
  });
}
