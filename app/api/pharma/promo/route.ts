// Pharma promo / detailing slots API.
//
// GET ?orgId= → all slots (admin within org)
// GET ?specialty=&city= → targeted feed for a doctor viewer
// POST → create / set_active / impression / click

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createSlot, deleteSlot, listForViewer, listSlots,
  recordClick, recordImpression, setSlotActive,
} from "@/lib/pharma/promo-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function role(session: Awaited<ReturnType<typeof getServerSession>> | null): string | undefined {
  const u = (session as { user?: { role?: string } } | null)?.user;
  return u?.role;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const orgId = url.searchParams.get("orgId");
  if (orgId) {
    return NextResponse.json({ slots: listSlots({ organizationId: orgId }) });
  }
  const specialty = url.searchParams.get("specialty") || undefined;
  const city = url.searchParams.get("city") || undefined;
  return NextResponse.json({ slots: listForViewer({ specialty, city }) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const action = body.action || "create";

  if (action === "impression") {
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    recordImpression(String(body.id));
    return NextResponse.json({ ok: true });
  }
  if (action === "click") {
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    recordClick(String(body.id));
    return NextResponse.json({ ok: true });
  }

  if (role(session) !== "admin" && role(session) !== "staff") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (action === "create") {
    if (!body.organizationId || !body.headline) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const s = createSlot({
      organizationId: String(body.organizationId),
      drugId: body.drugId,
      headline: String(body.headline),
      subhead: body.subhead,
      bodyText: body.bodyText,
      imageUrl: body.imageUrl,
      specialties: Array.isArray(body.specialties) ? body.specialties : undefined,
      cities: Array.isArray(body.cities) ? body.cities : undefined,
      cpcRupees: body.cpcRupees !== undefined ? Number(body.cpcRupees) : undefined,
      startsAt: body.startsAt,
      endsAt: body.endsAt,
    });
    try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
    return NextResponse.json({ slot: s });
  }

  if (action === "set_active") {
    if (!body.id || !body.organizationId) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    const s = setSlotActive(String(body.id), String(body.organizationId), Boolean(body.active));
    if (!s) return NextResponse.json({ error: "not_found" }, { status: 404 });
    try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
    return NextResponse.json({ slot: s });
  }

  return NextResponse.json({ error: "invalid_action" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (role(session) !== "admin" && role(session) !== "staff") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const orgId = url.searchParams.get("orgId");
  if (!id || !orgId) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  const ok = deleteSlot(id, orgId);
  if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
  return NextResponse.json({ ok: true });
}
