// Patient health timeline aggregator.
//
// Pulls events from every patient-facing store and merges them into
// a single chronological feed. Each store is wrapped in try/catch so
// a transient failure (or a store that isn't shipped on this build)
// degrades gracefully rather than blanking the whole timeline.
//
// Identity: appointments and prescriptions are keyed on email; the
// wallet, notifications, and lab orders use userId. We accept both
// from the session and filter accordingly.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listAppointments, reloadAppointments } from "@/lib/appointments-store";
import { listPrescriptions, reloadPrescriptions } from "@/lib/prescriptions-store";
import { listOrdersForPatient, reloadLabOrders } from "@/lib/lab-marketplace/order-store";
import { listTransactionsForUser } from "@/lib/wallet/store";
import { listForUser } from "@/lib/notifications/store";
import { listReadings, classify, VITAL_LABEL } from "@/lib/vitals/store";
import { listOrdersForPatient as listRxOrdersForPatient, reloadFulfillmentOrders } from "@/lib/rx-fulfillment/order-store";
import { listSymptoms } from "@/lib/symptoms/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type TimelineKind =
  | "appointment" | "prescription" | "lab_order" | "rx_order" | "wallet" | "notification" | "vital" | "symptom";

export interface TimelineEvent {
  id: string;
  kind: TimelineKind;
  at: string;             // ISO timestamp — sort key
  title: string;
  body?: string;
  meta?: Record<string, string | number | undefined>;
  href?: string;
  /** Visual severity, mostly for color-coding rails. */
  tone?: "neutral" | "ok" | "warn" | "critical";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const email = session?.user?.email?.toLowerCase();
  if (!userId && !email) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const events: TimelineEvent[] = [];

  // Appointments — keyed on email.
  if (email) {
    try {
      await reloadAppointments();
      const all = listAppointments();
      for (const a of all) {
        if ((a.patientEmail || "").toLowerCase() !== email) continue;
        events.push({
          id: `appt:${a.id}`,
          kind: "appointment",
          at: a.updatedAt || a.createdAt,
          title: `${a.status} appointment with ${a.doctorName}`,
          body: `${a.date} · ${a.time}${a.notes ? ` — ${a.notes}` : ""}`,
          tone: a.status === "Cancelled" ? "warn"
              : a.status === "Completed" ? "ok"
              : a.status === "Confirmed" ? "ok" : "neutral",
          href: "/dashboard/consultations",
          meta: { status: a.status, date: a.date, time: a.time },
        });
      }
    } catch { /* store may be empty / down — skip */ }
  }

  // Prescriptions — keyed on email.
  if (email) {
    try {
      await reloadPrescriptions();
      const rxs = listPrescriptions({ patientEmail: email });
      for (const rx of rxs) {
        events.push({
          id: `rx:${rx.id}`,
          kind: "prescription",
          at: rx.createdAt,
          title: `Prescription ${rx.status === "cancelled" ? "cancelled" : "issued"}`,
          body: `From ${rx.doctorEmail}${rx.data?.medications?.length ? ` · ${rx.data.medications.length} med${rx.data.medications.length === 1 ? "" : "s"}` : ""}`,
          tone: rx.status === "cancelled" ? "warn" : "ok",
          href: "/dashboard/prescriptions",
          meta: { templateId: rx.templateId, status: rx.status },
        });
      }
    } catch { /* skip */ }
  }

  // Lab orders — keyed on userId. Each transition is its own event so
  // the timeline reflects movement (placed → reported), not a single
  // collapsed row.
  if (userId) {
    try {
      await reloadLabOrders();
      const orders = listOrdersForPatient(userId);
      for (const o of orders) {
        for (const ev of o.events) {
          events.push({
            id: `lab:${o.id}:${ev.status}:${ev.at}`,
            kind: "lab_order",
            at: ev.at,
            title: `Lab — ${ev.status.replace(/_/g, " ")}`,
            body: `${o.labName} · ${o.lines.length} test${o.lines.length === 1 ? "" : "s"}${ev.note ? ` — ${ev.note}` : ""}`,
            tone: ev.status === "cancelled" ? "warn"
                : ev.status === "reported" ? "ok"
                : "neutral",
            href: ev.status === "reported" && o.reportUrl ? o.reportUrl : "/dashboard/labs",
            meta: { orderId: o.id, status: ev.status },
          });
        }
      }
    } catch { /* skip */ }
  }

