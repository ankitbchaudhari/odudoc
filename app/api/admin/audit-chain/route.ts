// /api/admin/audit-chain
//   GET — chain head + verification status. Used by the admin to see
//   how many envelopes are sealed + whether the integrity chain is
//   still consistent. Recommended cron: monthly via /api/cron/...
//   for full chain verification.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { chainHead, verifyChain } from "@/lib/audit-envelope";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const head = chainHead();
  const verification = verifyChain();
  return NextResponse.json({
    head,
    verification,
  });
}
