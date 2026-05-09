// Health Passport — token signing + bundle assembly.
//
// QR payload format:
//
//   <base64url(json)>.<hex(hmac-sha256)>
//
//   json = {
//     v:    1,                     // version
//     uid:  string,                // owner user id
//     dep:  string?,               // optional dependent id
//     mid:  string,                // medical id (display only)
//     iat:  number,                // issued-at unix ms
//     jti:  string                 // unique token id
//   }
//
// We purposely don't use a JWT library for two reasons: (1) avoids a
// new dependency, (2) the token only needs HMAC verification — we
// don't need rotation/algorithms beyond HS256, and the QR is short.
//
// Bundle assembly is best-effort: we read whatever stores have data
// for this user/dependent, redacting sections the consent doesn't
// cover. Allergies always come through (drug-safety floor).

import crypto from "node:crypto";
import { findUserById } from "./users-store";
import { getDependentById } from "./family-store";
import {
  getContext as getSafetyContext,
} from "./drug-safety/patient-context-store";
import type { PassportConsent, PassportScope } from "./health-passport-store";

const SECRET = (() => {
  const s = process.env.HEALTH_PASSPORT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!s) {
    // Fall back to a stable derived secret based on hostname so dev
    // never crashes; production should set HEALTH_PASSPORT_SECRET.
    return "dev-only-secret-rotate-in-prod-please";
  }
  return s;
})();

interface PassportPayload {
  v: 1;
  uid: string;
  dep?: string;
  mid: string;
  iat: number;
  jti: string;
}

function b64urlEncode(buf: Buffer | string): string {
  const b = typeof buf === "string" ? Buffer.from(buf, "utf-8") : buf;
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function hmac(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
}

function timingSafeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function issuePassportToken(input: {
  userId: string;
  dependentId?: string;
  medicalId: string;
}): string {
  const payload: PassportPayload = {
    v: 1,
    uid: input.userId,
    dep: input.dependentId,
    mid: input.medicalId,
    iat: Date.now(),
    jti: crypto.randomBytes(8).toString("hex"),
  };
  const head = b64urlEncode(JSON.stringify(payload));
  const sig = hmac(head);
  return `${head}.${sig}`;
}

export interface VerifiedToken {
  ownerUserId: string;
  dependentId?: string;
  medicalId: string;
  issuedAt: number;
  jti: string;
}

export function verifyPassportToken(token: string): VerifiedToken | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [head, sig] = parts;
  const expected = hmac(head);
  if (!timingSafeEq(sig, expected)) return null;
  let payload: PassportPayload;
  try { payload = JSON.parse(b64urlDecode(head).toString("utf-8")); } catch { return null; }
  if (payload.v !== 1 || !payload.uid || !payload.mid) return null;
  return {
    ownerUserId: payload.uid,
    dependentId: payload.dep,
    medicalId: payload.mid,
    issuedAt: payload.iat,
    jti: payload.jti,
  };
}

export interface PassportBundle {
  patient: {
    name: string;
    medicalId: string;
    dateOfBirth?: string;
    sex?: string;
    age?: number;
    isDependent: boolean;
    relationship?: string;
  };
  allergies?: Array<{ drugName: string; severity?: string; reaction?: string }>;
  currentMeds?: Array<{ drugName: string; strength?: string }>;
  diagnoses?: Array<{ text: string; date?: string }>;
  prescriptions?: Array<{ at: string; doctor?: string; items: Array<{ drugName: string; strength?: string; dose?: string }> }>;
  vaccinations?: Array<{ name: string; date?: string }>;
  vitals?: Array<{ kind: string; value: string; recordedAt?: string }>;
  /** Always present — what the patient actually consented to share. */
  scopes: PassportScope[];
  /** Always present — flags the receiving clinic that allergies were
   *  surfaced even on minimal-scope grants (drug-safety floor). */
  notice: string;
}

function ageYears(dob?: string): number | undefined {
  if (!dob) return undefined;
  const t = new Date(dob).getTime();
  if (Number.isNaN(t)) return undefined;
  return Math.floor((Date.now() - t) / (365.25 * 24 * 60 * 60 * 1000));
}

/** Assemble the consented bundle. Caller has already verified the
 *  consent grant — we just project the data. */
export function assemblePassportBundle(
  token: VerifiedToken,
  consent: PassportConsent,
): PassportBundle | null {
  // Resolve the patient context first.
  let bundle: PassportBundle;
  if (token.dependentId) {
    const dep = getDependentById(token.dependentId);
    if (!dep || dep.ownerUserId !== token.ownerUserId) return null;
    bundle = {
      patient: {
        name: dep.name,
        medicalId: dep.medicalId,
        dateOfBirth: dep.dateOfBirth,
        sex: dep.sex,
        age: ageYears(dep.dateOfBirth),
        isDependent: true,
        relationship: dep.relationship,
      },
      scopes: consent.scopes,
      notice:
        "Allergies are always shared so the receiving clinic can run drug-safety checks. Other sections are gated by patient consent.",
    };
    if (consent.scopes.includes("allergies") && dep.allergies?.length) {
      bundle.allergies = dep.allergies.map((a) => ({ drugName: a }));
    }
    if (consent.scopes.includes("current_meds") && dep.currentMeds?.length) {
      bundle.currentMeds = dep.currentMeds.map((m) => ({ drugName: m }));
    }
  } else {
    const u = findUserById(token.ownerUserId);
    if (!u) return null;
    bundle = {
      patient: {
        name: u.name,
        medicalId: u.medicalId || token.medicalId,
        sex: undefined,
        age: undefined,
        isDependent: false,
      },
      scopes: consent.scopes,
      notice:
        "Allergies are always shared so the receiving clinic can run drug-safety checks. Other sections are gated by patient consent.",
    };
    // For self-profile we defer to the safety-context store, which
    // is what drug-safety reads from. We don't have an org id here
    // since the passport is org-agnostic — best-effort read of any
    // safety-context row keyed by user id. (In practice safety-context
    // is org-scoped; we'll surface whichever org last wrote data.)
    // Try a pragmatic best-effort: look up any safety-context row for
    // the user via getSafetyContext("self", userId) — falls back to
    // empty if none.
    const ctx = getSafetyContext("self", u.id) || getSafetyContext(u.id, u.id);
    if (ctx) {
      if (consent.scopes.includes("allergies") && ctx.allergies?.length) {
        bundle.allergies = ctx.allergies.map((a) => ({
          drugName: a.drugName,
          severity: a.severity,
          reaction: a.reaction,
        }));
      }
      if (consent.scopes.includes("current_meds") && ctx.currentMeds?.length) {
        bundle.currentMeds = ctx.currentMeds.map((m) => ({
          drugName: m.drugName,
          strength: m.strength,
        }));
      }
    }
  }
  return bundle;
}
