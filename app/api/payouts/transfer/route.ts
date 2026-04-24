import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { getVendorById } from "@/lib/vendors-store";
import {
  getPayoutEntry,
  setTransferInitiated,
  setTransferError,
} from "@/lib/payouts-store";

import { log } from "@/lib/log";
export const runtime = "nodejs";

function isAdmin(role: string | undefined): boolean {
  return role === "admin";
}

interface TransferResult {
  id: string;
  ok: boolean;
  transferId?: string;
  error?: string;
}

// POST /api/payouts/transfer  body: { ids: string[] }
//
// For each payout entry, issue a stripe.transfers.create to the vendor's
// connected account. The Connect webhook finalizes the entry by calling
// markPaid when `transfer.paid` fires (matched via metadata.payoutEntryId).
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Stripe is not configured on the server." },
      { status: 500 }
    );
  }
  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "No ids provided" }, { status: 400 });
  }

  const results: TransferResult[] = [];
  for (const id of ids) {
    const entry = getPayoutEntry(id);
    if (!entry) {
      results.push({ id, ok: false, error: "Entry not found" });
      continue;
    }
    if (entry.status === "paid") {
      results.push({ id, ok: false, error: "Already paid" });
      continue;
    }
    if (entry.stripeTransferId) {
      results.push({
        id,
        ok: false,
        error: "Transfer already initiated",
        transferId: entry.stripeTransferId,
      });
      continue;
    }
    const vendor = getVendorById(entry.vendorId);
    if (!vendor?.stripeAccountId) {
      const msg = "Vendor has no Stripe account";
      setTransferError(id, msg);
      results.push({ id, ok: false, error: msg });
      continue;
    }
    if (!vendor.stripePayoutsEnabled) {
      const msg = "Vendor Stripe payouts not enabled";
      setTransferError(id, msg);
      results.push({ id, ok: false, error: msg });
      continue;
    }
    try {
      const transfer = await stripe.transfers.create({
        amount: Math.round(entry.netAmount * 100),
        currency: "usd",
        destination: vendor.stripeAccountId,
        description: `OduDoc payout for order ${entry.orderNumber}`,
        metadata: {
          payoutEntryId: entry.id,
          orderId: entry.orderId,
          vendorId: entry.vendorId,
        },
      });
      setTransferInitiated(id, transfer.id);
      results.push({ id, ok: true, transferId: transfer.id });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Transfer failed";
      log.error("payouts.transfer_failed", err, { id });
      setTransferError(id, msg);
      results.push({ id, ok: false, error: msg });
    }
  }

  return NextResponse.json({ results });
}
