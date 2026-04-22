import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listSubscribers } from "@/lib/subscribers-store";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

function isAdmin(role: string | undefined): boolean {
  return role === "admin";
}

// Very small markdown-ish to HTML: keep it simple — escape, convert blank
// lines to paragraphs, and preserve single newlines as <br>.
function toHtml(plain: string): string {
  const esc = plain
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const paragraphs = esc.split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`);
  return paragraphs.join("\n");
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const message = typeof body.message === "string" ? body.message : "";
  const testEmail = typeof body.testEmail === "string" ? body.testEmail.trim() : "";
  if (!subject || !message) return NextResponse.json({ error: "subject and message required" }, { status: 400 });

  const html = typeof body.html === "string" && body.html.trim()
    ? body.html
    : toHtml(message);

  // Test mode — single recipient, don't touch the real list.
  if (testEmail) {
    const r = await sendEmail({ from: "promotion", to: testEmail, subject, html });
    return NextResponse.json({ ok: r.ok, test: true, recipients: 1, skipped: r.skipped, error: r.error });
  }

  const subs = listSubscribers({ activeOnly: true });
  const recipients = subs.map((s) => s.email);
  if (!recipients.length) return NextResponse.json({ error: "No active subscribers" }, { status: 400 });

  // Resend accepts up to 50 recipients per call with BCC-style fanout. We
  // batch to keep per-request load low and avoid rate-limit spikes.
  const BATCH = 50;
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (let i = 0; i < recipients.length; i += BATCH) {
    const chunk = recipients.slice(i, i + BATCH);
    const r = await sendEmail({ from: "promotion", to: chunk, subject, html });
    if (r.skipped) skipped += chunk.length;
    else if (r.ok) sent += chunk.length;
    else failed += chunk.length;
  }

  return NextResponse.json({ ok: failed === 0, recipients: recipients.length, sent, failed, skipped });
}
