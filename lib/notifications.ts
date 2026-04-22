// Notification system for OduDoc appointment bookings
// Currently logs notifications — in production, integrate with SendGrid (email) and Twilio (SMS)

import { log } from "./log";
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
  // Log for now — in production, integrate with SendGrid/Twilio
  log.info("console.log", { args: [
    `[NOTIFICATION] ${payload.type.toUpperCase()} to ${payload.to}: ${payload.subject || ''} - ${payload.message}`
  ] });

  // Store in memory for admin panel visibility
  addNotificationLog(payload);
  return true;
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
