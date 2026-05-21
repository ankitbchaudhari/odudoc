import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import {
  findUserByEmail,
  findUserByEmployeeCode,
  validatePassword,
  touchLastLogin,
  createUser,
  markEmailVerified,
  reloadUsers,
  changeUserRole,
} from "./users-store";
import { findDoctorByEmail, reloadDoctors } from "./doctors-store";
import { verifyMobileToken } from "./mobile-auth";
import { verifyTotp } from "./totp";
import { recordLoginSession, isLoginLocked } from "./login-sessions-store";
import { recordEvent } from "./accountability-store";
import { getMembershipsForUser } from "./memberships-store";
import { getOrganizationById } from "./organizations-store";
import { getServerSession } from "next-auth";

// Super-admins bypass org-status checks — they may need to sign in to
// un-suspend or cancel orgs. Mirror of lib/tenant.ts and middleware.ts.
const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function isSuperEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const e = email.toLowerCase();
  if (e === "admin@odudoc.com") return true;
  return SUPER_ADMIN_EMAILS.includes(e);
}

// Extend NextAuth types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: "patient" | "doctor" | "admin" | "staff" | "vendor" | "hr" | "support" | "pharmacist";
    };
  }

  interface User {
    id: string;
    role: "patient" | "doctor" | "admin" | "staff" | "vendor" | "hr" | "support" | "pharmacist";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "patient" | "doctor" | "admin" | "staff" | "vendor" | "hr" | "support" | "pharmacist";
  }
}

const providers = [
  CredentialsProvider({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
      otpToken: { label: "OTP Token", type: "text" },
      totp: { label: "2FA code", type: "text" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        throw new Error("Please enter your email and password");
      }

      // Refresh the in-memory users list from app_kv. bindPersistentArray
      // hydrates only once per Lambda cold-start, so a Lambda that's been
      // warm since before the user signed up (on a different Lambda) would
      // otherwise miss the new record and 401 them with "No account found".
      await reloadUsers();

      // Patient OTP login path: the /login/patient page verifies the OTP
      // via /api/auth/patient/verify-otp, which mints a short-lived mobile
      // JWT and hands it back. The client then submits it here, prefixed
      // with "OTP:", as the password. We verify the JWT and skip the
      // password check.
      const isOtpToken = typeof credentials.password === "string" && credentials.password.startsWith("OTP:");
      let otpClaims: Awaited<ReturnType<typeof verifyMobileToken>> = null;
      if (isOtpToken) {
        const token = credentials.password.slice(4);
        otpClaims = await verifyMobileToken(token);
        if (!otpClaims) {
          throw new Error("Invalid or expired login token");
        }
      }

      // Corporate staff-ID fallback. /login/corporate forwards the
      // staff ID via the email field. If the identifier matches an
      // employee-code pattern (EMP-XXXX-NNNN or legacy STF-NNNNN) and
      // we can't resolve it as an email, look it up via the hospital
      // staff store and translate to the linked email.
      let user = findUserByEmail(credentials.email);
      const looksLikeEmployeeCode = /^(EMP|STF)-/i.test(credentials.email.trim());
      if (!user && looksLikeEmployeeCode) {
        user = findUserByEmployeeCode(credentials.email);
      }
      if (!user) {
        throw new Error("No account found with this email");
      }

      // Concurrent-session lockout. Triggered when the same user signs
      // in from > 3 distinct IPs inside an hour — see login-sessions-store.
      // Surfaces as a clear error so support can clear it on request.
      if (isLoginLocked(user.email)) {
        throw new Error("Account temporarily locked — too many concurrent sessions. Contact support.");
      }

      // If the OTP token doesn't match the submitted identifier, refuse —
      // the token is scoped to a single account.
      if (otpClaims && otpClaims.email.toLowerCase() !== user.email.toLowerCase()) {
        throw new Error("Login token does not match this account");
      }

      if (user.status === "banned") {
        throw new Error("This account has been banned. Contact support.");
      }

      // Org-status gate: if every org this user belongs to is suspended or
      // cancelled, block the login. Super-admins bypass (they need access
      // to un-suspend orgs). Users with no memberships (plain patients)
      // also bypass — they're not tied to a tenant.
      if (!isSuperEmail(user.email)) {
        const memberships = getMembershipsForUser(user.id);
        if (memberships.length > 0) {
          const orgs = memberships
            .map((m) => getOrganizationById(m.organizationId))
            .filter((o): o is NonNullable<typeof o> => !!o);
          const anyActive = orgs.some((o) => o.status === "active");
          if (orgs.length > 0 && !anyActive) {
            const cancelled = orgs.every((o) => o.status === "cancelled");
            throw new Error(
              cancelled
                ? "This organization's account has been cancelled. Contact support."
                : "This organization is currently suspended. Contact support or your admin."
            );
          }
        }
      }

      if (!isOtpToken) {
        const isValid = validatePassword(credentials.password, user.password);
        if (!isValid) {
          throw new Error("Invalid password");
        }
      }

      // Admin-issued temporary passwords expire after 7 days. After that
      // the login is blocked until an admin re-issues a new one — we refuse
      // the sign-in here so the old hash can't be used indefinitely.
      // OTP-token logins bypass this check (no password involved).
      if (!isOtpToken && user.mustChangePassword && user.tempPasswordExpiresAt) {
        const expiry = new Date(user.tempPasswordExpiresAt).getTime();
        if (!Number.isNaN(expiry) && expiry < Date.now()) {
          throw new Error(
            "Your temporary password has expired. Please contact an admin to reissue it."
          );
        }
      }

      // Email verification + inactivity re-verification gates were removed
      // to streamline sign-in for corporate demos and everyday users. If a
      // user somehow reaches this handler unverified, upgrade them silently
      // so downstream code that checks emailVerified still behaves.
      if (!user.emailVerified) {
        markEmailVerified(user.email);
      }

      // 2FA TOTP gate. Doctors + admins + corporate staff who have
      // enabled TOTP must include a current 6-digit code. OTP-token
      // logins are exempt — the email OTP already proved possession
      // of the inbox, so layering a TOTP on top would be friction for
      // patient flows that don't need it.
      if (!isOtpToken && user.totpEnabled && user.totpSecret) {
        const code = (credentials as { totp?: string }).totp;
        if (!code) {
          throw new Error("2fa_required");
        }
        if (!verifyTotp(user.totpSecret, code)) {
          throw new Error("Invalid 2FA code");
        }
      }

      // Bump lastLoginAt so subsequent logins today don't re-trigger the
      // inactivity check.
      touchLastLogin(user.email);

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };
    },
  }),
];

