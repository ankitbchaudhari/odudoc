// POST /api/auth/mobile-google
//
// Sign-in / sign-up via Google for the Android apps. The app obtains a
// Google ID token via the Credential Manager API (which uses the SAME
// web OAuth client id that NextAuth's GoogleProvider uses on the
// website), then POSTs it here. We verify the token with Google's
// tokeninfo endpoint, then either log in an existing user or auto-create
// a verified patient account — mirroring the behaviour in lib/auth.ts's
// `signIn` callback for the web Google flow.
//
// Body:   { idToken: string }
// Returns same shape as /api/auth/mobile-login on success.

import { NextRequest, NextResponse } from "next/server";
import {
  findUserByEmail,
  createUser,
  markEmailVerified,
  touchLastLogin,
  reloadUsers,
} from "@/lib/users-store";
import { signMobileToken } from "@/lib/mobile-auth";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { parseJson, z } from "@/lib/validate";
import { awaitAllFlushes } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const Schema = z.object({
  idToken: z.string().trim().min(20).max(8000),
});

interface TokenInfo {
  iss?: string;
  aud?: string;
  azp?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
  sub?: string;
  exp?: string;
  error?: string;
  error_description?: string;
}

/**
 * Verify a Google ID token via the public tokeninfo endpoint. We don't
 * use a JWKS-based offline verifier so we can ship without a new
 * dependency — tokeninfo is rate-limited but plenty for our login
 * volume, and Google rotates keys server-side.
 */
async function verifyGoogleIdToken(idToken: string): Promise<TokenInfo | null> {
  try {
    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      log.warn("google_tokeninfo.bad_status", { status: r.status, body: text.slice(0, 200) });
      return null;
    }
    return (await r.json()) as TokenInfo;
  } catch (err) {
    log.error("google_tokeninfo.threw", err);
    return null;
  }
}

export async function POST(request: NextRequest) {
  const blocked = await enforceRateLimit(request, "mobile-google", 10, "1 m");
  if (blocked) return blocked;

  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;
  const { idToken } = parsed;

  const expectedClientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!expectedClientId) {
    return NextResponse.json(
      { error: "google_not_configured", message: "Google sign-in is not configured." },
      { status: 503 }
    );
  }

  const info = await verifyGoogleIdToken(idToken);
  if (!info || info.error) {
    return NextResponse.json(
      { error: "invalid_token", message: "Could not verify Google sign-in." },
      { status: 401 }
    );
  }

  // The token's audience must be our OAuth client. `aud` is the audience
  // and `azp` is the authorising party (the same value when issued for
  // the same client). Accept either matching to handle both Android and
  // web flows that share the web client id.
  if (info.aud !== expectedClientId && info.azp !== expectedClientId) {
    log.warn("google_tokeninfo.wrong_audience", {
      aud: info.aud,
      azp: info.azp,
      expected: expectedClientId,
    });
    return NextResponse.json(
      { error: "wrong_audience", message: "Token wasn't issued for this app." },
      { status: 401 }
    );
  }

  // Google must have verified the email. We treat 'true' string and
  // boolean true as truthy because tokeninfo returns the string form.
  const emailVerified =
    info.email_verified === true || info.email_verified === "true";
  if (!info.email || !emailVerified) {
    return NextResponse.json(
      { error: "email_unverified", message: "Your Google account email isn't verified." },
      { status: 403 }
    );
  }

  const issuerOk =
    info.iss === "accounts.google.com" || info.iss === "https://accounts.google.com";
  if (!issuerOk) {
    return NextResponse.json(
      { error: "wrong_issuer" },
      { status: 401 }
    );
  }

  try {
    await reloadUsers();
    let user = findUserByEmail(info.email);

    if (user && user.status === "banned") {
      return NextResponse.json(
        { error: "account_banned", message: "This account has been banned." },
        { status: 403 }
      );
    }

    if (!user) {
      // Auto-create as patient — same as the web Google flow in lib/auth.ts.
      // Doctors / staff are onboarded via separate flows; if a doctor signs
      // in via Google before being onboarded, they'll get a patient account
      // and the doctor app's role gate will reject the login.
      user = createUser({
        name: info.name || info.email.split("@")[0],
        email: info.email,
        phone: "",
        // Random password — they sign in via Google, never use it directly.
        password: `google-${Math.random().toString(36).slice(2)}-${Date.now()}`,
        role: "patient",
      });
      markEmailVerified(user.email);
      await awaitAllFlushes();
    } else if (!user.emailVerified) {
      // Existing account but not yet verified — Google has now confirmed
      // ownership of the email, so upgrade silently (mirrors web flow).
      markEmailVerified(user.email);
    }

    // Patient-claim hook — same logic as web verify and mobile-verify.
    // If this user already has a phone on file (legacy accounts that
    // later linked Google), surface their pre-account clinic bookings
    // + EMR entries. Best-effort, never blocks sign-in.
    if (user.phone) {
      try {
        const { claimBookingsForUser, reloadBookings } = await import("@/lib/bookings-store");
        const { claimEmrForUser, reloadEmr } = await import("@/lib/clinic-emr-store");
        await Promise.all([reloadBookings(), reloadEmr()]);
        const cb = claimBookingsForUser(user.id, user.phone);
        const ce = claimEmrForUser(user.id, user.phone);
        if (cb || ce) log.info("mobile-google.patient_claim", { userId: user.id, bookings: cb, emr: ce });
      } catch (err) {
        log.error("mobile-google.patient_claim_failed", err, { userId: user.id });
      }
    }

    touchLastLogin(user.email);

    const { token, expiresAt } = await signMobileToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return NextResponse.json({
      token,
      expiresAt,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        emailVerified: true,
      },
    });
  } catch (err) {
    log.error("mobile-google error", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
