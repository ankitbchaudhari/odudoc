import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, createUser } from "@/lib/users-store";
import { sendVerificationEmail } from "@/lib/email";
import { createVerificationToken } from "@/lib/email-verification-store";
import { addAdminNotification } from "@/lib/admin-notifications-store";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { parseJson, z, nonEmptyString, emailSchema, phoneSchema } from "@/lib/validate";
import { awaitAllFlushesStrict, PersistenceError } from "@/lib/persistent-array";

import { log } from "@/lib/log";
const RegisterSchema = z.object({
  name: nonEmptyString.max(120),
  email: emailSchema,
  phone: phoneSchema,
  password: z.string().min(6).max(200),
  /** Country selected on the signup form. Accepted as either ISO
   *  alpha-2 ("IN") or full name ("India") — users-store.ts
   *  canonicalises on the way in. Drives cross-border consultation
   *  eligibility (Indian doctors are restricted to Indian patients
   *  per IMC telemedicine guidelines). */
  country: z.string().trim().max(64).optional(),
  /** Optional referral code carried over from a `?ref=…` URL or a
   *  cookie set by the marketing site. We attribute the referral
   *  immediately on signup so the referee's first-paid-consultation
   *  can later qualify both sides for the $10 + $10 credit. */
  referralCode: z.string().trim().min(4).max(16).optional(),
});

export const runtime = "nodejs";

function siteUrlFrom(request: Request): string {
  // Prefer NEXTAUTH_URL in production so the link always points at the
  // canonical www.odudoc.com domain, regardless of which Vercel preview the
  // signup was submitted from. Fall back to the request origin for local dev.
  const configured = process.env.NEXTAUTH_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  try {
    return new URL(request.url).origin;
  } catch {
    return "https://www.odudoc.com";
  }
}

export async function POST(request: NextRequest) {
  const blocked = await enforceRateLimit(request, "register", 5, "10 m");
  if (blocked) return blocked;
  try {
    const parsed = await parseJson(request, RegisterSchema);
    if (parsed instanceof NextResponse) return parsed;
    const { name, email, phone, password, country, referralCode } = parsed;

    // Public signup is for patients only. Doctors are onboarded by admin
    // after applying through /for-doctors/register.
    const role = "patient" as const;

    // Check if user already exists
    const existingUser = findUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Create the user in "unverified" state — they must click the link in
    // the verification email before they can sign in.
    const user = createUser({
      name,
      email,
      phone,
      password,
      role,
      country,
    } as Parameters<typeof createUser>[0]);

    // Apply referral attribution if a code came through. Best-effort:
    // bad / self / duplicate codes are silently skipped (no point
    // failing the signup over a referral mishap). The pending row
    // is what links this account to the referrer for the
    // qualify-on-first-consultation flow.
    if (referralCode) {
      try {
        const { applyReferralCode } = await import("@/lib/referral-program-store");
        await applyReferralCode({
          refereeEmail: user.email,
          code: referralCode,
          source: "signup",
        });
      } catch (err) {
        log.error("register.referral_apply_failed", err, { code: referralCode });
      }
    }

    // Drain all pending Postgres writes BEFORE we send the verification
    // email or return. Strict variant throws if any save failed — we
    // return 503 instead of pretending the account exists. Previously
    // used the non-strict variant, which allowed phantom accounts:
    // user clicks the verify link, gets "Email verified", then login
    // says "No account found".
    try {
      await awaitAllFlushesStrict();
    } catch (err) {
      log.error("register.persist_failed", err, { email: user.email });
      return NextResponse.json(
        {
          error:
            "Signup is temporarily unavailable. Please try again in a few moments.",
          ...(err instanceof PersistenceError ? { detail: err.errors.map((e) => e.key) } : {}),
        },
        { status: 503 }
      );
    }

    // Read-back verification: confirm the user actually exists in
    // Postgres before we send the verification email. Without this,
    // a write that succeeded in-memory but failed at Postgres would
    // still trigger an email + return success.
    const { reloadUsers, findUserByEmail: refetch } = await import("@/lib/users-store");
    await reloadUsers();
    if (!refetch(user.email)) {
      log.error("register.readback_missing", undefined, { email: user.email });
      return NextResponse.json(
        { error: "Signup is temporarily unavailable. Please try again in a few moments." },
        { status: 503 }
      );
    }

    // Notify admin of new signup.
    try {
      addAdminNotification({
        type: "user_signup",
        title: "New user signed up",
        body: `${user.name} (${user.email}) just created a patient account.`,
        link: "/admin/users",
      });
    } catch (err) {
      log.error("register.admin_notification_failed", err);
    }

    // Mint a 10-minute verification token and email the link. We `await` the
    // send because Vercel can freeze the function the moment this response
    // flushes — a fire-and-forget promise would get cancelled before Resend
    // receives it. If the send itself errors, we still return success: the
    // token exists and the user can resend via the login flow.
    const tok = await createVerificationToken(user.email, "signup");
    const verifyUrl = `${siteUrlFrom(request)}/api/auth/verify?token=${tok.token}`;

    try {
      const result = await sendVerificationEmail({
        to: user.email,
        name: user.name,
        verifyUrl,
        reason: "signup",
      });
      if (!result.ok) {
        log.error("register.verification_email_failed", result.error);
      }
    } catch (err) {
      log.error("register.verification_email_threw", err);
    }

    return NextResponse.json(
      {
        message:
          "Account created. Check your email for a verification link — it expires in 10 minutes.",
        verificationRequired: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    log.error("Registration error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
