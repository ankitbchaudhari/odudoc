// Public read-only share tokens for surgery video.
//
// Patient (or whoever the lead surgeon authorized) can mint a
// short-lived token tied to one session id. Anyone with the token
// + URL can view the video without signing in. Token is opaque
// (random 32 bytes hex), stored server-side with TTL + max-views
// counter; no JWT signing key to leak.
//
// Audit: every view via a share token is recorded with the IP
// against the patient as subject — same audit chain as direct
// /dashboard/surgery-video views.

import crypto from "node:crypto";
import { bindPersistentArray } from "../persistent-array";

export interface ShareToken {
  /** id == token. */
  id: string;
  sessionId: string;
  organizationId: string;
  /** Who minted it — appears in audit context. */
  mintedByUserId: string;
  mintedByEmail?: string;
  /** Expiry epoch ms. */
  expiresAt: number;
  /** Max number of distinct IPs that can use this token. 0 = unlimited. */
  maxIpUses: number;
  /** IPs that have already redeemed this token. */
  ipsSeen: string[];
  revoked: boolean;
  createdAt: string;
}

const tokens: ShareToken[] = [];
const { hydrate, flush, tombstone } = bindPersistentArray<ShareToken>(
  "surgery_share_tokens",
  tokens,
  () => []
);
await hydrate();

export interface MintInput {
  sessionId: string;
  organizationId: string;
  mintedByUserId: string;
  mintedByEmail?: string;
  ttlSeconds?: number;
  maxIpUses?: number;
}

export function mintToken(input: MintInput): ShareToken {
  const token = crypto.randomBytes(24).toString("hex");
  const t: ShareToken = {
    id: token,
    sessionId: input.sessionId,
    organizationId: input.organizationId,
    mintedByUserId: input.mintedByUserId,
    mintedByEmail: input.mintedByEmail,
    expiresAt: Date.now() + (input.ttlSeconds ?? 24 * 60 * 60) * 1000,
    maxIpUses: input.maxIpUses ?? 5,
    ipsSeen: [],
    revoked: false,
    createdAt: new Date().toISOString(),
  };
  tokens.unshift(t);
  flush();
  return t;
}

export interface RedeemResult {
  ok: boolean;
  reason?: "not_found" | "revoked" | "expired" | "ip_limit_reached";
  token?: ShareToken;
}

/** Caller passes the IP we'd record. We persist it on first use up
 *  to maxIpUses; after that, requests from a new IP get rejected
 *  but already-seen IPs continue to play. */
export function redeem(token: string, ip: string | undefined): RedeemResult {
  const t = tokens.find((x) => x.id === token);
  if (!t) return { ok: false, reason: "not_found" };
  if (t.revoked) return { ok: false, reason: "revoked" };
  if (Date.now() > t.expiresAt) return { ok: false, reason: "expired" };
  const ipKey = ip || "unknown";
  if (!t.ipsSeen.includes(ipKey)) {
    if (t.maxIpUses > 0 && t.ipsSeen.length >= t.maxIpUses) {
      return { ok: false, reason: "ip_limit_reached" };
    }
    t.ipsSeen.push(ipKey);
    flush();
  }
  return { ok: true, token: t };
}

export function listForSession(sessionId: string, organizationId: string): ShareToken[] {
  return tokens
    .filter((t) => t.sessionId === sessionId && t.organizationId === organizationId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function revoke(tokenId: string, organizationId: string): boolean {
  const t = tokens.find((x) => x.id === tokenId && x.organizationId === organizationId);
  if (!t) return false;
  t.revoked = true;
  flush();
  return true;
}

/** Sweep expired/revoked tokens. Run from a cron OR lazily on each
 *  list call — for the in-memory store the latter is fine. */
export function sweepExpired(): number {
  const now = Date.now();
  let n = 0;
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (tokens[i].revoked || tokens[i].expiresAt < now - 7 * 86400_000) {
      tombstone(tokens[i].id);
      tokens.splice(i, 1);
      n++;
    }
  }
  if (n) flush();
  return n;
}
