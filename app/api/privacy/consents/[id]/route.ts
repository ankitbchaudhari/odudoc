// Per-consent: read + revoke.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getConsentForUser,
  revokeVaultConsent,
} from "@/lib/consent-vault-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteCtx { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctxParam: RouteCtx) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await ctxParam.params;
  const c = getConsentForUser(id, userId);
  if (!c) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ consent: c });
}

export async function DELETE(req: NextRequest, ctxParam: RouteCtx) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await ctxParam.params;
  let reason: string | undefined;
  try {
    const body = await req.json();
    if (typeof body?.reason === "string") reason = body.reason.slice(0, 500);
  } catch { /* body is optional */ }
  const c = revokeVaultConsent(id, userId, reason);
  if (!c) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try { await awaitAllFlushesStrict(); } catch {
    return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
  }
  return NextResponse.json({ consent: c });
}
