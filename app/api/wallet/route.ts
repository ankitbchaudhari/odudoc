// Wallet read + top-up + spend.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getWallet,
  listTransactionsForUser,
  applyTopUp,
  applySpend,
} from "@/lib/wallet/store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  return NextResponse.json({
    wallet: getWallet(userId),
    transactions: listTransactionsForUser(userId, 100),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json();
  const action = String(body.action || "");

  if (action === "topup") {
    const amount = Number(body.amountRupees);
    if (!Number.isFinite(amount)) return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
    const r = applyTopUp({
      userId,
      amountRupees: Math.floor(amount),
      providerSid: body.providerSid,
      note: body.note,
    });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
    return NextResponse.json(r);
  }

  if (action === "spend") {
    const amount = Number(body.amountRupees);
    if (!Number.isFinite(amount)) return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
    const r = applySpend({
      userId,
      amountRupees: Math.floor(amount),
      category: body.category || "other",
      reference: body.reference,
      note: body.note,
    });
    if (!r.ok) return NextResponse.json(r, { status: r.error === "insufficient_funds" ? 402 : 400 });
    try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
    return NextResponse.json(r);
  }

  return NextResponse.json({ error: "invalid_action" }, { status: 400 });
}
