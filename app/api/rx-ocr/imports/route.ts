// Imported Rx records — list + save.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listImportsForUser,
  saveImport,
} from "@/lib/rx-ocr/store";
import type { ParsedRxItem } from "@/lib/rx-ocr/parser";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  return NextResponse.json({ imports: listImportsForUser(userId) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json();
  const items: ParsedRxItem[] = Array.isArray(body.items) ? body.items : [];
  const rawText = String(body.rawText || "").trim();
  if (!rawText) return NextResponse.json({ error: "missing_text" }, { status: 400 });
  if (items.length === 0) return NextResponse.json({ error: "no_items" }, { status: 400 });
  const r = saveImport({
    userId,
    dependentId: body.dependentId,
    rawText,
    items,
    photoUrl: body.photoUrl,
    source: body.source,
    note: body.note,
  });
  try { await awaitAllFlushesStrict(); } catch {
    return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
  }
  return NextResponse.json({ import: r });
}
