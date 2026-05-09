// Right-to-erasure (DPDP §13).
//
// GET → list this user's erasure requests
// POST → file a new request; returns the row with its 14-day cooling-
//        off window so the UI can show "you can cancel until <date>"
// DELETE — handled per-request via /api/privacy/erasure/[id]

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  fileErasureRequest,
  listErasureRequestsForUser,
} from "@/lib/consent-vault-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  return NextResponse.json({ requests: listErasureRequestsForUser(userId) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const request = fileErasureRequest({
    userId,
    reason: typeof body.reason === "string" ? body.reason.slice(0, 1000) : undefined,
    retainDependents: Boolean(body.retainDependents),
    scopeCategories: Array.isArray(body.scopeCategories) ? body.scopeCategories.map(String) : undefined,
  });
  try { await awaitAllFlushesStrict(); } catch {
    return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
  }
  return NextResponse.json({ request });
}
