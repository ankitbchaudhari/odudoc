// /api/scorecards
//
// GET — admin / support / hr roll-up. Returns all scorecards for
// staff who had any activity in the lookback window, sorted by
// overall score ascending (lowest first — worst performers surface
// up so management addresses them first).
//
// GET ?email=foo@bar — single scorecard with full component breakdown.
// GET ?windowDays=7 — custom lookback window.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { computeScorecard, listAllScorecards } from "@/lib/scorecard-store";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const role = session.user.role;
  // Staff can fetch their own card. Admin / support / hr can fetch
  // anyone's card or the full roll-up.
  const isManager = role === "admin" || role === "support" || role === "hr";

  const url = new URL(request.url);
  const emailQ = url.searchParams.get("email");
  const windowDays = Math.min(Math.max(Number(url.searchParams.get("windowDays") || 30), 1), 365);

  if (emailQ) {
    if (emailQ !== session.user.email && !isManager) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const scorecard = await computeScorecard(emailQ, { windowDays });
    return NextResponse.json({ scorecard });
  }

  if (!isManager) {
    // Non-manager → just give them their own card.
    const scorecard = await computeScorecard(session.user.email, { windowDays });
    return NextResponse.json({ scorecard });
  }

  const scorecards = await listAllScorecards(windowDays);
  return NextResponse.json({ scorecards });
}
