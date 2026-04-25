// Start a Twilio Verify check for the guest video-consult gate. Twilio
// owns code generation + delivery; we just pass the phone and the channel.

import { NextRequest, NextResponse } from "next/server";
import { startVerification, toE164, isVerifyConfigured } from "@/lib/consult-otp";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { log } from "@/lib/log";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Twilio Verify charges per send. Without a limit, anyone can hose
  // /api/consult/otp/send and rack up an SMS bill — cap at 5/min/IP and
  // 20/hour/IP. Real users send at most 1-2 codes; the burst window is
  // generous enough to absorb a Resend retry.
  const burstBlocked = await enforceRateLimit(req, "consult-otp-send", 5, "1 m");
  if (burstBlocked) return burstBlocked;
  const hourBlocked = await enforceRateLimit(req, "consult-otp-send-hour", 20, "1 h");
  if (hourBlocked) return hourBlocked;

  let body: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    channel?: "sms" | "whatsapp" | "call";
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const firstName = (body.firstName || "").trim();
  const lastName = (body.lastName || "").trim();
  const rawPhone = (body.phone || "").trim();
  const channel = body.channel === "whatsapp" || body.channel === "call" ? body.channel : "sms";

  if (!firstName) return NextResponse.json({ error: "First name is required" }, { status: 400 });
  if (!lastName) return NextResponse.json({ error: "Last name is required" }, { status: 400 });
  if (!rawPhone) return NextResponse.json({ error: "Phone number is required" }, { status: 400 });

  const phone = toE164(rawPhone);
  if (phone.replace(/\D/g, "").length < 8) {
    return NextResponse.json({ error: "Please enter a valid phone number with country code." }, { status: 400 });
  }

  if (!isVerifyConfigured()) {
    return NextResponse.json(
      { error: "Verification service is not configured. Please try again later." },
      { status: 503 },
    );
  }

  const result = await startVerification(phone, firstName, lastName, channel);
  if (!result.ok) {
    log.warn("consult-otp.start_failed", { phone, channel, error: result.error });
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    channel: result.channel,
    phoneHint: phone.replace(/\d(?=\d{4})/g, "•"),
  });
}