// Only add Google provider if credentials are configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }) as any
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    // Google OAuth: Google has already verified the user's email, so we
    // trust their `email_verified` claim and skip our own verification-link
    // round-trip. New Google users are created already-verified; existing
    // unverified accounts are upgraded to verified on first Google sign-in.
    // The credentials (email+password) flow still sends a verification link
    // on registration — only Google bypasses it.
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;
      if (!user.email) return false;

      // Same staleness concern as the credentials flow — refresh before lookup.
      await Promise.all([reloadUsers(), reloadDoctors()]);

      const existing = findUserByEmail(user.email);

      // Banned users cannot sign in via Google either.
      if (existing && existing.status === "banned") {
        return "/auth/login?error=banned";
      }

      // Auto-elevate role for existing doctor profiles. The /for-doctors
      // signup flow creates the User row with role "patient" + a separate
      // doctor profile; until this hook ran, Google sign-ins were stuck
      // at "patient" even when a matching doctor profile existed, which
      // caused /api/prescriptions and /api/doctor/instant to silently
      // 401 / return empty results on the doctor dashboard.
      const matchingDoctor = findDoctorByEmail(user.email);
      const roleFromDoctor: "doctor" | null = matchingDoctor ? "doctor" : null;

      // New Google user — create as already-verified (Google vouches for the
      // address) and let sign-in proceed. If a doctor profile exists with the
      // same email, create the user record as "doctor" directly so the role
      // is right on first JWT issue, not after a second sign-in.
      if (!existing) {
        const created = createUser({
          name: user.name || user.email.split("@")[0],
          email: user.email,
          phone: "",
          // Random password they never use — they sign in via Google.
          password: `google-${Math.random().toString(36).slice(2)}-${Date.now()}`,
          role: roleFromDoctor ?? "patient",
        });
        markEmailVerified(created.email);
        return true;
      }

      // Existing user but not yet verified — upgrade to verified (Google has
      // confirmed ownership) instead of emailing a link.
      if (!existing.emailVerified) {
        markEmailVerified(existing.email);
      }

      // If the user was created as "patient" but we now find a doctor
      // profile with the same email, promote them. Idempotent — no-op
      // when they're already a doctor / admin / staff / etc.
      if (roleFromDoctor && existing.role === "patient") {
        changeUserRole(existing.id, roleFromDoctor);
      }

      // Bump lastLoginAt so the inactivity gate doesn't fire on the next
      // credentials-based login.
      touchLastLogin(existing.email);
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "patient";
      }
      // Refresh role from DB on every JWT call so admin role changes take
      // effect on the user's NEXT request without requiring them to sign out
      // and back in. Cheap — users are held in-memory; reload() is a no-op
      // on a warm Lambda within the cache TTL.
      if (token.email) {
        const fresh = findUserByEmail(token.email as string);
        if (fresh) {
          token.id = fresh.id;
          token.role = fresh.role;

          // Backfill: if the user is still tagged "patient" but a doctor
          // profile exists for this email, promote them. Catches users
          // who signed in via Google before the signIn callback gained
          // its doctor-profile lookup, and avoids forcing them to sign
          // out + back in to pick up the right role.
          if (fresh.role === "patient" && findDoctorByEmail(fresh.email)) {
            const promoted = changeUserRole(fresh.id, "doctor");
            if (promoted) token.role = promoted.role;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  events: {
    // V13 §1 accountability — every successful sign-in / sign-out is
    // recorded as a system-category event. The recordLoginSession side
    // effect also drives the concurrent-session lockout (V14 security).
    async signIn({ user, account }) {
      try {
        if (!user?.email) return;
        const sessionResult = recordLoginSession({
          userEmail: user.email,
          ip: "server", // NextAuth event doesn't carry req — see middleware for richer IP capture
          userAgent: "server",
        });
        await recordEvent({
          category: "system",
          action: "auth.login.success",
          severity: sessionResult.lockedNow ? "high" : "info",
          actorEmail: user.email,
          actorRole: (user as { role?: string }).role,
          actorId: user.id,
          subjectKind: "user",
          subjectId: user.id,
          summary: sessionResult.lockedNow
            ? `Signed in via ${account?.provider || "credentials"} — auto-locked after ${sessionResult.distinctIps} distinct IPs in 1h`
            : `Signed in via ${account?.provider || "credentials"}`,
        });
      } catch {
        /* logging failures must never block sign-in */
      }
    },
    async signOut({ token }) {
      try {
        const email = (token as { email?: string })?.email;
        if (!email) return;
        await recordEvent({
          category: "system",
          action: "auth.logout",
          severity: "info",
          actorEmail: email,
          actorRole: (token as { role?: string })?.role,
          actorId: (token as { id?: string })?.id,
          subjectKind: "user",
          subjectId: (token as { id?: string })?.id,
          summary: "Signed out",
        });
      } catch {
        /* never block */
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}
