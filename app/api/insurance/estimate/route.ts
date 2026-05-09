// Coverage estimator — pre-booking sticker price.
//
// POST { procedureCode, sumInsuredRupees, ... } → CoverageEstimate.
// Public to authenticated users; doesn't require an org context
// because the patient hits this from their own dashboard before
// landing at any specific clinic.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  estimateCoverage,
  PROCEDURE_TARIFFS,
  ROOM_RENT_CAPS,
  type RoomCategory,
} from "@/lib/insurance/policy-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ROOMS: RoomCategory[] = ["general_ward", "twin_sharing", "single_ac", "deluxe", "icu"];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  return NextResponse.json({
    procedures: PROCEDURE_TARIFFS,
    roomCategories: Object.values(ROOM_RENT_CAPS),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json();
  const procedureCode = String(body.procedureCode || "").trim();
  const sumInsuredRupees = Number(body.sumInsuredRupees);
  if (!procedureCode) return NextResponse.json({ error: "missing_procedure" }, { status: 400 });
  if (!Number.isFinite(sumInsuredRupees) || sumInsuredRupees <= 0) {
    return NextResponse.json({ error: "invalid_sum_insured" }, { status: 400 });
  }
  const roomCategory = ALLOWED_ROOMS.includes(body.roomCategory) ? body.roomCategory as RoomCategory : undefined;
  const result = estimateCoverage({
    procedureCode,
    sumInsuredRupees,
    empanelmentDiscountPct: typeof body.empanelmentDiscountPct === "number" ? body.empanelmentDiscountPct : undefined,
    roomCategory,
    preExisting: Boolean(body.preExisting),
    policyAgeMonths: typeof body.policyAgeMonths === "number" ? body.policyAgeMonths : undefined,
    coPayPct: typeof body.coPayPct === "number" ? body.coPayPct : undefined,
    excluded: Boolean(body.excluded),
  });
  if (!result) return NextResponse.json({ error: "unknown_procedure" }, { status: 404 });
  return NextResponse.json({ estimate: result });
}
