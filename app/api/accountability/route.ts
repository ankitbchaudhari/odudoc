// GET /api/accountability — V13 §2 live feed.
//
// Admin-only. Returns the most recent accountability events filtered
// by the query params: category, severity, actorEmail, subjectId,
// breachOnly, from, to, limit.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listEvents, type FeedFilter } from "@/lib/accountability-store";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const role = session.user.role;
  if (role !== "admin" && role !== "support" && role !== "hr") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const filter: FeedFilter = {
    category: (url.searchParams.get("category") as FeedFilter["category"]) || undefined,
    severity: (url.searchParams.get("severity") as FeedFilter["severity"]) || undefined,
    actorEmail: url.searchParams.get("actorEmail") || undefined,
    subjectId: url.searchParams.get("subjectId") || undefined,
    breachOnly: url.searchParams.get("breachOnly") === "1",
    unacknowledgedBreachOnly: url.searchParams.get("unacknowledgedBreachOnly") === "1",
    from: url.searchParams.get("from") || undefined,
    to: url.searchParams.get("to") || undefined,
    limit: Math.min(Number(url.searchParams.get("limit") || 200), 500),
  };

  const events = await listEvents(filter);
  return NextResponse.json({ events });
}
