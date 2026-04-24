import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, createUser } from "@/lib/users-store";
import { sendVerificationEmail } from "@/lib/email";
import { createVerificationToken } from "@/lib/email-verification-store";
import { addAdminNotification } from "@/lib/admin-notifications-store";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { parseJson, z, nonEmptyString, emailSchema, phoneSchema } from "@/lib/validate";
import { awaitAllFlushes } from "@/lib/persistent-array";

import { log } from "@/lib/log";
const RegisterSchema = z.object({
  name: nonEmptyString.max(120),
  email: emailSchema,
  phone: phoneSchema,
  password: z.string().min(6).max(200),
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
    const { name, email, phone, password } = parsed;

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
    const user = createUser({ name, email, phone, password, role });

    // Drain all pending Postgres writes BEFORE we send the verification
    // email or return. If the Lambda freezes on response-flush, the
    // createUser() write-back gets cancelled and the account is lost —
    // user clicks the verify link, gets "Email verified", then login
    // says "No account found". Draining here makes the write durable.
    await awaitAllFlushes();

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
