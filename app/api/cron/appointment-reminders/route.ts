// Daily cron: send 24h-out reminders.
//
// Two passes:
//   1. Consultations (existing flow) — email reminder. Idempotent via the
//      ad-hoc `reminder24hSentAt` field on the consultation record.
//   2. Bookings created by the mobile app — FCM push (and email when the
//      consultation flow hasn't already covered it). Idempotent via
//      `reminderSentAt` on the booking.
//
// Mobile bookings are a separate store from consultations (the latter
// is created at room-creation time, the former at booking time), so we
// scan both. Doing this in one job means the same window logic +
// idempotency window applies to both.

import { NextResponse } from "next/server";
import { listConsultations } from "@/lib/consultations-store";
import {
  getBookingsDueForReminder,
  markBookingReminderSent,
  reloadBookings,
} from "@/lib/bookings-store";
import { sendEmail } from "@/lib/email";
import { sendToUser, sendToEmail } from "@/lib/fcm";
import { notify } from "@/lib/notifications/notify";
import { sendAppointmentReminderViaSentDm } from "@/lib/sent-dm";

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
      // SMS reminder — patients without the mobile app and with cluttered
      // inboxes rely on this. Best-effort; failures don't block the cron.
      if (c.patientPhone) {
        const sms = `OduDoc reminder: video consult with ${c.doctorName} tomorrow at ${c.timeSlot}. Open ${SITE_URL}/dashboard/consultations`;
        notify({ channel: "sms", to: c.patientPhone, body: sms, category: "reminder" })
          .catch((err) => log.warn("cron.appointment_reminders.sms_failed", { id: c.id, err: String(err) }));
        // Best-effort WhatsApp template alongside SMS/email/FCM.
        (async () => {
          try {
            const r = await sendAppointmentReminderViaSentDm(c.patientPhone!, {
              patientName: c.patientName || "there",
              doctorName: c.doctorName || "Doctor",
              date: c.dateLabel,
              time: c.timeSlot,
            });
            if (!r.ok) log.warn("cron.appointment_reminders.wa_template_failed", { error: r.error || "unknown" });
          } catch (err) {
            log.warn("cron.appointment_reminders.wa_template_threw", { error: err instanceof Error ? err.message : "send threw" });
          }
        })();
      }
      // Best-effort FCM push — only fires for users who have logged into
      // the mobile app at least once. Falls back to email-keyed lookup
      // when we don't have a userId on the consultation record.
      try {
        await sendToEmail(c.patientEmail, {
          title: "Consultation tomorrow",
          body: `${c.doctorName} · ${c.dateLabel} at ${c.timeSlot}`,
          deepLink: `consult/${c.id}`,
          channel: "appointments",
        });
      } catch (err) {
        log.warn("cron.appointment_reminders.push_failed", { id: c.id });
      }
    } catch (err) {
      log.error("cron.appointment_reminders.send_failed", err, { id: c.id });
    }
  }

  // ---- Pass 2: mobile bookings ------------------------------------------
  // Cleanly separate from the consultation pass — different store, different
  // idempotency marker. Bookings only get an FCM push (no email): the
  // confirmation email already covers the slot details, and reminders are
  // a "while you're holding your phone" prompt.
  await reloadBookings();
  const bookingsDue = getBookingsDueForReminder(windowStart, windowEnd);
  let bookingsSent = 0;
  for (const b of bookingsDue) {
    if (!b.patientUserId && !b.patientEmail) continue;
    try {
      const payload = {
        title: "Consultation tomorrow",
        body: `${b.doctorName} · ${b.date} at ${b.timeSlot}`,
        deepLink: `consult/${b.id}`,
        channel: "appointments" as const,
      };
      if (b.patientUserId) await sendToUser(b.patientUserId, payload);
      else if (b.patientEmail) await sendToEmail(b.patientEmail, payload);
      markBookingReminderSent(b.id);
      bookingsSent++;
    } catch (err) {
      log.error("cron.appointment_reminders.booking_push_failed", err, { id: b.id });
    }
  }

  return NextResponse.json({
    ok: true,
    consultations: { scanned: all.length, eligible: due.length, sent },
    bookings: { eligible: bookingsDue.length, sent: bookingsSent },
  });
}
