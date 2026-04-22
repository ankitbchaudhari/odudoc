// Cron endpoint: retry every queued/failed notification older than 1 minute.
// Intended to be hit by Vercel Cron every 5 minutes. Auth via CRON_SECRET
// header — Vercel sets this automatically on cron-triggered requests.
//
// Configure in vercel.json:
//   { "crons": [{ "path": "/api/cron/notifications-dispatch", "schedule": "*/5 * * * *" }] }

import { NextRequest, NextResponse } from "next/server";
import { retryNotification } from "@/lib/hospital/notifications-store";
import { listOrganizations } from "@/lib/organizations-store";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_RETRIES_PER_NOTIF = 3;
const STALE_MS = 60_000;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const expected = secret ? `Bearer ${secret}` : null;
  if (expected && authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { listNotifications } = await import("@/lib/hospital/notifications-store");
  const orgs = listOrganizations();
  const now = Date.now();
  let tried = 0;
  let succeeded = 0;

  for (const org of orgs) {
    const queued = listNotifications({ organizationId: org.id, status: "queued" });
    const failed = listNotifications({ organizationId: org.id, status: "failed" });
    const candidates = [...queued, ...failed].filter((n) => {
      if ((n.attemptCount ?? 0) >= MAX_RETRIES_PER_NOTIF) return false;
      const age = now - new Date(n.updatedAt).getTime();
      return age >= STALE_MS;
    });
    for (const n of candidates) {
      tried++;
      try {
        const r = await retryNotification(n.id, org.id);
        if (r?.status === "sent" || r?.status === "delivered") succeeded++;
      } catch (e) {
        log.error("cron.notifications.retry_threw", e, { id: n.id, orgId: org.id });
      }
    }
  }

  log.info("cron.notifications.dispatch", { orgs: orgs.length, tried, succeeded });
  return NextResponse.json({ ok: true, orgs: orgs.length, tried, succeeded });
}
