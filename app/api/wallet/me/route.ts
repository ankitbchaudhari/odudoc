// GET /api/wallet/me
//
// Returns the signed-in entity's wallet + most-recent transactions.
// Patients get their patient wallet; doctors get their doctor wallet;
// admins get the platform wallet. The Financial Account dashboard
// surface (V8 §7.3) is built on top of this single endpoint.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureWallet, listTxns, type EntityKind } from "@/lib/wallet-store";

export const runtime = "nodejs";

function entityKindForRole(role: string | undefined): EntityKind {
  switch (role) {
    case "doctor":      return "doctor";
    case "admin":       return "platform";
    case "pharmacist":  return "pharmacy";
    case "hr":          return "platform";
    case "support":     return "platform";
    case "vendor":      return "manufacturer";
    case "staff":       return "hospital";
    default:            return "patient";
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const kind = entityKindForRole(session.user.role);
  // The entity id is the user id for individuals; for platform/admin
  // we use a singleton id so every admin shares one platform wallet.
  const entityId =
    kind === "platform" ? "platform-singleton" : (session.user.id || session.user.email);

  const wallet = await ensureWallet(kind, entityId);
  const transactions = await listTxns(wallet.id, 100);
  return NextResponse.json({ wallet, transactions });
}
