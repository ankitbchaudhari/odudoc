// Finalise the Twilio Verify check. On success we issue a short-lived
// consult-token that /api/rooms exchanges for a real video room.

import { NextRequest, NextResponse } from "next/server";
import { checkVerification, toE164 } from "@/lib/consult-otp";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { phone?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const phone = toE164((body.phone || "").trim());
  const code = (body.code || "").trim();
  if (!phone || !code) {
    return NextResponse.json({ error: "Phone and code are required" }, { status: 400 });
  }

  const result = await checkVerification(phone, code);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    consultToken: result.token,
    firstName: result.firstName,
    lastName: result.lastName,
    phone: result.phone,
  });
}
