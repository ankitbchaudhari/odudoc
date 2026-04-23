// GET /api/admin/mailbox/[key]/[uid]
//   → { message: FullMessage }
//
// Fetch a single parsed message (text + sanitized-for-iframe HTML,
// attachment list, headers). Marks the message as Seen as a side effect.
// Super-admin only.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findMailbox, getMailboxCreds, fetchMessage } from "@/lib/imap-mailbox";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { key: string; uid: string } },
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const def = findMailbox(params.key);
  if (!def) {
    return NextResponse.json({ error: "Unknown mailbox" }, { status: 404 });
  }
  const creds = getMailboxCreds(def);
  if (!creds) {
    return NextResponse.json({ error: "Mailbox not configured" }, { status: 503 });
  }
  const uid = Number(params.uid);
  if (!Number.isFinite(uid)) {
    return NextResponse.json({ error: "Invalid UID" }, { status: 400 });
  }
  try {
    const message = await fetchMessage(creds, uid);
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }
    return NextResponse.json({ message });
  } catch (err) {
    log.error("admin.mailbox.fetch_failed", err, { key: params.key, uid });
    const msg = err instanceof Error ? err.message : "IMAP fetch failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
