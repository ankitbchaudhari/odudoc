// Admin self-test for outbound email + SMS.
//
// One-shot endpoint admins hit during pre-launch to verify Resend (email)
// and Twilio (SMS) are wired and credentialed correctly. Sends a single
// test message to a recipient supplied in the POST body, returning the
// per-channel result (ok / skipped / error message + provider id).
//
// GET returns a config snapshot — which env vars are present, which are
// missing — without sending anything. Handy for "is the staging deploy
// pointing at the live keys?" sanity checks.
//
// Both verbs are admin-gated. We don't want this to be a free
// outbound-spam vector for anyone who finds the URL.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { sendSms } from "@/lib/sms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAdmin() {
  const s = await getServerSession(authOptions);
  return s?.user && (s.user as { role?: string }).role === "admin";
}

function maskKey(v?: string): string | null {
  if (!v) return null;
  const t = v.trim();
  if (!t) return null;
  if (t.length <= 8) return `set (${t.length} chars)`;
  return `${t.slice(0, 4)}…${t.slice(-2)} (${t.length} chars)`;
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json({
    email: {
      provider: "Resend",
      RESEND_API_KEY: maskKey(process.env.RESEND_API_KEY),
      RESEND_WEBHOOK_SECRET: maskKey(process.env.RESEND_WEBHOOK_SECRET),
      configured: !!process.env.RESEND_API_KEY,
    },
    sms: {
      provider: "Twilio",
      TWILIO_ACCOUNT_SID: maskKey(process.env.TWILIO_ACCOUNT_SID),
      TWILIO_AUTH_TOKEN: maskKey(process.env.TWILIO_AUTH_TOKEN),
      TWILIO_FROM_NUMBER:
        process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_PHONE_NUMBER || null,
      configured:
        !!process.env.TWILIO_ACCOUNT_SID &&
        !!process.env.TWILIO_AUTH_TOKEN &&
        !!(process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_PHONE_NUMBER),
    },
  });
}

interface TestBody {
  email?: string;
  phone?: string;
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: TestBody = {};
  try {
    body = (await req.json()) as TestBody;
  } catch {
    /* empty body OK */
  }

  const ts = new Date().toISOString();
  const results: Record<string, unknown> = { sentAt: ts };

  if (body.email) {
    const html = `
      <div style="font-family:system-ui,-apple-system,sans-serif;padding:24px;max-width:520px;margin:auto;">
        <h2 style="color:#0f766e;">OduDoc deliverability test</h2>
        <p>If you're seeing this, Resend is correctly configured for the OduDoc production deploy.</p>
        <p style="color:#6b7280;font-size:13px;">Sent at ${ts}</p>
        <p style="color:#6b7280;font-size:12px;">This is an admin-triggered test. No action required.</p>
      </div>`;
    const r = await sendEmail({
      from: "no-reply",
      to: body.email,
      subject: "OduDoc deliverability test",
      html,
    });
    results.email = r;
  } else {
    results.email = { skipped: true, reason: "no email recipient supplied" };
  }

  if (body.phone) {
    const r = await sendSms(
      body.phone,
      `OduDoc deliverability test — Twilio is wired correctly. ${ts}`,
    );
    results.sms = r;
  } else {
    results.sms = { skipped: true, reason: "no phone recipient supplied" };
  }

  return NextResponse.json(results);
}
