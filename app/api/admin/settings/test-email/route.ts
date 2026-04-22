import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const to = typeof body.to === "string" ? body.to.trim() : "";
  if (!to) {
    return NextResponse.json({ error: "Recipient email required" }, { status: 400 });
  }
  const result = await sendEmail({
    from: "admin",
    to,
    subject: "OduDoc SMTP test email",
    html: `<div style="font-family:Arial,sans-serif;padding:24px">
      <h2 style="margin:0 0 12px">SMTP test from OduDoc admin</h2>
      <p style="margin:0;color:#555">If you're reading this, outbound email is working. Sent at ${new Date().toISOString()}.</p>
    </div>`,
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true, skipped: result.skipped === true, id: result.id });
}
