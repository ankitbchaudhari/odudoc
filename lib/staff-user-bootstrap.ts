// Staff-user bootstrap.
//
// Mirrors lib/org-admin-bootstrap.ts but for non-admin hospital staff
// added by an org admin from /admin/staff (or the dashboard quick-add
// modal). When the staff record has an email we:
//
//   1. Look up — or create — a User row keyed by that email.
//   2. Map the StaffRole to a User.role so the auth + sidebar gates
//      pick the right curated experience (pharmacist → pharmacy nav,
//      doctor → consult, etc.).
//   3. Attach a "staff" Membership to the org so tenant resolution
//      works on first login.
//   4. Issue a 12-char temp password with a 3-day TTL via the existing
//      issueTempPassword() helper. lib/auth.ts already blocks login
//      after that TTL elapses without a change.
//   5. Email + SMS the credentials (best-effort — failures don't kill
//      the staff create; the org admin sees the temp password in the
//      API response so they can hand-deliver if needed).
//
// Delivery details mirror the org-admin flow so the audit trail and
// failure modes are identical to what the super-admin sees.

import type { StaffRole } from "./hospital/staff-store";
import {
  createUser,
  findUserByEmail,
  issueTempPassword,
  adminSetUserRoleByEmail,
} from "./users-store";
import { createMembership } from "./memberships-store";
import { sendStaffWelcomeEmail } from "./email";
import { sendSms } from "./sms";

export interface BootstrappedStaffUser {
  userId: string;
  email: string;
  /** Plaintext, surfaced once to the org admin. Never stored. */
  tempPassword: string;
  /** ISO timestamp the temp password expires (3 days from now). */
  expiresAt: string;
  userCreated: boolean;
  delivery: {
    email: { sent: boolean; reason?: string };
    sms: { sent: boolean; reason?: string };
  };
}

interface BootstrapInput {
  orgId: string;
  orgName: string;
  staffName: string;
  staffEmail: string;
  staffPhone?: string;
  staffRole: StaffRole;
}

const TEMP_PASSWORD_TTL_DAYS = 3;

// Map hospital staff roles → auth user roles. Roles outside this map
// fall through to "staff" — they still get login + the curated staff
// sidebar, just without role-specific shortcuts.
function mapStaffRoleToUserRole(
  role: StaffRole,
): "doctor" | "pharmacist" | "staff" {
  switch (role) {
    case "doctor":
    case "resident":
      return "doctor";
    case "pharmacist":
      return "pharmacist";
    default:
      return "staff";
  }
}

export async function bootstrapStaffUser(
  input: BootstrapInput,
): Promise<BootstrappedStaffUser> {
  const email = input.staffEmail.trim().toLowerCase();
  const phone = input.staffPhone?.trim() || "";
  const authRole = mapStaffRoleToUserRole(input.staffRole);

  // Step 1 — user lookup or create.
  let user = findUserByEmail(email);
  let userCreated = false;

  if (!user) {
    user = createUser({
      name: input.staffName || humanizeName(email),
      email,
      phone,
      password: cryptoRandomString(16), // overwritten by issueTempPassword
      role: authRole,
    });
    userCreated = true;
  } else if (user.role === "patient") {
    // Patient being promoted to staff. Don't downgrade an existing
    // doctor / admin — they outrank "staff" for sidebar purposes.
    adminSetUserRoleByEmail(email, authRole);
  }

  // Step 2 — 3-day temp password.
  const issued = issueTempPassword(user.id, TEMP_PASSWORD_TTL_DAYS);
  if (!issued) {
    throw new Error("Failed to issue temporary password");
  }

  // Step 3 — staff membership. createMembership is idempotent on
  // (userId, organizationId) so calling this for the same user twice
  // is safe.
  createMembership({
    userId: user.id,
    organizationId: input.orgId,
    role: "staff",
    title: roleTitle(input.staffRole),
  });

  // Steps 4 & 5 — deliver credentials. Best-effort.
  const delivery: BootstrappedStaffUser["delivery"] = {
    email: { sent: false },
    sms: { sent: false },
  };

  try {
    const r = await sendStaffWelcomeEmail({
      to: email,
      name: user.name,
      orgName: input.orgName,
      roleLabel: roleTitle(input.staffRole),
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
        `OduDoc: Your staff account at ${input.orgName} is ready. ` +
        `Username: ${email}. Temp password: ${issued.tempPassword}. ` +
        `Sign in at https://odudoc.com/auth/login and change it within 3 days.`;
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

function roleTitle(role: StaffRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
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
