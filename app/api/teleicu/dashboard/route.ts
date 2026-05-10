// Tele-ICU command-center dashboard.
//
// Returns a snapshot per bed including latest vitals, NEWS2, trend
// arrays, active coverage. Hot-path — intensivists keep this open
// continuously; refresh interval lives client-side.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildDashboard } from "@/lib/teleicu/dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const url = new URL(req.url);
  const intensivistOnly = url.searchParams.get("scope") === "mine";
  const organizationId = url.searchParams.get("organizationId") || undefined;
  const snapshots = buildDashboard({
    organizationId,
    intensivistUserId: intensivistOnly ? session.user.id : undefined,
  });
  return NextResponse.json({ snapshots });
}
