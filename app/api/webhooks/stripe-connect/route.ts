import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getVendorById, updateVendor } from "@/lib/vendors-store";
import { markPaid } from "@/lib/payouts-store";

import { log } from "@/lib/log";
export const runtime = "nodejs";

// Dedicated Stripe Connect webhook. Uses a separate signing secret
// (STRIPE_CONNECT_WEBHOOK_SECRET) because Connect events come from a
// different Stripe webhook endpoint than platform/charge events.
const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event;
  if (webhookSecret) {
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Signature verification failed";
      log.error("console.error", undefined, { args: ["[stripe-connect] bad signature:", msg] });
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  } else {
    // Dev fallback — accept unsigned payloads.
    event = JSON.parse(body);
  }

  try {
    switch (event.type) {
      case "account.updated": {
        const account = event.data.object as {
          id: string;
          payouts_enabled?: boolean;
          details_submitted?: boolean;
          metadata?: Record<string, string>;
        };
        const vendorId = account.metadata?.vendorId;
        if (vendorId && getVendorById(vendorId)) {
          updateVendor(vendorId, {
            stripeAccountId: account.id,
            stripePayoutsEnabled: Boolean(account.payouts_enabled),
            stripeDetailsSubmitted: Boolean(account.details_submitted),
          });
        }
        break;
      }
      case "transfer.paid":
      case "payout.paid": {
        // If we added `payoutEntryId` to the transfer/payout metadata, we can
        // auto-mark the ledger row paid.
        const obj = event.data.object as { metadata?: Record<string, string> };
        const entryId = obj.metadata?.payoutEntryId;
        if (entryId) markPaid(entryId);
        break;
      }
      default:
        // Ignore other Connect events for now.
        break;
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    log.error("console.error", undefined, { args: ["[stripe-connect] handler error:", err] });
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }
}
