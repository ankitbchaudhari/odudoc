// Clinic staff session — small HMAC-signed cookie, independent of the
// patient/doctor NextAuth session. Reception staff log in per-clinic and
// hold a 12h session valid only for their clinic. Keeping this separate
// from next-auth avoids leaking patient/doctor roles into the staff UI
// and lets the same browser hold a patient session alongside a clinic
// session without cross-talk.
//
// Cookie shape: base64url(JSON payload) + "." + base64url(HMAC-SHA256)
// Payload: { staffId, clinicId, role, exp (unix seconds) }
//
// Secret: env var CLINIC_SESSION_SECRET. Falls back to NEXTAUTH_SECRET
// if unset (better than a hard-coded dev default).

import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";

const COOKIE_NAME = "odudoc_clinic_session";
const TTL_SECONDS = 12 * 60 * 60; // 12h

export interface ClinicSessionPayload {
  staffId: string;
  clinicId: string;
  role: "receptionist" | "assistant" | "manager";
  exp: number;
}

function getSecret(): string {
  const s = process.env.CLINIC_SESSION_SECRET || process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("CLINIC_SESSION_SECRET (or NEXTAUTH_SECRET) must be set");
  return s;
}

function b64urlEncode(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function b64urlDecode(str: string): Buffer {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export function signClinicSession(p: Omit<ClinicSessionPayload, "exp">): string {
  const payload: ClinicSessionPayload = {
    ...p,
    exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
  };
  const body = b64urlEncode(JSON.stringify(payload));
  const sig = createHmac("sha256", getSecret()).update(body).digest();
  return `${body}.${b64urlEncode(sig)}`;
}

export function verifyClinicSession(token: string): ClinicSessionPayload | null {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  try {
    const expected = createHmac("sha256", getSecret()).update(body).digest();
    const provided = b64urlDecode(sig);
    if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return null;
    const payload = JSON.parse(b64urlDecode(body).toString("utf8")) as ClinicSessionPayload;
    if (!payload || typeof payload !== "object") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Server-side: read the cookie and verify. Returns null if not signed
 *  in. Use in API routes and server components. */
export function getClinicSession(req?: NextRequest): ClinicSessionPayload | null {
  let token: string | undefined;
  if (req) {
    token = req.cookies.get(COOKIE_NAME)?.value;
  } else {
    token = cookies().get(COOKIE_NAME)?.value;
  }
  return token ? verifyClinicSession(token) : null;
}

export const CLINIC_SESSION_COOKIE = COOKIE_NAME;
export const CLINIC_SESSION_TTL = TTL_SECONDS;
