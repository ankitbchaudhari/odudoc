// GET /api/v14-audit — return the endpoint ownership manifest + channel
// list + counts for the admin V14 audit page.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ENDPOINTS, CHANNELS, summary } from "@/lib/api-ownership";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!["admin", "support"].includes((session.user as { role?: string }).role || "")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json({
    endpoints: ENDPOINTS,
    channels: CHANNELS,
    summary: summary(),
  });
}
