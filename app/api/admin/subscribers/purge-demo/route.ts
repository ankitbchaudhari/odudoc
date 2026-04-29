// Admin one-shot endpoint: wipe the legacy demo subscriber rows that
// shipped with earlier builds (user1@example.com … user304@example.com plus
// a handful of named seeds). Idempotent — clicking it twice is a no-op
// the second time. Real subscribers (added via the newsletter form or the
// auto-subscribe-on-verify hook) are untouched.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { purgeDemoSubscribers } from "@/lib/subscribers-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";

export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { removed } = purgeDemoSubscribers();
  try {
    await awaitAllFlushesStrict();
  } catch (err) {
    log.error("admin.subscribers.purge_persist_failed", err);
    return NextResponse.json(
      { error: "Removed in memory but failed to persist. Try again." },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, removed });
}
