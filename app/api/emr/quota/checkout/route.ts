// Create a Stripe Checkout session for the $50 EMR monthly unlock.
//
// Flow:
//   1. Doctor hits the quota wall (50 patients in current calendar month).
//   2. Client POSTs here. We create a one-shot $50 USD checkout session,
//      stamping ownerEmail + month in metadata so the success route can
//      record the unlock.
//   3. Stripe redirects back to /api/emr/quota/confirm?session_id=...
//      which validates payment and records the unlock row.
//
// We intentionally do NOT depend on a Stripe webhook here — the confirm
// endpoint is sync and good enough for the small-clinic load. If we
// later add a webhook, recordQuotaUnlock is idempotent on stripeSessionId.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import {
  resolveClinic,
  getQuotaState,
  QUOTA_UNLOCK_AMOUNT,
} from "@/lib/emr-store";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { email?: string; role?: string } | undefined;
    const clinic = await resolveClinic(user?.email, user?.role);
    if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (clinic.role !== "owner" && clinic.role !== "admin") {
      return NextResponse.json(
        { error: "Only the clinic owner can purchase the unlock." },
        { status: 403 }
      );
    }

    const ownerEmail = clinic.role === "admin" ? clinic.userEmail : clinic.ownerEmail;
    const quota = await getQuotaState(ownerEmail);
    if (quota.unlocked) {
      return NextResponse.json(
        { error: "This month is already unlocked." },
        { status: 400 }
      );
    }

    const base = process.env.NEXT_PUBLIC_SITE_URL || "https://www.odudoc.com";
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: ownerEmail,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: QUOTA_UNLOCK_AMOUNT * 100,
            product_data: {
              name: `OduDoc EMR — Unlimited patients for ${quota.month}`,
              description:
                "One-time unlock that lifts the 50-patient cap for the current calendar month.",
            },
          },
        },
      ],
      success_url: `${base}/dashboard/doctor/emr?unlocked=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/dashboard/doctor/emr?canceled=1`,
      metadata: {
        kind: "emr-quota-unlock",
        ownerEmail,
        month: quota.month,
      },
      payment_intent_data: {
        metadata: {
          kind: "emr-quota-unlock",
          ownerEmail,
          month: quota.month,
        },
      },
    });
    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    log.error("emr.quota.checkout_failed", err);
    return NextResponse.json(
      { error: "Could not start checkout. Please retry." },
      { status: 500 }
    );
  }
}
