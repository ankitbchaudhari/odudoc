// ABHA (Ayushman Bharat Health Account) linking.
//
// Every Indian patient gets a 14-digit ABHA number + a human-readable
// ABHA address (e.g. "ankit.chaudhari@abdm"). OduDoc holds the link
// so we can push care contexts into the patient's PHR and serve as
// a Health Information Provider (HIP) under the ABDM spec.
//
// Distinct from User.abhaId / abhaAddress on the legacy users-store
// (which we keep populated for backwards compat) — this store carries
// the linking ceremony state, KYC verification metadata, and a per-
// dependent variant so a parent can link their child's ABHA too.

import { bindPersistentArray } from "../persistent-array";
import crypto from "node:crypto";

export type AbhaLinkStatus =
  | "unverified"      // address claimed but OTP not yet completed
  | "linked"          // verified via Aadhaar / mobile OTP
  | "revoked"         // patient revoked the link
  | "kyc_pending";    // ABHA exists but KYC step incomplete

export interface AbhaLink {
  id: string;
  userId: string;
  /** Optional dependent — kid's ABHA on the parent's account. */
  dependentId?: string;
  /** 14-digit ABHA number (49-XXXX-XXXX-XXXX format on the wire). */
  abhaNumber: string;
  /** Human-readable ABHA address ("name@abdm"). */
  abhaAddress: string;
  /** KYC source — "aadhaar" / "mobile" / "driving_license" etc. */
  kycSource?: "aadhaar" | "mobile" | "driving_license" | "manual";
  status: AbhaLinkStatus;
  /** Health-id token issued by NHA after successful linking; opaque
   *  string we keep for downstream API calls. Encrypted at rest in
   *  production; for the demo we store it raw. */
  healthIdToken?: string;
  /** Linked timestamp. */
  linkedAt?: string;
  /** Last time we successfully refreshed the token. */
  lastVerifiedAt?: string;
  revokedAt?: string;
  /** Free-text note captured during a manual override. */
  note?: string;
  createdAt: string;
  updatedAt: string;
}

const links: AbhaLink[] = [];
const { hydrate, flush, tombstone } = bindPersistentArray<AbhaLink>(
  "abdm_abha_links",
  links,
  () => []
);
await hydrate();

export function listLinksForUser(userId: string): AbhaLink[] {
  return links
    .filter((l) => l.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function findActiveLink(userId: string, dependentId?: string): AbhaLink | null {
  return (
    links.find(
      (l) =>
        l.userId === userId &&
        ((!dependentId && !l.dependentId) || l.dependentId === dependentId) &&
        l.status === "linked",
    ) || null
  );
}

export function findByAbhaNumber(abhaNumber: string): AbhaLink | null {
  const norm = abhaNumber.replace(/[^0-9]/g, "");
  return links.find((l) => l.abhaNumber.replace(/[^0-9]/g, "") === norm) || null;
}

export interface CreateLinkInput {
  userId: string;
  dependentId?: string;
  abhaNumber: string;
  abhaAddress: string;
  kycSource?: AbhaLink["kycSource"];
  status?: AbhaLinkStatus;
  healthIdToken?: string;
  note?: string;
}

export function startLink(input: CreateLinkInput): AbhaLink {
  const now = new Date().toISOString();
  const l: AbhaLink = {
    id: `abha-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    userId: input.userId,
    dependentId: input.dependentId,
    abhaNumber: input.abhaNumber.trim(),
    abhaAddress: input.abhaAddress.trim().toLowerCase(),
    kycSource: input.kycSource,
    status: input.status || "unverified",
    healthIdToken: input.healthIdToken,
    note: input.note?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  links.push(l);
  flush();
  return l;
}

export function completeLink(id: string, healthIdToken: string, kycSource?: AbhaLink["kycSource"]): AbhaLink | null {
  const l = links.find((x) => x.id === id);
  if (!l) return null;
  const now = new Date().toISOString();
  l.status = "linked";
  l.healthIdToken = healthIdToken;
  l.kycSource = kycSource || l.kycSource;
  l.linkedAt = now;
  l.lastVerifiedAt = now;
  l.updatedAt = now;
  flush();
  return l;
}

export function revokeLink(id: string, userId: string): AbhaLink | null {
  const l = links.find((x) => x.id === id);
  if (!l || l.userId !== userId) return null;
  if (l.status === "revoked") return l;
  l.status = "revoked";
  l.revokedAt = new Date().toISOString();
  l.updatedAt = l.revokedAt;
  flush();
  return l;
}

export function refreshLink(id: string): AbhaLink | null {
  const l = links.find((x) => x.id === id);
  if (!l) return null;
  l.lastVerifiedAt = new Date().toISOString();
  l.updatedAt = l.lastVerifiedAt;
  flush();
  return l;
}

export function deleteLinksForUser(userId: string): number {
  let n = 0;
  for (let i = links.length - 1; i >= 0; i--) {
    if (links[i].userId === userId) {
      tombstone(links[i].id);
      links.splice(i, 1);
      n++;
    }
  }
  if (n > 0) flush();
  return n;
}

/** Generates a valid-looking 14-digit ABHA number for the demo seed
 *  + mock-NHA path. Real ABHA numbers are issued by NHA via the
 *  abdm-abdm-gateway endpoint — this is a stand-in only. */
export function generateMockAbhaNumber(): string {
  const buf = crypto.randomBytes(7);
  let n = "49";
  for (const b of buf) n += String(b % 10);
  return n.slice(0, 14).replace(/(.{4})(.{4})(.{4})(.{2})/, "$1-$2-$3-$4");
}
