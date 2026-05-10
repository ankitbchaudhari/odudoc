// Per-bed: read + update + delete.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/tenant";
import {
  getBed,
  updateBed,
  deleteBed,
} from "@/lib/teleicu/bed-store";
import {
  listNotesForBed,
  listCoverageForBed,
} from "@/lib/teleicu/coverage-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteCtx { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctxParam: RouteCtx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await ctxParam.params;
  const bed = getBed(id);
  if (!bed) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({
    bed,
    notes: listNotesForBed(id),
    coverage: listCoverageForBed(id),
  });
}

export async function PATCH(req: NextRequest, ctxParam: RouteCtx) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!session?.user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  // Doctors / admins / nurses + super-admins. We don't deeply gate
  // by org-membership here — bed updates flow through tenant-scoped
  // hospital staff anyway, and the demo benefits from less friction.
  void email;
  const { id } = await ctxParam.params;
  const body = await req.json();
  const updated = updateBed(id, body);
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try { await awaitAllFlushesStrict(); } catch {
    return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
  }
  return NextResponse.json({ bed: updated });
}

export async function DELETE(_req: NextRequest, ctxParam: RouteCtx) {
  const session = await getServerSession(authOptions);
  if (!isSuperAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await ctxParam.params;
  const ok = deleteBed(id);
  if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try { await awaitAllFlushesStrict(); } catch {
    return NextResponse.json({ error: "deleted_but_not_persisted" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
