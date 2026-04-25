// /api/notifications/mobile/register-device
//
// POST  — register or refresh a Firebase registration token for the
//         authenticated user. The Android app calls this on:
//           - first launch after login (token from FirebaseMessaging)
//           - whenever the FCM SDK rotates the token
//           - whenever the user re-authenticates
//         Idempotent: the same token + user combo just bumps lastSeenAt.
//
// DELETE — unregister a token. Called on logout so we don't keep pushing
//          to a device that just signed out.

import { NextRequest, NextResponse } from "next/server";
import { upsertDeviceToken, removeDeviceToken } from "@/lib/device-tokens-store";
import { requireMobileUser } from "@/lib/mobile-auth";
import { parseJson, z } from "@/lib/validate";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const RegisterSchema = z.object({
  token: z.string().trim().min(20).max(4096),
  platform: z.enum(["android", "ios"]).default("android"),
  appVersion: z.string().trim().max(32).optional(),
});

const DeleteSchema = z.object({
  token: z.string().trim().min(20).max(4096),
});

export async function POST(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseJson(request, RegisterSchema);
  if (parsed instanceof NextResponse) return parsed;

  try {
    const record = await upsertDeviceToken({
      token: parsed.token,
      userId: auth.userId,
      email: auth.email,
      role: auth.role,
      platform: parsed.platform,
      appVersion: parsed.appVersion,
    });
    return NextResponse.json({
      ok: true,
      registeredAt: record.registeredAt,
      lastSeenAt: record.lastSeenAt,
    });
  } catch (err) {
    log.error("device-token register error", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseJson(request, DeleteSchema);
  if (parsed instanceof NextResponse) return parsed;

  try {
    const removed = await removeDeviceToken(parsed.token);
    return NextResponse.json({ ok: true, removed });
  } catch (err) {
    log.error("device-token delete error", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
