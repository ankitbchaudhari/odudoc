// Notification system for OduDoc appointment bookings.
//
// Historically this module was a no-op stub that logged to memory. Now it
// routes through lib/notifications/notify so appointment confirms /
// cancellations / reminders actually reach users via Twilio + Resend.
// In-memory log is preserved for admin-panel visibility.

import { log } from "./log";
import { notify } from "./notifications/notify";
import { sendWhatsAppTemplate } from "./sms";
export interface NotificationPayload {
  to: string; // email or phone
  type: 'email' | 'sms';
  subject?: string;
  message: string;
}

export interface NotificationLogEntry extends NotificationPayload {
  id: string;
  timestamp: string;
  status: 'sent' | 'failed';
}

const notificationLogs: NotificationLogEntry[] = [];
let nextLogId = 1;

export function addNotificationLog(payload: NotificationPayload, status: 'sent' | 'failed' = 'sent'): void {
  notificationLogs.push({
    ...payload,
    id: `NOTIF-${nextLogId++}`,
    timestamp: new Date().toISOString(),
    status,
  });
}

export function getNotificationLogs(): NotificationLogEntry[] {
  return [...notificationLogs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export async function sendNotification(payload: NotificationPayload): Promise<boolean> {
  // Route through the unified dispatcher so email goes via Resend and
  // SMS goes via Twilio. WhatsApp is selected by callers that want it
  // explicitly; this legacy entry only handles email + sms because that
  // matches the existing call sites' payload shape.
  let status: "sent" | "failed" = "sent";
  try {
    const result = await notify({
      channel: payload.type === "email" ? "email" : "sms",
      to: payload.to,
      subject: payload.subject,
      body: payload.message,
      category: "appointment",
    });
    if (!result.ok && !result.skipped) {
      status = "failed";
      log.warn("notifications.dispatch_failed", {
        type: payload.type,
        to: payload.to,
        error: result.error,
      });
    } else {
      log.info("notifications.dispatch_sent", {
        type: payload.type,
        to: payload.to,
        providerId: result.providerId,
        skipped: result.skipped,
      });
    }
  } catch (err) {
    status = "failed";
    log.error("notifications.dispatch_threw", err);
  }
  addNotificationLog(payload, status);
  return status === "sent";
}

export function notifyAppointmentBooked(details: {
  patientName: string;
  patientEmail: string;
  patientPhone?: string;
  doctorName: string;
  doctorEmail: string;
  doctorPhone?: string;
  date: string;
  time: string;
  type: 'video' | 'in-person';
}) {
  // Notify patient
  sendNotification({
    to: details.patientEmail,
    type: 'email',
    subject: 'Appointment Confirmed - OduDoc',
    message: `Dear ${details.patientName}, your ${details.type} appointment with ${details.doctorName} is confirmed for ${details.date} at ${details.time}. ${details.type === 'video' ? 'A video link will be sent before your appointment.' : 'Please arrive 15 minutes early.'} - OduDoc Team`,
  });

  if (details.patientPhone) {
    // Try the approved WhatsApp template first — it works any time
    // (no 24h reply-window restriction) and renders as a richer
    // notification on the patient's phone. ContentSid lives in env
    // so we can swap templates without code changes.
    //
    // Template body (en):
    //   "Hello {{1}}, your appointment with {{2}} is confirmed for
    //    {{3}}. Reply CANCEL to cancel. — OduDoc"
    const waContentSid = process.env.TWILIO_WA_TEMPLATE_APPOINTMENT_CONFIRM;
    const sentDmTemplate = process.env.SENTDM_TEMPLATE_APPOINTMENT_CONFIRM;
    // sendWhatsAppTemplate tries sent.dm first (when sentDmTemplate
    // is set + SENTDM_API_KEY is configured), falling back to Twilio.
    if (waContentSid || sentDmTemplate) {
      sendWhatsAppTemplate(details.patientPhone, waContentSid, {
        // Twilio positional placeholders (ContentSid path).
        "1": details.patientName,
        "2": details.doctorName,
        "3": details.date,
        "4": details.time,
        // sent.dm template uses {{var_1}}..{{var_4}} per the imported
        // appointment_confirm body. Friendly aliases included for
        // forward-compat with templates that use named slots.
        var_1: details.patientName,
        var_2: details.doctorName,
        var_3: details.date,
        var_4: details.time,
        patient_name: details.patientName,
        doctor_name: details.doctorName,
        date: details.date,
        time: details.time,
      }, { sentDmTemplate })
        .then((r) => {
          if (!r.ok) {
            log.warn("notifications.wa_template_failed", {
              error: r.error,
              fallback: "sms",
            });
          } else {
            log.info("notifications.wa_template_sent", { sid: r.sid });
          }
        })
        .catch((e) => log.error("notifications.wa_template_threw", e));
    }
    // Always send SMS too — defence-in-depth in case the patient's
    // WhatsApp isn't installed / the number isn't verified on WA.
    sendNotification({
      to: details.patientPhone,
      type: 'sms',
      message: `OduDoc: Appointment confirmed with ${details.doctorName} on ${details.date} at ${details.time}.`,
    });
  }

  // Notify doctor
  sendNotification({
    to: details.doctorEmail,
    type: 'email',
    subject: 'New Appointment - OduDoc',
    message: `Dr. ${details.doctorName}, you have a new ${details.type} appointment with ${details.patientName} on ${details.date} at ${details.time}. Please check your dashboard for details. - OduDoc Team`,
  });

  if (details.doctorPhone) {
    sendNotification({
      to: details.doctorPhone,
      type: 'sms',
      message: `OduDoc: New appointment with ${details.patientName} on ${details.date} at ${details.time}.`,
    });
  }
}

export function notifyAppointmentCancelled(details: {
  patientName: string;
  patientEmail: string;
  patientPhone?: string;
  doctorName: string;
  doctorEmail: string;
  doctorPhone?: string;
  date: string;
  time: string;
  reason?: string;
}) {
  const reasonText = details.reason ? ` Reason: ${details.reason}.` : '';

  // Notify patient
  sendNotification({
    to: details.patientEmail,
    type: 'email',
    subject: 'Appointment Cancelled - OduDoc',
    message: `Dear ${details.patientName}, your appointment with ${details.doctorName} on ${details.date} at ${details.time} has been cancelled.${reasonText} If you need to reschedule, please visit your dashboard. - OduDoc Team`,
  });

  if (details.patientPhone) {
    sendNotification({
      to: details.patientPhone,
      type: 'sms',
      message: `OduDoc: Your appointment with ${details.doctorName} on ${details.date} at ${details.time} has been cancelled.${reasonText}`,
    });
  }

  // Notify doctor
  sendNotification({
    to: details.doctorEmail,
    type: 'email',
    subject: 'Appointment Cancelled - OduDoc',
    message: `Dr. ${details.doctorName}, the appointment with ${details.patientName} on ${details.date} at ${details.time} has been cancelled.${reasonText} - OduDoc Team`,
  });

  if (details.doctorPhone) {
    sendNotification({
      to: details.doctorPhone,
      type: 'sms',
      message: `OduDoc: Appointment with ${details.patientName} on ${details.date} at ${details.time} cancelled.${reasonText}`,
    });
  }
}

export function notifyAppointmentReminder(details: {
  patientName: string;
  patientEmail: string;
  patientPhone?: string;
  doctorName: string;
  doctorEmail: string;
  doctorPhone?: string;
  date: string;
  time: string;
  type: 'video' | 'in-person';
}) {
  // Remind patient
  sendNotification({
    to: details.patientEmail,
    type: 'email',
    subject: 'Appointment Reminder - OduDoc',
    message: `Dear ${details.patientName}, this is a reminder for your ${details.type} appointment with ${details.doctorName} on ${details.date} at ${details.time}. ${details.type === 'video' ? 'Please ensure you have a stable internet connection.' : 'Please arrive 15 minutes early.'} - OduDoc Team`,
  });

  if (details.patientPhone) {
    sendNotification({
      to: details.patientPhone,
      type: 'sms',
      message: `OduDoc Reminder: ${details.type} appointment with ${details.doctorName} on ${details.date} at ${details.time}.`,
    });
  }

  // Remind doctor
  sendNotification({
    to: details.doctorEmail,
    type: 'email',
    subject: 'Appointment Reminder - OduDoc',
    message: `Dr. ${details.doctorName}, reminder: you have a ${details.type} appointment with ${details.patientName} on ${details.date} at ${details.time}. - OduDoc Team`,
  });

  if (details.doctorPhone) {
    sendNotification({
      to: details.doctorPhone,
      type: 'sms',
      message: `OduDoc Reminder: Appointment with ${details.patientName} on ${details.date} at ${details.time}.`,
    });
  }
}
