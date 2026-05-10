// Handover notes — add a new note to a bed.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { addNote } from "@/lib/teleicu/coverage-store";
import { getBed } from "@/lib/teleicu/bed-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json();
  const bedId = String(body.bedId || "").trim();
  const noteBody = String(body.body || "").trim();
  if (!bedId || !noteBody) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  if (!getBed(bedId)) return NextResponse.json({ error: "bed_not_found" }, { status: 404 });
  const tag = ["info", "concern", "critical"].includes(body.tag) ? body.tag : "info";
  const n = addNote({
    bedId,
    authorEmail: email,
    authorName: session?.user?.name || undefined,
    body: noteBody,
    tag,
  });
  try { await awaitAllFlushesStrict(); } catch {
    return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
  }
  return NextResponse.json({ note: n });
}
