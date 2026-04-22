// Admin-only diagnostic: POST { to, subject?, body? } → sends a test email
// via the production Resend wrapper and returns the actual Resend response
// (id on success, error text on failure).
//
// Use this to prove the email pipeline is working when users report not
// receiving verification / booking / withdrawal emails — the most common
// causes are a missing RESEND_API_KEY, an unverified sending domain, or
// the recipient being a disposable email provider that silently drops.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { to?: string; subject?: string; html?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const to = (body.to || "").trim();
  if (!to || !to.includes("@")) {
    return NextResponse.json({ error: "Valid recipient required" }, { status: 400 });
  }

  const result = await sendEmail({
    from: "no-reply",
    to,
    subject: body.subject || "OduDoc — test email",
    html:
      body.html ||
      `<p>This is a diagnostic email from OduDoc admin.</p>
       <p>If you received this, Resend delivery is working.</p>
       <p style="color:#888;font-size:12px">Sent at ${new Date().toISOString()}</p>`,
  });

  // Expose everything (including skipped/error) so the admin can see whether
  // the key was even configured.
  return NextResponse.json({
    resendApiKeyConfigured: Boolean(process.env.RESEND_API_KEY?.trim()),
    result,
  });
}
