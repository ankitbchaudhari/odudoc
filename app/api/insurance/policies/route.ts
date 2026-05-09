// Patient policy linking — list + add.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listPoliciesForUser,
  addPolicy,
  TPA_REGISTRY,
} from "@/lib/insurance/tpa-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  return NextResponse.json({
    policies: listPoliciesForUser(userId),
    registry: TPA_REGISTRY,
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json();
  const memberId = String(body.memberId || "").trim();
  const tpaId = String(body.tpaId || "").trim();
  if (!memberId || !tpaId) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  try {
    const policy = addPolicy({
      userId,
      tpaId,
      memberId,
      planName: body.planName,
      sumInsuredRupees: typeof body.sumInsuredRupees === "number" ? body.sumInsuredRupees : undefined,
      cumulativeBonusPct: typeof body.cumulativeBonusPct === "number" ? body.cumulativeBonusPct : undefined,
      validUntil: body.validUntil,
      groupHolder: body.groupHolder,
      isPrimary: body.isPrimary,
    });
    try { await awaitAllFlushesStrict(); } catch {
      return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
    }
    return NextResponse.json({ policy });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
