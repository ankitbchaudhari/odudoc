import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getVendorByEmail, updateVendor } from "@/lib/vendors-store";
import { stripe } from "@/lib/stripe";

import { log } from "@/lib/log";
export const runtime = "nodejs";

// POST — create (or re-create) a Stripe Connect Express onboarding link for
// the signed-in vendor. On first call we create the connected account and
// stash the id on the Vendor record. Subsequent calls reuse it.
//
// Response: { url: string } — redirect the user here to complete onboarding.
export async function POST() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const vendor = getVendorByEmail(email);
  if (!vendor) return NextResponse.json({ error: "Not a vendor" }, { status: 404 });
  if (vendor.status !== "approved") {
    return NextResponse.json({ error: "Vendor must be approved before connecting Stripe." }, { status: 403 });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe is not configured on the server." }, { status: 500 });
  }

  try {
    let accountId = vendor.stripeAccountId;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: vendor.ownerEmail,
        business_profile: { name: vendor.name },
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
        },
        metadata: { vendorId: vendor.id },
      });
      accountId = account.id;
      updateVendor(vendor.id, { stripeAccountId: accountId });
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://www.odudoc.com";
    const link = await stripe.accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      refresh_url: `${origin}/dashboard/vendor?stripe=refresh`,
      return_url: `${origin}/dashboard/vendor?stripe=return`,
    });

    return NextResponse.json({ url: link.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Stripe onboarding failed";
    log.error("vendors.stripe.onboard_failed", err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
