// Mock NHA gateway.
//
// In production, replace these helpers with `fetch` calls to the
// real ABDM gateway (https://dev.abdm.gov.in/gateway/v0.5/...). The
// mock matches the shape of NHA's responses closely enough that the
// downstream code doesn't need to change once we get sandbox creds.
//
// Endpoints stubbed:
//   - createAbhaByMobile: send an OTP to a mobile number; mock
//     returns a deterministic OTP we display in the UI for demos
//   - verifyAbhaOtp: validate the OTP and issue a healthIdToken
//   - registerCareContext: register a care context (returns nhaContextId)
//   - withdrawCareContext: unlink a previously-registered context
//   - issueConsentArtifact: signs a consent artifact ABDM-style
//
// The mock keeps a small in-memory OTP table so the verify call
// works without storing anything persistently. OTP expires in 5 min.

import crypto from "node:crypto";
import { generateMockAbhaNumber } from "./abha-store";

interface OtpEntry {
  otp: string;
  expiresAt: number;
  mobile: string;
  abhaSeed?: string;
}

const otpTable = new Map<string, OtpEntry>();

const MOCK = process.env.ABDM_MOCK !== "false";
const NHA_BASE = process.env.ABDM_NHA_BASE || "https://dev.abdm.gov.in/gateway/v0.5";

void NHA_BASE;

export interface CreateAbhaResp {
  txnId: string;
  /** When mock=true we surface the OTP so the demo flow can show it. */
  mockOtp?: string;
}

