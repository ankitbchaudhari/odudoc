// Patient policy linking — list + add.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listPoliciesForUser,
  addPolicy,
  listInsurersByCountry,
} from "@/lib/insurance/tpa-store";
import { findUserById } from "@/lib/users-store";
import { currencyForCountry } from "@/lib/currency";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // Country-aware registry: a patient in the US sees UnitedHealthcare,
  // Aetna, etc.; a UK patient sees Bupa UK, AXA Health, NHS, etc.
  // Falls back to the full registry when the country is unset or
  // unsupported so the dropdown is never empty.
  const user = findUserById(userId);
  const country = user?.country;
  const registry = listInsurersByCountry(country);
  const currency = currencyForCountry(country);

  return NextResponse.json({
    policies: listPoliciesForUser(userId),
    registry,
    country: country || null,
    currency,
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
