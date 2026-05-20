// Email helpers for the doctor-to-doctor referral flow. Fire-and-forget
// from the /api/referrals/notify route.

import { sendEmail } from "./email";
import {
  BRAND_COLORS,
  emailHeaderHtml,
  emailFooterHtml,
  emailCtaButton,
} from "./email-brand";

const SITE_URL = "https://www.odudoc.com";

function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Brand-aligned shell — emerald-to-teal header + cross icon + standard
// footer. Migrated off bespoke cyan-700 (#0E7490) styling so referral
// emails match consultation / verification / blog emails. See lib/email-brand.ts.
function shell(heading: string, inner: string, ctaLabel?: string, ctaUrl?: string): string {
  const cta = ctaLabel && ctaUrl
    ? `<p style="margin:24px 0 0 0;">${emailCtaButton(escape(ctaLabel), ctaUrl)}</p>`
    : "";
  return `<!doctype html><html><body style="margin:0;padding:32px 16px;background:${BRAND_COLORS.page};font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:${BRAND_COLORS.ink};">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table width="100%" style="max-width:560px;background:${BRAND_COLORS.card};border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);" cellpadding="0" cellspacing="0">
      ${emailHeaderHtml()}
      <tr><td style="padding:28px;">
        <h1 style="margin:0 0 16px 0;font-size:20px;color:${BRAND_COLORS.ink};">${escape(heading)}</h1>
        <div style="font-size:15px;line-height:1.6;color:${BRAND_COLORS.inkMuted};">${inner}</div>
        ${cta}
      </td></tr>
      ${emailFooterHtml()}
    </table>
  </td></tr></table></body></html>`;
}

export interface ReferralPayload {
  patientEmail: string;
  patientName: string;
  fromDoctorName: string;
  fromDoctorEmail: string;
  fromSpecialty: string;
  toDoctorName: string;
  toDoctorEmail?: string;
  toSpecialty: string;
  reason: string;
  clinicalNotes?: string;
  urgency: "routine" | "urgent" | "emergency";
}

export async function sendReferralToReceivingDoctor(r: ReferralPayload) {
  if (!r.toDoctorEmail) return;
  const urgencyChip = r.urgency === "emergency"
    ? `<span style="background:#fee2e2;color:#b91c1c;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:600;text-transform:uppercase;">Emergency</span>`
    : r.urgency === "urgent"
    ? `<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:600;text-transform:uppercase;">Urgent</span>`
    : `<span style="background:#f3f4f6;color:#4b5563;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:600;text-transform:uppercase;">Routine</span>`;

  const summary = `<div style="background:#f9fafb;border-radius:8px;padding:14px 16px;margin:14px 0;">
    <p style="margin:0 0 8px 0;">${urgencyChip}</p>
    <p style="margin:0 0 4px 0;"><b>Patient:</b> ${escape(r.patientName)} &lt;${escape(r.patientEmail)}&gt;</p>
    <p style="margin:0 0 4px 0;"><b>From:</b> ${escape(r.fromDoctorName)} (${escape(r.fromSpecialty)})</p>
    <p style="margin:0 0 8px 0;"><b>Reason:</b> ${escape(r.reason)}</p>
    ${r.clinicalNotes ? `<p style="margin:8px 0 0 0;white-space:pre-wrap;font-size:13px;color:#4b5563;"><b>Notes:</b><br/>${escape(r.clinicalNotes)}</p>` : ""}
  </div>`;

  const body =
    `<p style="margin:0 0 12px 0;">Hello Dr. ${escape(r.toDoctorName)},</p>` +
    `<p style="margin:0 0 12px 0;">${escape(r.fromDoctorName)} has referred a patient to you on OduDoc.</p>` +
    summary +
    `<p style="margin:0 0 12px 0;">Open your referrals inbox to accept, decline, or view the full clinical summary.</p>`;

  await sendEmail({
    from: "notifications",
    to: r.toDoctorEmail,
    subject: `New patient referral from ${r.fromDoctorName} — ${r.urgency.toUpperCase()}`,
    html: shell("You have a new referral", body, "Open inbox", `${SITE_URL}/dashboard/doctor/referrals`),
    replyTo: r.fromDoctorEmail,
  });
}

export async function sendReferralToPatient(r: ReferralPayload) {
  if (!r.patientEmail) return;
  const summary = `<div style="background:#f9fafb;border-radius:8px;padding:14px 16px;margin:14px 0;">
    <p style="margin:0 0 4px 0;"><b>Referred to:</b> ${escape(r.toDoctorName)}</p>
    <p style="margin:0 0 4px 0;"><b>Specialty:</b> ${escape(r.toSpecialty)}</p>
    <p style="margin:0;"><b>Reason:</b> ${escape(r.reason)}</p>
  </div>`;

  const body =
    `<p style="margin:0 0 12px 0;">Hi ${escape(r.patientName)},</p>` +
    `<p style="margin:0 0 12px 0;">Your doctor ${escape(r.fromDoctorName)} has referred you to a specialist for further evaluation.</p>` +
    summary +
    `<p style="margin:0 0 12px 0;">${escape(r.toDoctorName)} will review your case and reach out. You can also view the referral in your dashboard.</p>`;

  await sendEmail({
    from: "notifications",
    to: r.patientEmail,
    subject: `You've been referred to ${r.toDoctorName}`,
    html: shell("Specialist referral", body, "View in dashboard", `${SITE_URL}/dashboard`),
  });
}
