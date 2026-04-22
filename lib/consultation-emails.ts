// Email helpers for the video consultation lifecycle. Kept separate from
// lib/email.ts so the core sender + shell renderer stay lean.
//
// Each helper builds a small HTML body and delegates to sendEmail(). Sends
// are fire-and-forget from the API layer — never block a request on them.

import { sendEmail } from "./email";
import type { Consultation } from "./consultations-store";

const SITE_URL = "https://www.odudoc.com";

function line(text: string): string {
  return `<p style="margin:0 0 12px 0;">${escape(text)}</p>`;
}
function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function shell(heading: string, innerHtml: string, ctaLabel?: string, ctaUrl?: string): string {
  const cta = ctaLabel && ctaUrl
    ? `<p style="margin:24px 0 0 0;"><a href="${ctaUrl}" style="display:inline-block;background:#0E7490;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">${escape(ctaLabel)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;padding:32px 16px;background:#f3f4f6;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table width="100%" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);" cellpadding="0" cellspacing="0">
      <tr><td style="background:#0E7490;padding:18px 24px;"><a href="${SITE_URL}" style="color:#fff;text-decoration:none;font-weight:700;font-size:18px;">OduDoc</a></td></tr>
      <tr><td style="padding:28px;">
        <h1 style="margin:0 0 16px 0;font-size:20px;color:#111827;">${escape(heading)}</h1>
        <div style="font-size:15px;line-height:1.6;color:#374151;">${innerHtml}</div>
        ${cta}
      </td></tr>
      <tr><td style="background:#f9fafb;padding:16px 28px;font-size:12px;color:#6b7280;">OduDoc — Your health, our priority.</td></tr>
    </table>
  </td></tr></table></body></html>`;
}

function summaryBlock(c: Consultation): string {
  return `<div style="background:#f9fafb;border-radius:8px;padding:12px 16px;margin:12px 0;">
    <p style="margin:0 0 4px 0;"><b>Doctor:</b> ${escape(c.doctorName)} — ${escape(c.specialty)}</p>
    <p style="margin:0 0 4px 0;"><b>When:</b> ${escape(c.dateLabel)} at ${escape(c.timeSlot)}</p>
    <p style="margin:0;"><b>Booking ID:</b> ${escape(c.id)}</p>
  </div>`;
}

// ---------- Sent to PATIENT after successful booking + payment ----------

export async function sendPatientBookingReceived(c: Consultation) {
  if (!c.patientEmail) return;
  const body =
    line(`Hi ${c.patientName},`) +
    line(`Your video consultation request has been received and payment of $${c.fee} was successful.`) +
    summaryBlock(c) +
    line(`The doctor will review your request and confirm shortly. You'll get another email once they respond.`);
  await sendEmail({
    from: "notifications",
    to: c.patientEmail,
    subject: `We got your consultation request — ${c.doctorName}`,
    html: shell("Consultation request received", body, "View booking", `${SITE_URL}/dashboard/consultations`),
  });
}

// ---------- Sent to DOCTOR when a new consult needs their approval ----------

export async function sendDoctorNewRequest(c: Consultation) {
  if (!c.doctorEmail) return;
  const body =
    line(`Hello ${c.doctorName},`) +
    line(`You have a new video consultation request from ${c.patientName}.`) +
    summaryBlock(c) +
    line(`Please review the patient's medical history and approve, reject or reschedule.`);
  await sendEmail({
    from: "notifications",
    to: c.doctorEmail,
    subject: `New consultation request — ${c.patientName}`,
    html: shell("New consultation request", body, "Review request", `${SITE_URL}/dashboard/doctor/consultations/${c.id}`),
  });
}

// ---------- Doctor decision notifications ----------

export async function sendPatientApproved(c: Consultation) {
  if (!c.patientEmail) return;
  const body =
    line(`Hi ${c.patientName},`) +
    line(`Good news — ${c.doctorName} has confirmed your consultation.`) +
    summaryBlock(c) +
    line(`You can join the video room from your dashboard at the scheduled time.`);
  await sendEmail({
    from: "notifications",
    to: c.patientEmail,
    subject: `Consultation confirmed — ${c.doctorName}`,
    html: shell("Your consultation is confirmed", body, "Open dashboard", `${SITE_URL}/dashboard/consultations`),
  });
}

export async function sendPatientRejected(c: Consultation, reason?: string) {
  if (!c.patientEmail) return;
  const body =
    line(`Hi ${c.patientName},`) +
    line(`We're sorry — ${c.doctorName} is unable to take your consultation at the requested time.`) +
    (reason ? line(`Reason: ${reason}`) : "") +
    line(`A full refund of $${c.fee} has been issued. It should appear on your statement within 5–7 business days.`) +
    summaryBlock(c) +
    line(`You can rebook with another doctor from your dashboard.`);
  await sendEmail({
    from: "notifications",
    to: c.patientEmail,
    subject: `Consultation cancelled + refund issued`,
    html: shell("Consultation cancelled — refund issued", body, "Book another", `${SITE_URL}/consult/book`),
  });
}

export async function sendPatientRescheduled(c: Consultation, oldSlot: string) {
  if (!c.patientEmail) return;
  const body =
    line(`Hi ${c.patientName},`) +
    line(`${c.doctorName} has rescheduled your consultation from ${oldSlot} to the new time below.`) +
    summaryBlock(c) +
    line(`If this new time doesn't work for you, reply to this email or cancel from your dashboard for a full refund.`);
  await sendEmail({
    from: "notifications",
    to: c.patientEmail,
    subject: `Consultation rescheduled — ${c.doctorName}`,
    html: shell("Your consultation was rescheduled", body, "View booking", `${SITE_URL}/dashboard/consultations`),
  });
}

// ---------- Prescription delivery ----------

export async function sendPrescriptionToPatient(opts: {
  to: string;
  patientName: string;
  doctorName: string;
  prescriptionId: string;
  medicationsHtml: string; // inline HTML table of meds
  buyUrl: string;
  viewUrl: string;
}) {
  if (!opts.to) return;
  const body =
    line(`Hi ${opts.patientName},`) +
    line(`${opts.doctorName} has issued a prescription from your consultation. Here are the details:`) +
    opts.medicationsHtml +
    line(`You can buy these medicines directly from OduDoc with one click, or take the printable PDF to any pharmacy.`);
  await sendEmail({
    from: "notifications",
    to: opts.to,
    subject: `Your prescription from ${opts.doctorName}`,
    html: shell(
      "Your prescription is ready",
      body,
      "View & download PDF",
      opts.viewUrl,
    ) + `<div style="text-align:center;margin-top:12px;"><a href="${opts.buyUrl}">Buy medicines online →</a></div>`,
  });
}
