// GET /api/admin/mailbox
//   → { mailboxes: [{ key, address, label, configured }] }
//
// Lists the OduDoc mailboxes this deployment can show. A mailbox is
// "configured" if its IMAP password env var is set. Super-admin only.
//
// GET /api/admin/mailbox?key=career&limit=50
//   → { mailbox: {...}, messages: InboxSummary[] }
//
// Lists the most recent messages in the given mailbox's INBOX.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  MAILBOX_CATALOG,
  findMailbox,
  getMailboxCreds,
  listInbox,
  mailboxStatus,
} from "@/lib/imap-mailbox";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  const limit = Math.min(200, Math.max(10, Number(url.searchParams.get("limit") || 50)));

  if (!key) {
    return NextResponse.json({
      mailboxes: MAILBOX_CATALOG.map((m) => ({
        key: m.key,
        address: m.address,
        label: m.label,
        ...mailboxStatus(m),
      })),
    });
  }

  const def = findMailbox(key);
  if (!def) {
    return NextResponse.json({ error: "Unknown mailbox" }, { status: 404 });
  }
  const creds = getMailboxCreds(def);
  if (!creds) {
    return NextResponse.json({
      mailbox: { key: def.key, address: def.address, label: def.label },
      configured: false,
      userEnv: def.userEnv,
      passEnv: def.passEnv,
      messages: [],
    });
  }
  try {
    const messages = await listInbox(creds, limit);
    return NextResponse.json({
      mailbox: { key: def.key, address: def.address, label: def.label },
      configured: true,
      messages,
    });
  } catch (err) {
    log.error("admin.mailbox.list_failed", err, { key });
    const msg = err instanceof Error ? err.message : "IMAP list failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
