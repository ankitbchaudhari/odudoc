import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import {
  findUserByEmail,
  validatePassword,
  touchLastLogin,
  createUser,
  markEmailVerified,
  reloadUsers,
} from "./users-store";
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
      role: "patient" | "doctor" | "admin" | "staff" | "vendor";
    };
  }

  interface User {
    id: string;
    role: "patient" | "doctor" | "admin" | "staff" | "vendor";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "patient" | "doctor" | "admin" | "staff" | "vendor";
  }
}

const providers = [
  CredentialsProvider({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
      otpToken: { label: "OTP Token", type: "text" },
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

      const user = findUserByEmail(credentials.email);
      if (!user) {
        throw new Error("No account found with this email");
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

      const isValid = validatePassword(credentials.password, user.password);
      if (!isValid) {
        throw new Error("Invalid password");
      }

      // Admin-issued temporary passwords expire after 7 days. After that
      // the login is blocked until an admin re-issues a new one — we refuse
      // the sign-in here so the old hash can't be used indefinitely.
      if (user.mustChangePassword && user.tempPasswordExpiresAt) {
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
      await reloadUsers();

      const existing = findUserByEmail(user.email);

      // Banned users cannot sign in via Google either.
      if (existing && existing.status === "banned") {
        return "/auth/login?error=banned";
      }

      // New Google user — create as already-verified (Google vouches for the
      // address) and let sign-in proceed.
      if (!existing) {
        const created = createUser({
          name: user.name || user.email.split("@")[0],
          email: user.email,
          phone: "",
          // Random password they never use — they sign in via Google.
          password: `google-${Math.random().toString(36).slice(2)}-${Date.now()}`,
          role: "patient",
        });
        markEmailVerified(created.email);
        return true;
      }

      // Existing user but not yet verified — upgrade to verified (Google has
      // confirmed ownership) instead of emailing a link.
      if (!existing.emailVerified) {
        markEmailVerified(existing.email);
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
  secret: process.env.NEXTAUTH_SECRET,
};

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}
