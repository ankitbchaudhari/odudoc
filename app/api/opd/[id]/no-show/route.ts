// POST /api/opd/[id]/no-show — reception or doctor marks a missed token.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { markNoShow } from "@/lib/opd-token-store";

export const runtime = "nodejs";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!["admin", "doctor", "support", "staff"].includes(session.user.role || "")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const token = await markNoShow(id, { email: session.user.email, role: session.user.role });
  if (!token) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ token });
}
