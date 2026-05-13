// Vital signs API.
//
// GET → all readings for the signed-in user, optionally filtered by
//       ?kind=bp|weight|glucose|...
// POST → log a new reading. Body: { kind, value, value2?, context?, note?, takenAt? }
// DELETE → ?id=<id> removes one reading owned by the user.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  addReading, deleteReading, listReadings, latestPerKind,
  classify, VitalKind, VitalReading,
} from "@/lib/vitals/store";
import { wearableVitalsFor, isWearableVitalId } from "@/lib/vitals/wearable-merge";
import { maybeAlertOnReading } from "@/lib/vitals/alerts";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_KINDS: VitalKind[] = ["bp", "weight", "glucose", "heart_rate", "temperature", "spo2", "respiration"];

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") as VitalKind | null;
  const wantKind = kind && VALID_KINDS.includes(kind) ? kind : undefined;

  // Manual self-reported readings.
  const manual = listReadings(userId, { kind: wantKind, limit: 200 });

  // Wearable-sourced readings projected into the VitalReading shape.
  // The /dashboard/vitals page treats both sources as one timeline so
  // the patient sees a single chart whether they log a BP cuff
  // reading manually or have an Apple Watch syncing it overnight.
  const wearable = wearableVitalsFor(userId).filter((r) => !wantKind || r.kind === wantKind);

  const merged: VitalReading[] = [...manual, ...wearable].sort(
    (a, b) => (a.takenAt < b.takenAt ? 1 : -1),
  );

  // Recompute latest-per-kind across the merged stream so the
  // dashboard tiles surface the most recent value regardless of
  // source.
  const latest = {} as Record<VitalKind, VitalReading | undefined>;
  for (const r of merged) {
    const cur = latest[r.kind];
    if (!cur || new Date(r.takenAt) > new Date(cur.takenAt)) latest[r.kind] = r;
  }

  return NextResponse.json({
    readings: merged.slice(0, 400).map((r) => ({
      ...r,
      severity: classify(r),
      source: r.id.startsWith("w-") ? "wearable" : "manual",
    })),
    latest,
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const kind = body.kind as VitalKind;
  if (!VALID_KINDS.includes(kind)) {
    return NextResponse.json({ error: "invalid_kind" }, { status: 400 });
  }
  const value = Number(body.value);
  if (!Number.isFinite(value)) {
    return NextResponse.json({ error: "invalid_value" }, { status: 400 });
  }
  const value2 = body.value2 !== undefined && body.value2 !== "" ? Number(body.value2) : undefined;
  if (kind === "bp" && (!Number.isFinite(value2 as number))) {
    return NextResponse.json({ error: "bp_requires_diastolic" }, { status: 400 });
  }
  const r = addReading({
    userId, kind, value, value2,
    context: body.context, note: body.note,
    takenAt: body.takenAt,
  });
  // If critical AND patient is currently admitted, fan out an alert
  // to every assigned doctor on the admission. Best-effort — the
  // reading is already persisted at this point.
  let alerted: string[] = [];
  try { alerted = maybeAlertOnReading(r).alertedDoctorEmails; } catch { /* skip */ }
  try { await awaitAllFlushesStrict(); } catch {
    return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
  }
  return NextResponse.json({
    reading: { ...r, severity: classify(r) },
    alerted,
  });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  if (isWearableVitalId(id)) {
    return NextResponse.json(
      { error: "wearable_readings_are_read_only", hint: "Unlink the device from /dashboard/wearables to remove its data." },
      { status: 400 },
    );
  }
  const ok = deleteReading(id, userId);
  if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
  return NextResponse.json({ ok: true });
}
