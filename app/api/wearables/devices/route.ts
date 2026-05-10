// Patient wearable devices — list / link / unlink.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listDevices,
  linkDevice,
  unlinkDevice,
  type WearableProvider,
} from "@/lib/wearables/store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_PROVIDERS: WearableProvider[] = [
  "fitbit", "apple_health", "google_fit", "samsung_health", "garmin",
  "mi_fit", "oura", "whoop", "manual",
];

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  return NextResponse.json({ devices: listDevices(userId) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json();
  const provider = String(body.provider || "") as WearableProvider;
  if (!ALLOWED_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: "invalid_provider" }, { status: 400 });
  }
  const displayName = String(body.displayName || "").trim();
  if (!displayName) return NextResponse.json({ error: "missing_name" }, { status: 400 });
  const device = linkDevice({
    userId,
    dependentId: body.dependentId,
    provider,
    displayName,
    externalId: body.externalId,
  });
  try { await awaitAllFlushesStrict(); } catch {
    return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
  }
  return NextResponse.json({ device });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const ok = unlinkDevice(id, userId);
  if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try { await awaitAllFlushesStrict(); } catch {
    return NextResponse.json({ error: "deleted_but_not_persisted" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
