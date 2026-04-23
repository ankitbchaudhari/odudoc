// Vendor onboarding: provision a vendor login (User record with role=vendor)
// and deliver a welcome email carrying a 7-day temporary password.
//
// Called from two admin entry points:
//   1. Manual "Add Vendor"               (/api/admin/vendors POST, when autoApprove=true)
//   2. Approving a vendor application    (/api/vendors/[id]/status POST, status=approved)
//
// Idempotent: if a User already exists for the email we reset their password
// via the same temp-password flow so admins can always re-issue credentials.
// Mirrors lib/doctor-invite.ts.

import {
  createUser,
  findUserByEmail,
  issueTempPassword,
  markEmailVerified,
} from "./users-store";
import { sendVendorWelcomeEmail } from "./email";
import { log } from "./log";

export interface InviteVendorInput {
  ownerName: string;
  ownerEmail: string;
  vendorName?: string; // store / pharmacy display name
  phone?: string;
}

export interface InviteVendorResult {
  userId: string;
  tempPassword: string;
  expiresAt: string;
  emailSent: boolean;
  reused: boolean;
}

export async function inviteVendor(
  input: InviteVendorInput
): Promise<InviteVendorResult | null> {
  const email = input.ownerEmail.trim().toLowerCase();
  const name = input.ownerName.trim() || "Vendor";
  const phone = (input.phone || "").trim();
  if (!email) return null;

  let existing = findUserByEmail(email);
  let reused = false;

  if (!existing) {
    existing = createUser({
      name,
      email,
      phone,
      // Placeholder — immediately overwritten by issueTempPassword below.
      password: `placeholder-${Math.random().toString(36).slice(2)}-${Date.now()}`,
      role: "vendor",
    });
  } else {
    reused = true;
    // Don't downgrade an admin, but promote a patient → vendor so the
    // middleware redirect sends them to the vendor dashboard.
    if (existing.role !== "vendor" && existing.role !== "admin") {
      existing.role = "vendor";
    }
  }

  const issued = issueTempPassword(existing.id, 7);
  if (!issued) return null;

  // Admin-driven invite — the welcome email itself is proof-of-ownership,
  // so skip the self-signup verification step.
  markEmailVerified(email);

  let emailSent = false;
  try {
    const res = await sendVendorWelcomeEmail({
      to: email,
      name,
      vendorName: input.vendorName,
      tempPassword: issued.tempPassword,
      expiresAt: issued.expiresAt,
    });
    emailSent = Boolean(res?.ok);
  } catch (err) {
    log.error("vendor_invite.email_failed", err);
  }

  return {
    userId: existing.id,
    tempPassword: issued.tempPassword,
    expiresAt: issued.expiresAt,
    emailSent,
    reused,
  };
}
