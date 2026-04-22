// Doctor Subscription system (mock in-memory store)

export interface DoctorSubscription {
  id: string;
  doctorId: string;
  plan: "free" | "premium";
  consultationsUsed: number;
  consultationsLimit: number; // 25 for free, Number.POSITIVE_INFINITY for premium
  startedAt: string;
  expiresAt: string;
  status: "active" | "cancelled" | "expired";
  fee: number; // doctor's per-consultation fee
}

export interface SubscriptionPlan {
  id: "free" | "premium";
  name: string;
  price: number;
  consultationsLimit: number | null;
  feeRangeMin: number;
  feeRangeMax: number;
  features: string[];
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    consultationsLimit: 25,
    feeRangeMin: 100,
    feeRangeMax: 250,
    features: [
      "Up to 25 patient consultations per month",
      "Per-consultation fee: $100 - $250",
      "Standard listing visibility",
      "Basic analytics",
      "Email support",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: 250,
    consultationsLimit: null,
    feeRangeMin: 100,
    feeRangeMax: 500,
    features: [
      "UNLIMITED patient consultations",
      "Per-consultation fee: $100 - $500",
      "Featured listing (top of search)",
      "Priority support 24/7",
      "Advanced analytics dashboard",
      "Verified badge",
      "Custom profile branding",
    ],
  },
];

// In-memory subscription store. Real doctor subscriptions are added via
// the subscribe/upgrade flows; no demo records are seeded.
const subscriptions: DoctorSubscription[] = [];

export function getPlan(id: "free" | "premium"): SubscriptionPlan {
  return SUBSCRIPTION_PLANS.find((p) => p.id === id)!;
}

export function getAllSubscriptions(): DoctorSubscription[] {
  return [...subscriptions];
}

export function getSubscription(doctorId: string): DoctorSubscription | null {
  return subscriptions.find((s) => s.doctorId === doctorId) || null;
}

export function createSubscription(
  doctorId: string,
  plan: "free" | "premium",
  fee: number
): DoctorSubscription {
  const now = new Date();
  const expires = new Date(now);
  expires.setMonth(expires.getMonth() + 1);
  const sub: DoctorSubscription = {
    id: `sub-${Date.now()}`,
    doctorId,
    plan,
    consultationsUsed: 0,
    consultationsLimit: plan === "premium" ? Number.POSITIVE_INFINITY : 25,
    startedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    status: "active",
    fee,
  };
  subscriptions.push(sub);
  return sub;
}

export function upgradeSubscription(doctorId: string): DoctorSubscription | null {
  const sub = subscriptions.find((s) => s.doctorId === doctorId);
  if (!sub) return null;
  sub.plan = "premium";
  sub.consultationsLimit = Number.POSITIVE_INFINITY;
  const expires = new Date();
  expires.setMonth(expires.getMonth() + 1);
  sub.expiresAt = expires.toISOString();
  sub.status = "active";
  return sub;
}

// Push the expiry forward by `days` (default 30). If the subscription had
// lapsed, the new window starts from today so we don't give retroactive time.
export function extendSubscription(
  doctorId: string,
  days: number = 30
): DoctorSubscription | null {
  const sub = subscriptions.find((s) => s.doctorId === doctorId);
  if (!sub) return null;
  const base = new Date(sub.expiresAt);
  const now = new Date();
  const start = base.getTime() > now.getTime() ? base : now;
  const next = new Date(start);
  next.setDate(next.getDate() + days);
  sub.expiresAt = next.toISOString();
  sub.status = "active";
  return sub;
}

export function cancelSubscription(doctorId: string): DoctorSubscription | null {
  const sub = subscriptions.find((s) => s.doctorId === doctorId);
  if (!sub) return null;
  sub.status = "cancelled";
  return sub;
}

export function incrementConsultationCount(doctorId: string): boolean {
  const sub = subscriptions.find((s) => s.doctorId === doctorId);
  if (!sub) return false;
  if (sub.consultationsUsed >= sub.consultationsLimit) return false;
  sub.consultationsUsed += 1;
  return true;
}

export function canAcceptConsultation(doctorId: string): boolean {
  const sub = subscriptions.find((s) => s.doctorId === doctorId);
  if (!sub || sub.status !== "active") return false;
  return sub.consultationsUsed < sub.consultationsLimit;
}

export function daysRemaining(sub: DoctorSubscription): number {
  const ms = new Date(sub.expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

// Billing history — populated from real subscription payments via the
// IndusPays webhook. The type stays exported so the dashboard keeps
// compiling; the list starts empty until the first charge lands.
export interface BillingRecord {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: "paid" | "pending" | "failed";
  invoice: string;
}

export const mockBillingHistory: BillingRecord[] = [];
