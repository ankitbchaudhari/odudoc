// Admin test-send endpoint. Lets an admin fire a real message on each
// channel from the admin panel to verify Twilio/Resend creds are wired.
//
// POST { channel, to, subject?, body }

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notify, isChannelConfigured, type NotifyChannel } from "@/lib/notifications/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHANNELS: NotifyChannel[] = ["sms", "whatsapp", "email"];

export async function GET() {
  return NextResponse.json({
    configured: {
      sms: isChannelConfigured("sms"),
      whatsapp: isChannelConfigured("whatsapp"),
      email: isChannelConfigured("email"),
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || (role !== "admin" && role !== "owner")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  if (!CHANNELS.includes(body.channel)) {
    return NextResponse.json({ error: "invalid_channel" }, { status: 400 });
  }
  if (!body.to || typeof body.to !== "string") {
    return NextResponse.json({ error: "missing_to" }, { status: 400 });
  }
  if (!body.body || typeof body.body !== "string") {
    return NextResponse.json({ error: "missing_body" }, { status: 400 });
  }
  const result = await notify({
    channel: body.channel as NotifyChannel,
    to: String(body.to).trim(),
    subject: body.subject ? String(body.subject) : "OduDoc test message",
    body: String(body.body),
    category: "generic",
  });
  return NextResponse.json(result);
}
