// GET /api/clinic/ai-usage?days=30
//
// Clinic-scoped AI usage view — every clinician (doctor, nurse,
// front-desk if they happen to call any AI route) gets their own
// breakdown. Lets a clinic owner see "this is what we used the AI
// for, and here's roughly what it cost." Used to justify the
// $50/month Practice tier vs $400/month Abridge.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { summariseForCaller } from "@/lib/ai-usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isClinician(role: string | undefined): boolean {
  return role === "doctor" || role === "admin" || role === "nurse" || role === "frontdesk";
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  if (!user?.email || !isClinician(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const days = Math.max(1, Math.min(365, Number(req.nextUrl.searchParams.get("days") || "30") || 30));
  const data = await summariseForCaller(user.email, days);
  return NextResponse.json({ days, ...data });
}
