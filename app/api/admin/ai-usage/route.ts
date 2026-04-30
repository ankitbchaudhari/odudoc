// GET /api/admin/ai-usage?days=30
//
// Aggregated AI cost / usage view for the admin dashboard. Returns:
//   - totals: { calls, tokens, errors } over the window
//   - byRoute: per-feature breakdown (patient summary, scribe, etc.)
//   - byCaller: per-doctor breakdown for billing

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  totalTokens,
  summariseByRoute,
  summariseByCaller,
} from "@/lib/ai-usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const days = Math.max(1, Math.min(365, Number(req.nextUrl.searchParams.get("days") || "30") || 30));

  const [totals, byRoute, byCaller] = await Promise.all([
    totalTokens(days),
    summariseByRoute(days),
    summariseByCaller(days),
  ]);

  return NextResponse.json({ days, totals, byRoute, byCaller });
}
