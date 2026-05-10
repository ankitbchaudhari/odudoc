// Parse OCR'd Rx text → structured items. Pure pass-through.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { parseRxText } from "@/lib/rx-ocr/parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json();
  const text = String(body.text || "");
  if (!text.trim()) return NextResponse.json({ error: "missing_text" }, { status: 400 });
  return NextResponse.json(parseRxText(text));
}
