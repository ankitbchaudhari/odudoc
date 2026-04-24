// GET /api/admin/mailbox/[key]/[uid]/attachment/[index]
//   → binary download of the Nth attachment on the given INBOX message.
//
// Super-admin only. Always served with
//   Content-Disposition: attachment
// (never `inline`), so a malicious HTML/SVG/PDF attachment cannot render
// in-browser under our origin — the browser will save it to disk instead.
// Combined with `X-Content-Type-Options: nosniff` this neutralises the
// classic email-attachment XSS vector.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  findMailbox,
  getMailboxCreds,
  fetchAttachment,
} from "@/lib/imap-mailbox";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Produce a Content-Disposition value that is safe for any filename, using
// RFC 5987 encoding. `filename=` (ASCII fallback) + `filename*=UTF-8''…`
// (encoded) so IE11/Edge-legacy + modern browsers both download cleanly,
// and no user-controlled bytes can break out of the header via CR/LF.
function contentDisposition(filename: string): string {
  // Strip anything that could damage the header or be mistaken for a path.
  const safeAscii = filename
    .replace(/[\r\n"]/g, "")
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/[\\/]/g, "_")
    .slice(0, 200) || "attachment";
  const encoded = encodeURIComponent(filename).replace(/['()]/g, escape);
  return `attachment; filename="${safeAscii}"; filename*=UTF-8''${encoded}`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { key: string; uid: string; index: string } },
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
    return NextResponse.json(
      { error: "Mailbox not configured" },
      { status: 503 },
    );
  }

  const uid = Number(params.uid);
  const index = Number(params.index);
  if (!Number.isFinite(uid) || !Number.isInteger(index) || index < 0) {
    return NextResponse.json({ error: "Invalid UID or index" }, { status: 400 });
  }

  try {
    const att = await fetchAttachment(creds, uid, index);
    if (!att) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 },
      );
    }

    return new NextResponse(att.content as unknown as BodyInit, {
      status: 200,
      headers: {
        // Preserve the original content type so desktop apps open it with
        // the right handler after save. The `attachment` disposition +
        // nosniff below stop the browser from auto-executing anything.
        "Content-Type": att.contentType || "application/octet-stream",
        "Content-Length": String(att.content.length),
        "Content-Disposition": contentDisposition(att.filename),
        "X-Content-Type-Options": "nosniff",
        // Don't let attachments get cached by intermediaries — mailbox
        // contents are sensitive and per-admin.
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (err) {
    log.error("admin.mailbox.attachment_fetch_failed", err, {
      key: params.key,
      uid,
      index,
    });
    const msg = err instanceof Error ? err.message : "IMAP fetch failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
