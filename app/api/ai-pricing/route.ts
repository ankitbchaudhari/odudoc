// AI pricing override API.
//
// GET ?ownerKind=&ownerId= → defaults + this owner's overrides
// POST → upsert override (admin/staff)
// DELETE ?ownerKind=&ownerId=&feature= → clear override

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AI_PRICING, type AiFeature } from "@/lib/ai-metering/store";
import {
  clearOverride, listOverrides, upsertOverride,
} from "@/lib/ai-metering/pricing-overrides";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FEATURES: AiFeature[] = ["ddx", "scribe", "ocr", "triage", "translation", "image_analysis", "voice_transcript", "rx_safety", "summarize"];

function role(session: Awaited<ReturnType<typeof getServerSession>> | null): string | undefined {
  const u = (session as { user?: { role?: string } } | null)?.user;
  return u?.role;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const url = new URL(req.url);
  const ownerKind = (url.searchParams.get("ownerKind") || "org") as "user" | "org";
  const ownerId = url.searchParams.get("ownerId") || "";
  if (!ownerId) return NextResponse.json({ error: "missing_owner" }, { status: 400 });
  if (ownerKind === "org" && role(session) !== "admin" && role(session) !== "staff") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json({
    defaults: AI_PRICING,
    overrides: listOverrides(ownerKind, ownerId),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (role(session) !== "admin" && role(session) !== "staff") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const ownerKind = (body.ownerKind || "org") as "user" | "org";
  if (!body.ownerId || !FEATURES.includes(body.feature)) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  const per = Number(body.perUnitRupees);
  if (!Number.isFinite(per) || per < 0) {
    return NextResponse.json({ error: "invalid_rupees" }, { status: 400 });
  }
  const o = upsertOverride({
    ownerKind,
    ownerId: String(body.ownerId),
    feature: body.feature,
    perUnitRupees: per,
    reason: body.reason,
    setBy: session?.user?.email || undefined,
  });
  try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
  return NextResponse.json({ override: o });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (role(session) !== "admin" && role(session) !== "staff") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const ownerKind = (url.searchParams.get("ownerKind") || "org") as "user" | "org";
  const ownerId = url.searchParams.get("ownerId");
  const feature = url.searchParams.get("feature") as AiFeature | null;
  if (!ownerId || !feature || !FEATURES.includes(feature)) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  const ok = clearOverride(ownerKind, ownerId, feature);
  if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
  return NextResponse.json({ ok: true });
}