export async function createAbhaByMobile(mobile: string, abhaAddress?: string): Promise<CreateAbhaResp> {
  const txnId = `tx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  if (MOCK) {
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    otpTable.set(txnId, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
      mobile,
      abhaSeed: abhaAddress?.toLowerCase().trim(),
    });
    return { txnId, mockOtp: otp };
  }
  // Real path (placeholder — wire fetch + bearer token here later).
  // const res = await fetch(`${NHA_BASE}/registration/aadhaar/getOtp`, ...);
  return { txnId };
}

export interface VerifyAbhaResp {
  ok: boolean;
  abhaNumber?: string;
  abhaAddress?: string;
  healthIdToken?: string;
  error?: string;
}

export async function verifyAbhaOtp(txnId: string, otp: string): Promise<VerifyAbhaResp> {
  if (MOCK) {
    const entry = otpTable.get(txnId);
    if (!entry) return { ok: false, error: "txn_not_found" };
    if (Date.now() > entry.expiresAt) {
      otpTable.delete(txnId);
      return { ok: false, error: "otp_expired" };
    }
    if (entry.otp !== otp) return { ok: false, error: "otp_mismatch" };
    otpTable.delete(txnId);
    const abhaNumber = generateMockAbhaNumber();
    const abhaAddress = entry.abhaSeed || `${abhaNumber.replace(/-/g, "").slice(2, 10)}@abdm`;
    const healthIdToken = `mock_${crypto.randomBytes(16).toString("hex")}`;
    return { ok: true, abhaNumber, abhaAddress, healthIdToken };
  }
  return { ok: false, error: "mock_only" };
}

export interface RegisterContextResp {
  ok: boolean;
  nhaContextId?: string;
  error?: string;
}

export async function registerCareContext(input: {
  abhaNumber: string;
  patientId: string;
  type: string;
  display: string;
}): Promise<RegisterContextResp> {
  void input;
  if (MOCK) {
    return {
      ok: true,
      nhaContextId: `nha_ctx_${crypto.randomBytes(8).toString("hex")}`,
    };
  }
  return { ok: false, error: "mock_only" };
}

export async function withdrawCareContext(nhaContextId: string): Promise<{ ok: boolean }> {
  void nhaContextId;
  return { ok: MOCK };
}

// ─── Consent artifacts (HIE) ─────────────────────────────────────
//
// When a HIU (another hospital, insurer, research org) requests
// records via the Consent Manager, NHA pings us to confirm we hold
// data + once the patient grants, NHA issues a "consent artifact"
// — a signed JWT we can present alongside the FHIR fetch. We don't
// run a Consent Manager ourselves; we just sign + verify artifacts
// pointing at our care contexts.

export interface ConsentArtifact {
  consentId: string;
  /** Patient ABHA. */
  patientId: string;
  /** Requesting org / app. */
  hiuId: string;
  hiuName: string;
  /** Care-context ids the consent covers. */
  contextIds: string[];
  /** Purpose code (CAREMGT / BTG / PUBHLTH / RESEARCH / SELF). */
  purpose: string;
  /** ISO start + end of the access window. */
  fromIso: string;
  toIso: string;
  /** Sign timestamp + algorithm. */
  signedAt: string;
  signatureAlg: "HMAC-SHA256";
  signature: string;
  status: "active" | "revoked" | "expired";
}

const ABDM_SECRET = process.env.ABDM_CONSENT_SECRET ||
  process.env.HEALTH_PASSPORT_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "dev-only-rotate-in-prod";

function signArtifact(a: Omit<ConsentArtifact, "signature" | "signatureAlg" | "signedAt" | "status">): { signature: string; signedAt: string } {
  const signedAt = new Date().toISOString();
  const canon = [
    a.consentId, a.patientId, a.hiuId,
    (a.contextIds || []).slice().sort().join(","),
    a.purpose, a.fromIso, a.toIso, signedAt,
  ].join("|");
  const sig = crypto.createHmac("sha256", ABDM_SECRET).update(canon).digest("hex");
  return { signature: sig, signedAt };
}

export function issueConsentArtifact(input: {
  patientId: string;
  hiuId: string;
  hiuName: string;
  contextIds: string[];
  purpose: string;
  ttlHours?: number;
}): ConsentArtifact {
  const consentId = `cnst-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const now = Date.now();
  const fromIso = new Date(now).toISOString();
  const toIso = new Date(now + (input.ttlHours ?? 24) * 60 * 60 * 1000).toISOString();
  const draft = {
    consentId,
    patientId: input.patientId,
    hiuId: input.hiuId,
    hiuName: input.hiuName,
    contextIds: input.contextIds,
    purpose: input.purpose,
    fromIso,
    toIso,
  };
  const { signature, signedAt } = signArtifact(draft);
  return {
    ...draft,
    signedAt,
    signatureAlg: "HMAC-SHA256",
    signature,
    status: "active",
  };
}

export function verifyConsentArtifact(a: ConsentArtifact): { ok: boolean; reason?: string } {
  if (a.status !== "active") return { ok: false, reason: "not_active" };
  if (Date.now() > new Date(a.toIso).getTime()) return { ok: false, reason: "expired" };
  const { signature } = signArtifact({
    consentId: a.consentId, patientId: a.patientId,
    hiuId: a.hiuId, hiuName: a.hiuName,
    contextIds: a.contextIds, purpose: a.purpose,
    fromIso: a.fromIso, toIso: a.toIso,
  });
  // Recompute with the original signedAt — re-sign omits it; verify
  // by comparing canonical hash with the same signedAt that was used
  // at issue time.
  const canon = [
    a.consentId, a.patientId, a.hiuId,
    (a.contextIds || []).slice().sort().join(","),
    a.purpose, a.fromIso, a.toIso, a.signedAt,
  ].join("|");
  const expected = crypto.createHmac("sha256", ABDM_SECRET).update(canon).digest("hex");
  void signature; // (the live `signature` recomputation used current time; we trust the stored one if expected matches)
  if (a.signature.length !== expected.length) return { ok: false, reason: "tamper" };
  if (!crypto.timingSafeEqual(Buffer.from(a.signature), Buffer.from(expected))) {
    return { ok: false, reason: "tamper" };
  }
  return { ok: true };
}
