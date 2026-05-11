// Per-user notification preferences API.
//
// GET  → current user's prefs (or defaults)
// POST → update channel order / opt-outs / DND

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getPreferences,
  setPreferences,
  type NotifyCategory,
} from "@/lib/notifications/preferences-store";
import type { NotifyChannel } from "@/lib/notifications/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHANNELS: NotifyChannel[] = ["whatsapp", "sms", "email"];
const CATEGORIES: NotifyCategory[] = [
  "appointment",
  "reminder",
  "result",
  "billing",
  "marketing",
  "alert",
  "discharge",
  "vaccination",
  "otp",
  "generic",
];

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  return NextResponse.json({ preferences: getPreferences(userId) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  let channelOrder: NotifyChannel[] | undefined;
  if (Array.isArray(body.channelOrder)) {
    const filtered = body.channelOrder.filter((c: string) => CHANNELS.includes(c as NotifyChannel));
    channelOrder = filtered.length > 0 ? filtered : undefined;
  }

  let optedOutCategories: NotifyCategory[] | undefined;
  if (Array.isArray(body.optedOutCategories)) {
    optedOutCategories = body.optedOutCategories.filter((c: string) =>
      CATEGORIES.includes(c as NotifyCategory)
    );
  }

  const doNotDisturb = typeof body.doNotDisturb === "boolean" ? body.doNotDisturb : undefined;

  const saved = await setPreferences(userId, {
    channelOrder,
    optedOutCategories,
    doNotDisturb,
  });
  return NextResponse.json({ preferences: saved });
}
