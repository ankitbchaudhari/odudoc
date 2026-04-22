// Super-admin: resync subscription state from Stripe for an org that's
// drifted (e.g. we missed a webhook). Pulls the customer's latest
// subscription and upserts into our subscription-store. Safe to call
// repeatedly.
//
// POST /api/admin/super/stripe-replay  { orgId }  OR  { customerId }

import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { stripe } from "@/lib/stripe";
import { getSubscriptionForOrg, upsertSubscription, type PlanTier, type SubStatus } from "@/lib/hospital/subscription-store";
import { log } from "@/lib/log";
import { parseJson, z } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ReplaySchema = z.object({
  orgId: z.string().optional(),
  customerId: z.string().optional(),
}).refine((v) => v.orgId || v.customerId, { message: "orgId_or_customerId_required" });

function planFromPrice(priceId?: string | null): PlanTier {
  if (!priceId) return "starter";
  const map = (process.env.STRIPE_PRICE_MAP || "").split(",").map((s) => s.trim()).filter(Boolean);
  for (const entry of map) {
    const [price, tier] = entry.split(":");
    if (price === priceId) return (tier as PlanTier) || "starter";
  }
  return "starter";
}

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext();
  if (!ctx.isSuperAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = await parseJson(req, ReplaySchema);
  if (parsed instanceof NextResponse) return parsed;

  let customerId = parsed.customerId;
  let orgId = parsed.orgId;

  if (orgId && !customerId) {
    const existing = getSubscriptionForOrg(orgId);
    if (!existing?.stripeCustomerId) {
      return NextResponse.json({ error: "no_stripe_customer_for_org" }, { status: 404 });
    }
    customerId = existing.stripeCustomerId;
  }

  if (!customerId) {
    return NextResponse.json({ error: "customer_id_required" }, { status: 400 });
  }

  try {
    const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 1 });
    const sub = subs.data[0];
    if (!sub) return NextResponse.json({ error: "no_subscription_on_customer" }, { status: 404 });

    const priceId = sub.items.data[0]?.price?.id;

    if (!orgId) {
      // Fall back: look up by customer id in our store.
      const { getSubscriptionByCustomerId } = await import("@/lib/hospital/subscription-store");
      const local = getSubscriptionByCustomerId(customerId);
      orgId = local?.organizationId;
    }
    if (!orgId) {
      return NextResponse.json({ error: "no_org_linked_to_customer" }, { status: 404 });
    }

    upsertSubscription(orgId, {
      organizationId: orgId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      priceId,
      planTier: planFromPrice(priceId),
      status: sub.status as SubStatus,
      currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : undefined,
      trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : undefined,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    });

    log.info("stripe.replay.ok", { orgId, customerId, subId: sub.id, status: sub.status });
    return NextResponse.json({
      ok: true,
      subscription: {
        id: sub.id,
        status: sub.status,
        priceId,
        orgId,
        currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
      },
    });
  } catch (e) {
    log.error("stripe.replay.failed", e, { orgId, customerId });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
