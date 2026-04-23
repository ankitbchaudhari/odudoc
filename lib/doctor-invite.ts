// Doctor onboarding: provision a doctor login (User record with role=doctor)
// and deliver a welcome email + SMS carrying a 7-day temporary password.
//
// Called from three admin entry points:
//   1. Manual "Add New Doctor"          (/api/admin/doctors POST)
//   2. Approving a doctor application   (/api/admin/doctor-applications PATCH)
//   3. Hiring a candidate from careers  (/api/careers/applications PATCH)
//
// Idempotent: if a User already exists for the email we reset their password
// via the same temp-password flow so admins can always re-issue credentials.

import { createUser, findUserByEmail, issueTempPassword, markEmailVerified } from "./users-store";
import { sendDoctorWelcomeEmail } from "./email";
import { log } from "./log";

export interface InviteDoctorInput {
  name: string;
  email: string;
  phone?: string;
}

export interface InviteDoctorResult {
  userId: string;
  tempPassword: string;
  expiresAt: string;
  emailSent: boolean;
  // Retained for API compatibility with existing callers; always false now
  // that we've dropped SMS delivery for the doctor welcome flow.
  smsSent: boolean;
  reused: boolean; // true when we updated an existing User instead of creating
}

export async function inviteDoctor(
  input: InviteDoctorInput,
): Promise<InviteDoctorResult | null> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim() || "Doctor";
  const phone = (input.phone || "").trim();
  if (!email) return null;

  let existing = findUserByEmail(email);
  let reused = false;

  if (!existing) {
    // Fresh login — the temp password below will immediately overwrite this
    // placeholder via issueTempPassword, but createUser needs a non-empty
    // string to hash.
    existing = createUser({
      name,
      email,
      phone,
      password: `placeholder-${Math.random().toString(36).slice(2)}-${Date.now()}`,
      role: "doctor",
    });
  } else {
    reused = true;
    // Ensure the role is doctor even if the email previously belonged to a
    // patient account — admins hiring a candidate expect a doctor login.
    if (existing.role !== "doctor" && existing.role !== "admin") {
      existing.role = "doctor";
    }
  }

  const issued = issueTempPassword(existing.id, 7);
  if (!issued) return null;

  // Admin-driven invite: the welcome email we're about to send is itself
  // the email-verification proof. Skip the self-signup verify link step
  // so the doctor can sign in immediately with the temp password.
  markEmailVerified(email);

  // Best-effort notification. Failures are logged but never block the admin
  // action that triggered this invite. We intentionally deliver ONLY via
  // email — the welcome SMS was dropped (Twilio trial prefix was exposing
  // "Sent from your Twilio trial account" to end users and SMS for temp
  // passwords is redundant when the same info is in the email anyway).
  let emailSent = false;

  try {
    const res = await sendDoctorWelcomeEmail({
      to: email,
      name,
      tempPassword: issued.tempPassword,
      expiresAt: issued.expiresAt,
    });
    emailSent = Boolean(res?.ok);
  } catch (err) {
    log.error("doctor_invite.email_failed", err);
  }

  return {
    userId: existing.id,
    tempPassword: issued.tempPassword,
    expiresAt: issued.expiresAt,
    emailSent,
    smsSent: false,
    reused,
  };
}