  // Wallet — keyed on userId. Top-ups, spends, refunds.
  if (userId) {
    try {
      const txs = listTransactionsForUser(userId, 50);
      for (const t of txs) {
        const isCredit = t.kind === "topup" || t.kind === "bonus" || t.kind === "refund";
        events.push({
          id: `wallet:${t.id}`,
          kind: "wallet",
          at: t.createdAt,
          title: `${isCredit ? "+" : "−"}₹${t.amountRupees.toLocaleString("en-IN")} · ${t.kind}`,
          body: t.note || (t.category ? t.category.replace(/_/g, " ") : ""),
          tone: t.kind === "refund" ? "ok" : "neutral",
          href: "/dashboard/wallet",
          meta: { kind: t.kind, balanceAfter: t.balanceAfter },
        });
      }
    } catch { /* skip */ }
  }

  // Notifications — already user-scoped. Useful for system / abha /
  // billing events that don't have a richer source store.
  if (userId) {
    try {
      const notifs = listForUser(userId, { limit: 50 });
      for (const n of notifs) {
        events.push({
          id: `notif:${n.id}`,
          kind: "notification",
          at: n.createdAt,
          title: n.title,
          body: n.body,
          tone: n.severity === "critical" ? "critical"
              : n.severity === "warn" ? "warn"
              : n.severity === "success" ? "ok" : "neutral",
          href: n.link,
          meta: { kind: n.kind, severity: n.severity },
        });
      }
    } catch { /* skip */ }
  }

  // Pharmacy fulfillment orders — userId-keyed, one row per status transition.
  if (userId) {
    try {
      await reloadFulfillmentOrders();
      const orders = listRxOrdersForPatient(userId);
      for (const o of orders) {
        for (const ev of o.events) {
          events.push({
            id: `rxorder:${o.id}:${ev.status}:${ev.at}`,
            kind: "rx_order",
            at: ev.at,
            title: `Pharmacy — ${ev.status.replace(/_/g, " ")}`,
            body: `${o.pharmacyName} · ${o.lines.length} item${o.lines.length === 1 ? "" : "s"}${ev.note ? ` — ${ev.note}` : ""}`,
            tone: ev.status === "cancelled" || ev.status === "rejected" ? "warn"
                : ev.status === "delivered" ? "ok"
                : "neutral",
            href: "/dashboard/rx-fulfillment",
            meta: { orderId: o.id, status: ev.status },
          });
        }
      }
    } catch { /* skip */ }
  }

  // Vital sign readings — userId-keyed.
  if (userId) {
    try {
      const vitals = listReadings(userId, { limit: 50 });
      for (const v of vitals) {
        const sev = classify(v);
        events.push({
          id: `vital:${v.id}`,
          kind: "vital",
          at: v.takenAt,
          title: `${VITAL_LABEL[v.kind]}: ${v.kind === "bp" ? `${v.value}/${v.value2 ?? "?"}` : v.value} ${v.unit}`,
          body: [v.context?.replace(/_/g, " "), v.note].filter(Boolean).join(" · ") || undefined,
          tone: sev === "critical" ? "critical" : sev === "warn" ? "warn" : "ok",
          href: "/dashboard/vitals",
          meta: { kind: v.kind },
        });
      }
    } catch { /* skip */ }
  }

  // Symptom log entries — userId-keyed.
  if (userId) {
    try {
      const syms = listSymptoms(userId, { limit: 50 });
      for (const s of syms) {
        const sev = s.severity;
        events.push({
          id: `symptom:${s.id}`,
          kind: "symptom",
          at: s.takenAt,
          title: `${s.symptom} (${sev}/10)`,
          body: [s.bodyArea, s.trigger ? `trigger: ${s.trigger}` : null, s.notes].filter(Boolean).join(" · ") || undefined,
          tone: sev >= 8 ? "critical" : sev >= 5 ? "warn" : sev >= 1 ? "neutral" : "ok",
          href: "/dashboard/symptoms",
          meta: { severity: sev },
        });
      }
    } catch { /* skip */ }
  }

  events.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));

  return NextResponse.json({ events: events.slice(0, 200) });
}
