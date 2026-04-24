// Create a Stripe Billing Portal session so orgs can manage their subscription.
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { requireOrg, TenantError } from "@/lib/tenant";
import { getSubscriptionForOrg } from "@/lib/hospital/subscription-store";

import { log } from "@/lib/log";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { orgId } = await requireOrg();
    const sub = getSubscriptionForOrg(orgId);
    if (!sub?.stripeCustomerId) return NextResponse.json({ error: "no_customer" }, { status: 400 });
    const base = process.env.NEXT_PUBLIC_SITE_URL || "https://www.odudoc.com";
    const s = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${base}/admin/billing`,
    });
    return NextResponse.json({ url: s.url });
  } catch (e) {
    if (e instanceof TenantError) return NextResponse.json({ error: e.message }, { status: e.status });
    log.error("hospital.billing.portal_failed", e);
    return NextResponse.json({ error: "portal_failed" }, { status: 500 });
  }
}
