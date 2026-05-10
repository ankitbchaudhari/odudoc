// Symptom log API.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { addSymptom, deleteSymptom, listSymptoms, summarize } from "@/lib/symptoms/store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const url = new URL(req.url);
  const symptom = url.searchParams.get("symptom") || undefined;
  const list = listSymptoms(userId, { symptom, limit: 200 });
  return NextResponse.json({
    entries: list,
    summary: summarize(userId, 30),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!body.symptom || typeof body.symptom !== "string") {
    return NextResponse.json({ error: "missing_symptom" }, { status: 400 });
  }
  const sev = Number(body.severity);
  if (!Number.isFinite(sev) || sev < 0 || sev > 10) {
    return NextResponse.json({ error: "invalid_severity" }, { status: 400 });
  }
  const e = addSymptom({
    userId,
    symptom: body.symptom,
    severity: sev,
    bodyArea: body.bodyArea,
    durationMinutes: body.durationMinutes,
    trigger: body.trigger,
    relief: body.relief,
    notes: body.notes,
    takenAt: body.takenAt,
  });
  try { await awaitAllFlushesStrict(); } catch {
    return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
  }
  return NextResponse.json({ entry: e });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const ok = deleteSymptom(id, userId);
  if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
  return NextResponse.json({ ok: true });
}
