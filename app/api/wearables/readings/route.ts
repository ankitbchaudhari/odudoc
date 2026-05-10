// Wearable readings — bulk ingest + list.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  ingestReadings,
  listReadings,
  markSync,
  getDevice,
  type IngestReadingInput,
  type ReadingKind,
} from "@/lib/wearables/store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") as ReadingKind | null;
  const fromIso = url.searchParams.get("from") || undefined;
  const toIso = url.searchParams.get("to") || undefined;
  const dependentId = url.searchParams.get("dependentId") || undefined;
  const items = listReadings({
    userId,
    dependentId,
    kind: kind || undefined,
    fromIso,
    toIso,
  });
  return NextResponse.json({ readings: items });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json();
  const items: IngestReadingInput[] = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) return NextResponse.json({ error: "no_items" }, { status: 400 });
  // Each row must reference a device the user owns. Drop strangers.
  const valid = items.filter((it) => {
    const d = getDevice(it.deviceId);
    return d && d.userId === userId;
  });
  if (valid.length === 0) return NextResponse.json({ error: "no_valid_items" }, { status: 400 });
  // Stamp the userId so callers can't spoof another user.
  for (const v of valid) v.userId = userId;
  const inserted = ingestReadings(valid);
  // Bump lastSyncAt on every distinct device referenced.
  const seen = new Set<string>();
  for (const r of inserted) {
    if (!seen.has(r.deviceId)) {
      markSync(r.deviceId);
      seen.add(r.deviceId);
    }
  }
  try { await awaitAllFlushesStrict(); } catch {
    return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
  }
  return NextResponse.json({ inserted: inserted.length });
}
