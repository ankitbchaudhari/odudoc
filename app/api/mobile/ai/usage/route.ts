// GET /api/mobile/ai/usage?days=30
//
// Mobile-Bearer-auth equivalent of /api/clinic/ai-usage. Returns the
// signed-in clinician's own AI consumption (totals + per-route
// breakdown). Doctor app uses this on the AI Usage dashboard so each
// doctor sees their own cost in real numbers.

import { NextRequest, NextResponse } from "next/server";
import { requireMobileUser } from "@/lib/mobile-auth";
import { summariseForCaller } from "@/lib/ai-usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "doctor" && auth.role !== "admin" && auth.role !== "nurse" && auth.role !== "frontdesk") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const days = Math.max(1, Math.min(365, Number(req.nextUrl.searchParams.get("days") || "30") || 30));
  const data = await summariseForCaller(auth.email, days);
  return NextResponse.json({ days, ...data });
}
