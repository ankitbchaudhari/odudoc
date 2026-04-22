// Create a Stripe Checkout session for the active organization's subscription.
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { requireOrg, TenantError } from "@/lib/tenant";
import { getSubscriptionForOrg, upsertSubscription } from "@/lib/hospital/subscription-store";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { parseJson, z, nonEmptyString } from "@/lib/validate";

import { log } from "@/lib/log";
const CheckoutSchema = z.object({
  priceId: nonEmptyString,
  quantity: z.number().int().positive().max(1000).optional(),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const blocked = await enforceRateLimit(req, "billing-checkout", 10, "10 m");
    if (blocked) return blocked;
    const { ctx, orgId } = await requireOrg();
    const parsed = await parseJson(req, CheckoutSchema);
    if (parsed instanceof NextResponse) return parsed;
    const { priceId, quantity } = parsed;

    const base = process.env.NEXT_PUBLIC_SITE_URL || "https://www.odudoc.com";
    const existing = getSubscriptionForOrg(orgId);

    // Create customer if we don't have one yet
    let customerId = existing?.stripeCustomerId;
    if (!customerId) {
      const c = await stripe.customers.create({
        email: ctx.email || undefined,
        name: ctx.organization?.name,
        metadata: { organizationId: orgId },
      });
      customerId = c.id;
      upsertSubscription(orgId, { stripeCustomerId: customerId });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: quantity || 1 }],
      success_url: `${base}/admin/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/admin/billing?canceled=1`,
      metadata: { organizationId: orgId },
      subscription_data: { metadata: { organizationId: orgId } },
    });

    return NextResponse.json({ url: session.url, id: session.id });
  } catch (e) {
    if (e instanceof TenantError) return NextResponse.json({ error: e.message }, { status: e.status });
    log.error("console.error", undefined, { args: ["[billing checkout]", e] });
    return NextResponse.json({ error: "checkout_failed" }, { status: 500 });
  }
}
