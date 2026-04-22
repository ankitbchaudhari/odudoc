// Per-organization Stripe subscription state. Tenant-scoped.
// Mirrors what we care about from a Stripe Subscription; updated by webhooks.

import { bindPersistentArray } from "../persistent-array";

export type PlanTier = "trial" | "starter" | "clinic" | "hospital" | "enterprise";
export type SubStatus =
  | "trialing" | "active" | "past_due" | "canceled"
  | "unpaid" | "incomplete" | "incomplete_expired" | "paused";

export interface Subscription {
  id: string;                    // SUB-{suffix}-{seq}
  organizationId: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  priceId?: string;
  planTier: PlanTier;
  status: SubStatus;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  trialEnd?: string;
  cancelAt?: string;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: string;
  quantity?: number;
  lastInvoiceId?: string;
  lastInvoiceAmount?: number;
  lastInvoicePaidAt?: string;
  createdAt: string;
  updatedAt: string;
}

const subs: Subscription[] = [];
const h = bindPersistentArray<Subscription>("org-subscriptions", subs, () => []);
await h;

function suf(o: string) { return o.slice(0, 4).toUpperCase(); }
function nextId(orgId: string) {
  const p = `SUB-${suf(orgId)}-`;
  const m = subs.filter((r) => r.id.startsWith(p)).reduce((mx, r) => Math.max(mx, Number(r.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}

export function getSubscriptionForOrg(orgId: string): Subscription | null {
  return subs.find((s) => s.organizationId === orgId) || null;
}

export function getSubscriptionByStripeId(stripeSubId: string): Subscription | null {
  return subs.find((s) => s.stripeSubscriptionId === stripeSubId) || null;
}

export function getSubscriptionByCustomerId(stripeCustomerId: string): Subscription | null {
  return subs.find((s) => s.stripeCustomerId === stripeCustomerId) || null;
}

export function upsertSubscription(orgId: string, patch: Partial<Subscription>): Subscription {
  const now = new Date().toISOString();
  const i = subs.findIndex((s) => s.organizationId === orgId);
  if (i >= 0) {
    subs.splice(i, 1, { ...subs[i], ...patch, id: subs[i].id, organizationId: orgId, updatedAt: now });
    return subs[i];
  }
  const r: Subscription = {
    id: nextId(orgId),
    organizationId: orgId,
    planTier: (patch.planTier || "trial") as PlanTier,
    status: (patch.status || "trialing") as SubStatus,
    createdAt: now, updatedAt: now,
    ...patch,
  };
  subs.push(r);
  return r;
}

export function listSubscriptions(): Subscription[] {
  return subs.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function isOrgBillingBlocked(orgId: string): boolean {
  const s = getSubscriptionForOrg(orgId);
  if (!s) return false;
  return s.status === "past_due" || s.status === "unpaid" || s.status === "canceled" || s.status === "incomplete_expired";
}
