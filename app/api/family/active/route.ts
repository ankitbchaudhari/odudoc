// Active-profile cookie set/clear.
//
// POST { dependentId: string | null }
//   → sets the active-profile cookie to that dependent (or clears
//     to "self" when null). Validates ownership before writing.
// GET → returns the current active profile resolved against the
//        signed-in session.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDependentForOwner } from "@/lib/family-store";
import {
  setActiveProfileCookie,
  resolveActiveProfile,
} from "@/lib/family-active";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const active = await resolveActiveProfile(userId);
  return NextResponse.json({ active });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json();
  const depId = body.dependentId == null ? null : String(body.dependentId);
  if (depId) {
    const d = getDependentForOwner(depId, userId);
    if (!d) return NextResponse.json({ error: "not_owned" }, { status: 403 });
  }
  await setActiveProfileCookie(depId);
  const active = await resolveActiveProfile(userId);
  return NextResponse.json({ active });
}
