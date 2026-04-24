// Mobile JWT auth — sign + verify short-lived tokens for the Android apps.
//
// The web uses NextAuth session cookies. Mobile clients can't carry those
// cleanly, so they exchange email+password at /api/auth/mobile-login for a
// signed JWT stored in EncryptedSharedPreferences and sent as
// `Authorization: Bearer <token>` on every request.
//
// Signing key: MOBILE_JWT_SECRET (falls back to NEXTAUTH_SECRET so prod
// deploys with only NEXTAUTH_SECRET set still work). In prod set a
// dedicated value so rotating web sessions doesn't invalidate mobile logins.

import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { NextRequest, NextResponse } from "next/server";

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret(): Uint8Array {
  const raw = process.env.MOBILE_JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!raw) {
    throw new Error(
      "MOBILE_JWT_SECRET (or NEXTAUTH_SECRET) is not set — refusing to sign tokens"
    );
  }
  return new TextEncoder().encode(raw);
}

export interface MobileTokenClaims extends JWTPayload {
  sub: string; // user id
  email: string;
  role: string;
  name?: string;
}

export async function signMobileToken(
  claims: Omit<MobileTokenClaims, "iat" | "exp">,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<{ token: string; expiresAt: number }> {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + ttlSeconds;
  const token = await new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .setIssuer("odudoc-mobile")
    .setAudience("odudoc-mobile")
    .setSubject(claims.sub as string)
    .sign(getSecret());
  return { token, expiresAt: exp * 1000 };
}

export async function verifyMobileToken(
  token: string
): Promise<MobileTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: "odudoc-mobile",
      audience: "odudoc-mobile",
    });
    if (!payload.sub || typeof payload.email !== "string" || typeof payload.role !== "string") {
      return null;
    }
    return payload as MobileTokenClaims;
  } catch {
    return null;
  }
}

export function extractBearer(req: NextRequest | Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

/**
 * Guard for mobile-authed routes.
 *
 *   const auth = await requireMobileUser(req);
 *   if (auth instanceof NextResponse) return auth;  // 401
 *   const { userId, email, role } = auth;
 */
export async function requireMobileUser(
  req: NextRequest | Request
): Promise<
  | NextResponse
  | { userId: string; email: string; role: string; name?: string }
> {
  const token = extractBearer(req);
  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 401 });
  }
  const claims = await verifyMobileToken(token);
  if (!claims) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }
  return {
    userId: claims.sub,
    email: claims.email,
    role: claims.role,
    name: claims.name,
  };
}
