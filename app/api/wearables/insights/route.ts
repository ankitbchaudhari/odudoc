// Aggregated insights bundle — KPI tiles, daily buckets, anomalies,
// clinical summary string ready to drop into the encounter form.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listReadings } from "@/lib/wearables/store";
import { computeInsights } from "@/lib/wearables/insights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const url = new URL(req.url);
  const dependentId = url.searchParams.get("dependentId") || undefined;
  const windowDays = Math.max(1, Math.min(365, parseInt(url.searchParams.get("windowDays") || "30", 10)));
  // Pull the last 2 windows so the trend % can compare current vs prior.
  const fromIso = new Date(Date.now() - 2 * windowDays * 24 * 60 * 60 * 1000).toISOString();
  const readings = listReadings({ userId, dependentId, fromIso });
  const bundle = computeInsights({ readings, windowDays });
  return NextResponse.json(bundle);
}
