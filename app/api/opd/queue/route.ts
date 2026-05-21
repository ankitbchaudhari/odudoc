// GET /api/opd/queue?clinicId=&doctorId=&todayOnly=1&liveOnly=1
//
// Public-to-staff queue read. The OPD display board polls this
// every ~10 seconds; doctor + reception views also call it.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listOpdQueue } from "@/lib/opd-token-store";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const url = new URL(request.url);
  const tokens = await listOpdQueue({
    clinicId: url.searchParams.get("clinicId") || undefined,
    doctorId: url.searchParams.get("doctorId") || undefined,
    todayOnly: url.searchParams.get("todayOnly") !== "0",
    liveOnly: url.searchParams.get("liveOnly") !== "0",
  });
  return NextResponse.json({ tokens });
}
