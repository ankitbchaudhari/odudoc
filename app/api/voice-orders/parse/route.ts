// Parse a voice transcript into structured orders. Pure pass-through.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { parseVoiceOrders } from "@/lib/voice-orders/parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json();
  const transcript = String(body.transcript || "");
  if (!transcript.trim()) return NextResponse.json({ error: "missing_transcript" }, { status: 400 });
  const result = parseVoiceOrders({
    transcript,
    defaultBedRef: body.defaultBedRef ? String(body.defaultBedRef) : undefined,
  });
  return NextResponse.json(result);
}
