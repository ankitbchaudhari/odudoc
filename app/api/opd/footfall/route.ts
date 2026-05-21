// GET /api/opd/footfall?clinicId=&doctorId=&days=7
//
// Roll-up of completed OPD tokens by (doctor, date). Powers the
// V17 §6 footfall counter on the CEO + manager dashboards.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listFootfall } from "@/lib/opd-token-store";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const role = session.user.role || "";
  const isManager = ["admin", "support", "hr"].includes(role);
  const url = new URL(request.url);
  const rows = await listFootfall({
    clinicId: url.searchParams.get("clinicId") || undefined,
    // Doctors see only their own footfall; managers see whoever they filter to.
    doctorId: isManager ? (url.searchParams.get("doctorId") || undefined) : session.user.id,
    days: Math.min(Math.max(Number(url.searchParams.get("days") || 7), 1), 90),
  });
  return NextResponse.json({ footfall: rows });
}
