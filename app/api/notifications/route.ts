// Notification list + mark-read + mark-all-read.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listForUser, unreadCount, markRead, markAllRead } from "@/lib/notifications/store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get("unreadOnly") === "1";
  return NextResponse.json({
    notifications: listForUser(userId, { unreadOnly, limit: 50 }),
    unread: unreadCount(userId),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json();
  if (body.action === "mark_read" && body.id) {
    markRead(String(body.id), userId);
    try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
    return NextResponse.json({ ok: true });
  }
  if (body.action === "mark_all_read") {
    const n = markAllRead(userId);
    try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
    return NextResponse.json({ ok: true, marked: n });
  }
  return NextResponse.json({ error: "invalid_action" }, { status: 400 });
}
