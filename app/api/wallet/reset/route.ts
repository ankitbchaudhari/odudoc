// Self-serve wallet reset.
//
// Lets the signed-in patient wipe their own wallet — used to clean
// up bogus sandbox credit minted before the safety fix landed
// (earlier versions of /api/wallet/topup-create auto-credited the
// wallet whenever Cashfree returned 401, so any deploy with invalid
// keys piled up "free" balance). The route deletes the account row
// and every transaction tombstoned to this user, so the next
// getWallet() rebuilds a fresh ₹0 / $0 account.
//
// Authenticated to the signed-in user — you can only wipe your own
// wallet. Returns the freshly-rebuilt zero wallet so the UI can
// re-render without a second fetch.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deleteWalletForUser, getWallet } from "@/lib/wallet/store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const removed = deleteWalletForUser(userId);
  try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
  log.info("wallet.reset", { userId, removed });
  return NextResponse.json({
    ok: true,
    removed,
    wallet: getWallet(userId),
  });
}
