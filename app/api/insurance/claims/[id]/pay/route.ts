// POST /api/insurance/claims/[id]/pay
//
// Marks an approved claim as paid AND runs the wallet transfer
// (insurer → hospital). Insurer wallet must have funds; under-funded
// wallets get a 422 so finance can top up before retrying.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { payClaim, getInsurer, listClaims } from "@/lib/insurance-store";
import { ensureWallet, transfer } from "@/lib/wallet-store";

export const runtime = "nodejs";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!["admin", "support"].includes(session.user.role || "")) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // Look up the claim before payClaim mutates it so we can wire up
  // the wallet transfer with the right amounts.
  const claims = await listClaims({});
  const claim = claims.find((c) => c.id === id);
  if (!claim) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (claim.status !== "approved") return NextResponse.json({ error: "claim_not_approved" }, { status: 409 });

  const insurer = await getInsurer(claim.insurerId);
  if (!insurer) return NextResponse.json({ error: "insurer_not_found" }, { status: 404 });

  // Run the wallet transfer: insurer → hospital. Fail soft on
  // insufficient funds so finance can top up and retry.
  try {
    const insurerWallet = await ensureWallet("insurance", insurer.id, claim.currency);
    const hospitalWallet = await ensureWallet("hospital", claim.hospitalId, claim.currency);
    const amount = claim.approvedCents || claim.billedCents;
    if (insurerWallet.balanceCents < amount) {
      return NextResponse.json({ error: "insufficient_insurer_funds", needed: amount, available: insurerWallet.balanceCents }, { status: 422 });
    }
    await transfer({
      kind: "insurance_payout",
      fromWalletId: insurerWallet.id,
      toWalletId: hospitalWallet.id,
      amountCents: amount,
      currency: claim.currency,
      refKind: "claim",
      refId: claim.id,
      note: `Claim payout for ${claim.patientName} at ${claim.hospitalName}`,
      actorEmail: session.user.email,
      actorRole: session.user.role,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  const updated = await payClaim(id, { email: session.user.email, role: session.user.role });
  return NextResponse.json({ claim: updated });
}
