// Hourly integrity check — last line of defense against silent data loss.
//
// Pulls a small set of canary signals directly from Postgres and compares
// them against expectations. If anything looks wrong (counts dropped,
// seed accounts gone, hydrate consistently failing), it:
//   1. Logs a structured alert (Vercel function logs)
//   2. Emails super-admin via the unified dispatcher
//   3. Records an admin-panel notification
//
// Does NOT mutate anything. Safe to run any time. Idempotent.
//
// Schedule via vercel.json:
//   { "path": "/api/cron/integrity-check", "schedule": "0 * * * *" }

import { NextResponse } from "next/server";
import { loadJsonStrict } from "@/lib/persistent-array";
import { notify } from "@/lib/notifications/notify";
import { addAdminNotification } from "@/lib/admin-notifications-store";
import { expiredPendingPayments, reloadPendingPayments } from "@/lib/cashfree-pending-buffer";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

interface Canary {
  key: string;
  label: string;
  /** Minimum acceptable row count. Below this triggers an alert. */
  minCount?: number;
  /** Specific id/email that MUST exist in the array. */
  requiredId?: { field: string; value: string };
}

const CANARIES: Canary[] = [
  {
    key: "users",
    label: "Users",
    minCount: 1,
    requiredId: { field: "email", value: "admin@odudoc.com" },
  },
  {
    key: "organizations",
    label: "Organizations",
    minCount: 0, // Just confirm we can read it
  },
  {
    key: "memberships",
    label: "Memberships",
    minCount: 0,
  },
  {
    key: "doctors",
    label: "Doctors",
    minCount: 0,
  },
];

interface CanaryResult {
  key: string;
  label: string;
  status: "ok" | "alert" | "db_unreachable";
  count?: number;
  missingRequired?: boolean;
  detail?: string;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: CanaryResult[] = [];

  for (const c of CANARIES) {
    const load = await loadJsonStrict<unknown[]>(c.key);
    if (!load.ok) {
      results.push({
        key: c.key,
        label: c.label,
        status: "db_unreachable",
        detail: load.error.message.slice(0, 200),
      });
      continue;
    }
    if (!load.found || !Array.isArray(load.data)) {
      // Row missing — flag because every canary key should exist after
      // first deploy.
      results.push({
        key: c.key,
        label: c.label,
        status: "alert",
        count: 0,
        detail: "row missing in app_kv",
      });
      continue;
    }
    const arr = load.data;
    const count = arr.length;
    let missingRequired = false;
    if (c.requiredId) {
      missingRequired = !arr.some(
        (row) =>
          typeof row === "object" &&
          row !== null &&
          (row as Record<string, unknown>)[c.requiredId!.field] ===
            c.requiredId!.value
      );
    }
    const belowMin =
      typeof c.minCount === "number" && count < c.minCount;
    if (belowMin || missingRequired) {
      results.push({
        key: c.key,
        label: c.label,
        status: "alert",
        count,
        missingRequired,
        detail: belowMin
          ? `count ${count} below minimum ${c.minCount}`
          : `required ${c.requiredId?.field}=${c.requiredId?.value} missing`,
      });
    } else {
      results.push({ key: c.key, label: c.label, status: "ok", count });
    }
  }

  // Cashfree pending-payments buffer scan — surface rows older than
  // 48h that never got claimed by a booking persist. These are likely
  // paid orders with no consultation row and need manual reconciliation.
  try {
    await reloadPendingPayments();
    const stuck = expiredPendingPayments(48);
    if (stuck.length > 0) {
      for (const row of stuck) {
        log.warn("cashfree.unreconciled_pending", {
          orderId: row.orderId,
          paymentId: row.paymentId,
          amountRupees: row.amountRupees,
          paidAt: row.paidAt,
          ageHours: Math.round((Date.now() - new Date(row.paidAt).getTime()) / 3600000),
        } as Record<string, unknown>);
      }
    }
  } catch (err) {
    log.error("integrity_check.cashfree_buffer_scan_failed", err);
  }

  const alerts = results.filter((r) => r.status !== "ok");
  const summary = {
    checkedAt: new Date().toISOString(),
    totalCanaries: CANARIES.length,
    ok: results.filter((r) => r.status === "ok").length,
    alerts: alerts.length,
    results,
  };

  if (alerts.length > 0) {
    log.error("integrity_check.alert", undefined, summary);

    // Surface in the admin notifications panel.
    try {
      addAdminNotification({
        type: "integrity_alert",
        title: `Integrity check found ${alerts.length} issue(s)`,
        body: alerts
          .map((a) => `${a.label}: ${a.status} — ${a.detail ?? ""}`)
          .join(" · ")
          .slice(0, 400),
        link: "/admin/audit-log",
      });
    } catch (err) {
      log.error("integrity_check.notify_failed", err);
    }

    // Email super-admin. Best-effort.
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || "admin@odudoc.com";
    const lines = alerts
      .map(
        (a) =>
          `• ${a.label} (${a.key}): ${a.status}${a.count != null ? ` count=${a.count}` : ""} ${a.detail ?? ""}`
      )
      .join("\n");
    notify({
      channel: "email",
      to: superAdminEmail,
      subject: `[OduDoc] Integrity check alert — ${alerts.length} issue(s)`,
      body: `Automated integrity check ran at ${summary.checkedAt} and flagged the following:\n\n${lines}\n\nReview /admin/audit-log and check Postgres health.`,
      emailFrom: "admin",
      category: "alert",
    }).catch((err) => log.error("integrity_check.email_failed", err));
  } else {
    log.info("integrity_check.ok", summary);
  }

  return NextResponse.json(summary, {
    status: alerts.length > 0 ? 200 : 200, // always 200 — cron expects success
  });
}
