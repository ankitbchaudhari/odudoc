// Inter-organization partner network.
//
// The "Connect every hospital" thesis: any two organizations on OduDoc
// can opt into a bidirectional trust handshake. Once connected they
// can exchange referrals, transfer patients, and share records subject
// to per-transfer patient consent.
//
// We deliberately do *not* auto-connect every org pair — privacy law
// (HIPAA / DPDP / GDPR) wants explicit, auditable, revocable trust
// relationships between data controllers. The handshake is a 2-step:
//
//   1. Org A's admin sends a connection request to Org B
//      (status: "pending").
//   2. Org B's admin accepts or declines.
//      Accept → status: "connected" (bidirectional).
//      Decline → status: "declined" (kept for audit, no exchange).
//
// Either side can revoke at any time → status: "revoked". Existing
// in-flight transfers stay readable for audit but no new ones can be
// created against a revoked link.
//
// Storage uses the same persistent-array pattern as orgs/memberships
// so deletes survive Lambda recycle.

import { bindPersistentArray } from "./persistent-array";

export type ConnectionStatus =
  | "pending"
  | "connected"
  | "declined"
  | "revoked";

export interface OrgConnection {
  id: string;
  // Canonical pair: orgAId is always lex-smaller than orgBId so we can
  // dedupe (A→B and B→A collapse to one row). The `requestedByOrgId`
  // field disambiguates direction for the UI.
  orgAId: string;
  orgBId: string;
  requestedByOrgId: string;     // who initiated
  status: ConnectionStatus;
  // Free-text note from the requester ("specialist referrals only",
  // "post-discharge follow-up partner", etc.).
  note?: string;
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
  revokedByOrgId?: string;
  revokedAt?: string;
}

const connections: OrgConnection[] = [];
const {
  hydrate,
  reload: reloadConnectionsInternal,
  flush,
  tombstone,
} = bindPersistentArray<OrgConnection>(
  "org_connections",
  connections,
  () => []
);
await hydrate();

export async function reloadConnections() {
  await reloadConnectionsInternal();
}

function pairKey(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export function findConnection(
  orgX: string,
  orgY: string,
): OrgConnection | null {
  const [a, b] = pairKey(orgX, orgY);
  return connections.find((c) => c.orgAId === a && c.orgBId === b) || null;
}

export function listConnectionsForOrg(orgId: string): OrgConnection[] {
  return connections.filter(
    (c) => c.orgAId === orgId || c.orgBId === orgId,
  );
}

/** Connected partners only — used by the transfer creator to populate
 *  the destination dropdown. Strips revoked / pending / declined. */
export function listConnectedPartnerIds(orgId: string): string[] {
  return connections
    .filter(
      (c) =>
        c.status === "connected" &&
        (c.orgAId === orgId || c.orgBId === orgId),
    )
    .map((c) => (c.orgAId === orgId ? c.orgBId : c.orgAId));
}

export function areConnected(orgX: string, orgY: string): boolean {
  const c = findConnection(orgX, orgY);
  return c?.status === "connected";
}

export function requestConnection(input: {
  fromOrgId: string;
  toOrgId: string;
  note?: string;
}): OrgConnection {
  if (input.fromOrgId === input.toOrgId) {
    throw new Error("cannot_connect_to_self");
  }
  const existing = findConnection(input.fromOrgId, input.toOrgId);
  if (existing) {
    // Re-requesting a previously declined / revoked link bumps it back
    // to pending so the receiving org gets another shot to accept.
    if (existing.status === "connected") return existing;
    existing.status = "pending";
    existing.requestedByOrgId = input.fromOrgId;
    existing.note = input.note;
    existing.updatedAt = new Date().toISOString();
    flush();
    return existing;
  }
  const [a, b] = pairKey(input.fromOrgId, input.toOrgId);
  const now = new Date().toISOString();
  const c: OrgConnection = {
    id: `conn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    orgAId: a,
    orgBId: b,
    requestedByOrgId: input.fromOrgId,
    status: "pending",
    note: input.note?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  connections.push(c);
  flush();
  return c;
}

export function acceptConnection(
  connectionId: string,
  acceptingOrgId: string,
): OrgConnection | null {
  const c = connections.find((x) => x.id === connectionId);
  if (!c) return null;
  if (c.requestedByOrgId === acceptingOrgId) return null; // can't accept own
  if (c.orgAId !== acceptingOrgId && c.orgBId !== acceptingOrgId) return null;
  c.status = "connected";
  c.acceptedAt = new Date().toISOString();
  c.updatedAt = c.acceptedAt;
  flush();
  return c;
}

export function declineConnection(
  connectionId: string,
  decliningOrgId: string,
): OrgConnection | null {
  const c = connections.find((x) => x.id === connectionId);
  if (!c) return null;
  if (c.orgAId !== decliningOrgId && c.orgBId !== decliningOrgId) return null;
  c.status = "declined";
  c.updatedAt = new Date().toISOString();
  flush();
  return c;
}

export function revokeConnection(
  connectionId: string,
  revokingOrgId: string,
): OrgConnection | null {
  const c = connections.find((x) => x.id === connectionId);
  if (!c) return null;
  if (c.orgAId !== revokingOrgId && c.orgBId !== revokingOrgId) return null;
  c.status = "revoked";
  c.revokedByOrgId = revokingOrgId;
  c.revokedAt = new Date().toISOString();
  c.updatedAt = c.revokedAt;
  flush();
  return c;
}

export function deleteConnection(id: string): boolean {
  const i = connections.findIndex((c) => c.id === id);
  if (i < 0) return false;
  connections.splice(i, 1);
  tombstone(id);
  flush();
  return true;
}
