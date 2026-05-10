// Tele-ICU coverage — assign + end intensivist coverage on a bed.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  assignCoverage,
  endCoverage,
} from "@/lib/teleicu/coverage-store";
import { getBed } from "@/lib/teleicu/bed-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json();
  const bedId = String(body.bedId || "").trim();
  if (!bedId) return NextResponse.json({ error: "missing_bed" }, { status: 400 });
  if (!getBed(bedId)) return NextResponse.json({ error: "bed_not_found" }, { status: 404 });
  // Self-assign by default; super-admin can pass an explicit user id.
  const intensivistUserId = String(body.intensivistUserId || session.user.id);
  const intensivistName = body.intensivistName || session.user.name || undefined;
  const c = assignCoverage({
    bedId,
    intensivistUserId,
    intensivistName,
    fromIso: body.fromIso,
    toIso: body.toIso,
  });
  try { await awaitAllFlushesStrict(); } catch {
    return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
  }
  return NextResponse.json({ coverage: c });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json();
  const id = String(body.id || "").trim();
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const c = endCoverage(id, body.endNote);
  if (!c) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try { await awaitAllFlushesStrict(); } catch {
    return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
  }
  return NextResponse.json({ coverage: c });
}
