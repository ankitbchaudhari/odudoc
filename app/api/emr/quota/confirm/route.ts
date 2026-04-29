// Confirm a Stripe Checkout session and record the EMR unlock.
// Hit by the success_url redirect; idempotent so a refresh / replay
// never double-credits.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import {
  resolveClinic,
  recordQuotaUnlock,
  reloadUnlocks,
  QUOTA_UNLOCK_AMOUNT,
} from "@/lib/emr-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { email?: string; role?: string } | undefined;
    const clinic = await resolveClinic(user?.email, user?.role);
    if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const sessionId = req.nextUrl.searchParams.get("session_id");
    if (!sessionId) {
      return NextResponse.json({ error: "session_id required" }, { status: 400 });
    }

    const checkout = await stripe.checkout.sessions.retrieve(sessionId);
    if (checkout.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment not completed yet." },
        { status: 402 }
      );
    }
    const md = checkout.metadata || {};
    if (md.kind !== "emr-quota-unlock") {
      return NextResponse.json({ error: "Wrong session type." }, { status: 400 });
    }

    // Cross-check that the buyer is the same clinic owner. We don't
    // want an attacker who knows another clinic's session_id to credit
    // their own clinic.
    const expectedOwner = (md.ownerEmail || "").toLowerCase();
    const ownerEmail = clinic.role === "admin" ? clinic.userEmail : clinic.ownerEmail;
    if (expectedOwner !== ownerEmail.toLowerCase()) {
      return NextResponse.json(
        { error: "This payment session belongs to a different clinic." },
        { status: 403 }
      );
    }

    await reloadUnlocks();
    const unlock = await recordQuotaUnlock({
      ownerEmail,
      month: md.month,
      amount: QUOTA_UNLOCK_AMOUNT,
      currency: (checkout.currency || "usd").toUpperCase(),
      stripeSessionId: sessionId,
      stripePaymentIntent:
        typeof checkout.payment_intent === "string"
          ? checkout.payment_intent
          : checkout.payment_intent?.id,
    });

    try {
      await awaitAllFlushesStrict();
    } catch (err) {
      log.error("emr.quota.unlock_persist_failed", err, { ownerEmail });
      return NextResponse.json(
        { error: "Payment received but unlock not yet recorded — refresh in a moment." },
        { status: 503 }
      );
    }
    return NextResponse.json({ ok: true, unlock });
  } catch (err) {
    log.error("emr.quota.confirm_failed", err);
    return NextResponse.json(
      { error: "Could not confirm payment. Contact support." },
      { status: 500 }
    );
  }
}
