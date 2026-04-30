// POST /api/mobile/push/register
//
// Mobile-Bearer-auth. Body: { token, platform, app }
// The mobile app calls this once after login (and again when the OS
// rotates the push token, which Expo notifies us of via a listener).

import { NextRequest, NextResponse } from "next/server";
import { requireMobileUser } from "@/lib/mobile-auth";
import { registerPushToken, revokePushToken } from "@/lib/push-tokens-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;

  let body: {
    token?: string;
    platform?: "ios" | "android" | "web";
    app?: "doctor" | "patient";
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const token = (body.token || "").trim();
  if (!token || token.length > 500) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }
  const platform = body.platform === "ios" || body.platform === "android" || body.platform === "web"
    ? body.platform
    : "android";
  const app = body.app === "doctor" || body.app === "patient" ? body.app : "patient";

  registerPushToken({ userEmail: auth.email, token, platform, app });
  try {
    await awaitAllFlushesStrict();
  } catch (err) {
    log.warn("push_register.persist_failed", { err: String(err) });
  }
  return NextResponse.json({ ok: true });
}

// Used by the mobile apps' sign-out flow to stop receiving on this
// device. Idempotent — safe to call multiple times.
export async function DELETE(req: NextRequest) {
  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const token = (body.token || "").trim();
  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }
  revokePushToken(auth.email, token);
  return NextResponse.json({ ok: true });
}
