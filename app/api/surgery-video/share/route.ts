// Mint / list / revoke surgery video share tokens. POST mints (auth
// required); GET lists for a session (admin/staff/doctor); DELETE
// revokes (admin/staff/doctor).

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listForSession, mintToken, revoke } from "@/lib/surgery-video/share-tokens";
import { getSession } from "@/lib/surgery-video/store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function role(session: Awaited<ReturnType<typeof getServerSession>> | null): string | undefined {
  const u = (session as { user?: { role?: string } } | null)?.user;
  return u?.role;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (role(session) !== "admin" && role(session) !== "staff" && role(session) !== "doctor") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");
  const orgId = url.searchParams.get("orgId");
  if (!sessionId || !orgId) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  return NextResponse.json({ tokens: listForSession(sessionId, orgId) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (role(session) !== "admin" && role(session) !== "staff" && role(session) !== "doctor") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const { sessionId, organizationId, ttlHours, maxIpUses } = body as {
    sessionId?: string; organizationId?: string; ttlHours?: number; maxIpUses?: number;
  };
  if (!sessionId || !organizationId) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  if (!getSession(sessionId, organizationId)) return NextResponse.json({ error: "session_not_found" }, { status: 404 });
  const userId = (session?.user as { id?: string } | undefined)?.id || "unknown";
  const t = mintToken({
    sessionId, organizationId,
    mintedByUserId: userId,
    mintedByEmail: session?.user?.email || undefined,
    ttlSeconds: Math.max(60 * 60, Math.min(7 * 24 * 60 * 60, (ttlHours ?? 24) * 3600)),
    maxIpUses: typeof maxIpUses === "number" ? Math.max(0, Math.min(50, maxIpUses)) : 5,
  });
  try { await awaitAllFlushesStrict(); } catch { /* */ }
  return NextResponse.json({ token: t.id, expiresAt: t.expiresAt, maxIpUses: t.maxIpUses });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (role(session) !== "admin" && role(session) !== "staff" && role(session) !== "doctor") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const orgId = url.searchParams.get("orgId");
  if (!token || !orgId) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  const ok = revoke(token, orgId);
  if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try { await awaitAllFlushesStrict(); } catch { /* */ }
  return NextResponse.json({ ok: true });
}
