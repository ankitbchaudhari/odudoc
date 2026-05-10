// Patient curates their emergency profile.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  deleteEmergencyProfile, getEmergencyProfile, upsertEmergencyProfile,
  listEnrollments, deactivateBiometric,
} from "@/lib/emergency-profile/store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  return NextResponse.json({
    profile: getEmergencyProfile(userId),
    biometrics: listEnrollments(userId).map((e) => ({
      id: e.id, kind: e.kind, enrolledAt: e.enrolledAt, active: e.active,
      enrolledByOrgId: e.enrolledByOrgId,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const p = upsertEmergencyProfile({ userId, ...body });
  try { await awaitAllFlushesStrict(); } catch {
    return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
  }
  return NextResponse.json({ profile: p });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const url = new URL(req.url);
  const target = url.searchParams.get("target");
  if (target === "biometric") {
    const kind = url.searchParams.get("kind") as "fingerprint" | "face" | null;
    const n = deactivateBiometric(userId, kind || undefined);
    try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
    return NextResponse.json({ deactivated: n });
  }
  const ok = deleteEmergencyProfile(userId);
  if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
  return NextResponse.json({ ok: true });
}
