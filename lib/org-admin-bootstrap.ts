// Org-admin bootstrap.
//
// When a super-admin onboards a new organization through
// POST /api/organizations, we want the operator to do *one* thing
// (fill the form), not three (fill the form, then create a user,
// then send credentials manually). This helper does the rest:
//
//   1. Look up — or create — a User row keyed by the org's contact
//      email. New users get role: "admin" so the existing /admin
//      console gates work without changes.
//   2. Issue a 12-char temporary password with a strict 3-day TTL,
//      stored hashed via the existing issueTempPassword() helper. The
//      auth handler in lib/auth.ts already enforces the expiry.
//   3. Create an "owner" Membership linking the user to the new org so
//      tenant resolution works on first login.
//   4. Email the credentials using sendOrgAdminWelcomeEmail (corporate
//      branded, points at /corporate/login).
//   5. SMS the credentials when a phone number is on file. Fire-and-
//      forget; we don't want a dead Twilio creds env to block org
//      creation.
//
// Email and SMS dispatch are best-effort: if the SMTP/Twilio creds
// aren't configured (typical for staging), we still return success
// with a `delivery` summary so the super-admin sees what happened.
// The temp password is included in the return value so the operator
// can copy it to the org if delivery fails.

import {
  createUser,
  findUserByEmail,
  issueTempPassword,
  adminSetUserRoleByEmail,
} from "./users-store";
import { createMembership } from "./memberships-store";
import { sendOrgAdminWelcomeEmail } from "./email";
import { sendSms } from "./sms";

export interface BootstrappedOrgAdmin {
  userId: string;
  email: string;
  /** Plaintext only — surfaced once to the super-admin and never stored. */
  tempPassword: string;
  /** ISO timestamp when the temp password expires (3 days from now). */
  expiresAt: string;
  /** True when a brand-new User row was created. False if the email
   *  already had an account and we just attached an admin role + temp
   *  password to it. */
  userCreated: boolean;
  delivery: {
    email: { sent: boolean; reason?: string };
    sms: { sent: boolean; reason?: string };
  };
}

interface BootstrapInput {
  orgId: string;
  orgName: string;
  contactEmail: string;
  contactPhone?: string;
  /** Country code from the org form. Used to seed the user's country
   *  so consultation eligibility / pricing know which jurisdiction the
   *  admin operates in. */
  country?: string;
}

const TEMP_PASSWORD_TTL_DAYS = 3;

export async function bootstrapOrgAdmin(
  input: BootstrapInput,
): Promise<BootstrappedOrgAdmin> {
  const email = input.contactEmail.trim().toLowerCase();
  const phone = input.contactPhone?.trim() || "";

  // Step 1 — user lookup or create.
  let user = findUserByEmail(email);
  let userCreated = false;

  if (!user) {
    user = createUser({
      // Best-effort name from the email local-part. The admin will
      // edit this on first login; we'd rather seed something readable
      // than show "—" in the staff list.
      name: humanizeName(email),
      email,
      phone,
      password: cryptoRandomString(16), // overwritten by issueTempPassword below
      role: "admin",
      country: input.country,
    });
    userCreated = true;
  } else if (user.role === "patient") {
    // Existing patient account being promoted to org admin. We elevate
    // their role so the /admin gate works; this also matches the
    // pattern used elsewhere (doctor invite, vendor invite).
    adminSetUserRoleByEmail(email, "admin");
  }

  // Step 2 — issue 3-day temp password.
  const issued = issueTempPassword(user.id, TEMP_PASSWORD_TTL_DAYS);
  if (!issued) {
    // Should be impossible — we just confirmed the user exists — but
    // handle defensively so the super-admin never sees a hung 500.
    throw new Error("Failed to issue temporary password");
  }

  // Step 3 — owner membership. createMembership is idempotent on
  // (userId, organizationId), so re-running this for the same email
  // on a re-created org doesn't double-membership.
  createMembership({
    userId: user.id,
    organizationId: input.orgId,
    role: "owner",
    title: "Hospital Admin",
  });

  // Steps 4 & 5 — deliver credentials. We await both so the audit
  // log can record what actually happened, but we never let a failure
  // propagate past this helper — the super-admin still gets back the
  // plaintext password to share manually if needed.
  const delivery: BootstrappedOrgAdmin["delivery"] = {
    email: { sent: false },
    sms: { sent: false },
  };

  try {
    const r = await sendOrgAdminWelcomeEmail({
      to: email,
      name: user.name,
      orgName: input.orgName,
      tempPassword: issued.tempPassword,
      expiresAt: issued.expiresAt,
    });
    delivery.email = r.ok
      ? { sent: true }
      : { sent: false, reason: r.error || (r.skipped ? "skipped" : "unknown") };
  } catch (err) {
    delivery.email = { sent: false, reason: (err as Error).message };
  }

  if (phone) {
    try {
      const smsBody =
        `OduDoc: Your hospital admin account for ${input.orgName} is ready. ` +
        `Username: ${email}. Temp password: ${issued.tempPassword}. ` +
        `Sign in at https://odudoc.com/corporate/login and change it within 3 days.`;
      const r = await sendSms(phone, smsBody);
      delivery.sms = r.ok
        ? { sent: true }
        : { sent: false, reason: r.error || (r.skipped ? "skipped" : "unknown") };
    } catch (err) {
      delivery.sms = { sent: false, reason: (err as Error).message };
    }
  } else {
    delivery.sms = { sent: false, reason: "no_phone" };
  }

  return {
    userId: user.id,
    email,
    tempPassword: issued.tempPassword,
    expiresAt: issued.expiresAt,
    userCreated,
    delivery,
  };
}

function humanizeName(email: string): string {
  const local = email.split("@")[0] || email;
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .slice(0, 60);
}

function cryptoRandomString(len: number): string {
  const charset =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += charset[Math.floor(Math.random() * charset.length)];
  }
  return out;
}
