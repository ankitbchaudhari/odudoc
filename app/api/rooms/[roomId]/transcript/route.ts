// POST /api/rooms/[roomId]/transcript
//   body: { text: string, role?: "doctor"|"patient" }
//   → { fragment }
//
// GET /api/rooms/[roomId]/transcript?since=<ts>
//   → { fragments, serverTs }
//
// Simple append-only transcript buffer scoped to one consult room.
// The role is derived from the session when present; the `role` body
// field is advisory (lets doctor & patient accounts without a
// well-formed session-role default correctly in dev).

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { appendFragment, getFragments } from "@/lib/transcript-store";

export const runtime = "nodejs";

function resolveRole(sessionRole: string | undefined, bodyRole: string | undefined): "doctor" | "patient" {
  if (sessionRole === "doctor") return "doctor";
  if (bodyRole === "doctor") return "doctor";
  return "patient";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; name?: string; role?: string } | undefined;
  if (!user?.email) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { roomId } = await params;
  const body = await req.json().catch(() => ({}));
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "empty_text" }, { status: 400 });
  }
  if (text.length > 1000) {
    return NextResponse.json({ error: "text_too_long" }, { status: 413 });
  }
  const role = resolveRole(user.role, body?.role);
  const speaker = user.name || (role === "doctor" ? "Doctor" : "Patient");

  const fragment = appendFragment(roomId, { role, speaker, text });
  return NextResponse.json({ fragment });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string } | undefined;
  if (!user?.email) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { roomId } = await params;
  const sinceRaw = req.nextUrl.searchParams.get("since");
  const since = sinceRaw ? Number(sinceRaw) : undefined;
  const fragments = getFragments(roomId, Number.isFinite(since) ? since : undefined);
  return NextResponse.json({ fragments, serverTs: Date.now() });
}
