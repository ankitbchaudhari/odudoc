// Vaccinations API.
//
// GET ?subjectKey=&dob= → derived schedule + records for one subject.
// GET (no subject)        → list of all subjects this user tracks.
// POST                    → mark a dose received.
// DELETE ?id=             → remove a record.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  addRecord, deleteRecord, listRecords, listSubjects,
} from "@/lib/vaccinations/store";
import { computeSchedule } from "@/lib/vaccinations/schedule";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const url = new URL(req.url);
  const subjectKey = url.searchParams.get("subjectKey");
  const dob = url.searchParams.get("dob");

  if (!subjectKey) {
    return NextResponse.json({ subjects: listSubjects(userId) });
  }

  const records = listRecords(userId, subjectKey);
  const marked: Record<string, { receivedDate: string; notes?: string }> = {};
  for (const r of records) {
    marked[r.vaccineId] = { receivedDate: r.receivedDate, notes: r.notes };
  }
  // Use the latest dob we know about; fall back to the URL hint.
  const subjectDob = records[0]?.subjectDob || dob || null;
  if (!subjectDob) {
    return NextResponse.json({ schedule: [], records: [], subjectDob: null });
  }
  const schedule = computeSchedule(subjectDob, marked);
  return NextResponse.json({
    schedule,
    records,
    subjectDob,
    subjectName: records[0]?.subjectName,
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!body.subjectKey || !body.subjectName || !body.subjectDob || !body.vaccineId || !body.receivedDate) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  const r = addRecord({
    userId,
    subjectKey: String(body.subjectKey),
    subjectDob: String(body.subjectDob),
    subjectName: String(body.subjectName),
    vaccineId: String(body.vaccineId),
    receivedDate: String(body.receivedDate),
    notes: body.notes,
    documentId: body.documentId,
  });
  try { await awaitAllFlushesStrict(); } catch {
    return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
  }
  return NextResponse.json({ record: r });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const ok = deleteRecord(id, userId);
  if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
  return NextResponse.json({ ok: true });
}
