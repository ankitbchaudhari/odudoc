import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getVendorByEmail, updateVendor } from "@/lib/vendors-store";
import { stripe } from "@/lib/stripe";

import { log } from "@/lib/log";
export const runtime = "nodejs";

// GET — re-fetch the vendor's connected account from Stripe and mirror the
// onboarding flags onto our Vendor record. Called after the user returns from
// the hosted onboarding flow, or whenever the dashboard mounts.
export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const vendor = getVendorByEmail(email);
  if (!vendor) return NextResponse.json({ error: "Not a vendor" }, { status: 404 });
  if (!vendor.stripeAccountId) {
    return NextResponse.json({
      stripeAccountId: null,
      payoutsEnabled: false,
      detailsSubmitted: false,
    });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe is not configured on the server." }, { status: 500 });
  }

  try {
    const account = await stripe.accounts.retrieve(vendor.stripeAccountId);
    const updated = updateVendor(vendor.id, {
      stripePayoutsEnabled: Boolean(account.payouts_enabled),
      stripeDetailsSubmitted: Boolean(account.details_submitted),
    });
    return NextResponse.json({
      stripeAccountId: vendor.stripeAccountId,
      payoutsEnabled: Boolean(account.payouts_enabled),
      detailsSubmitted: Boolean(account.details_submitted),
      vendor: updated,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Stripe refresh failed";
    log.error("console.error", undefined, { args: ["[vendors.stripe.refresh]", err] });
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
