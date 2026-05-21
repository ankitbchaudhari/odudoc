// POST /api/pharma/batches/[id]/recall — V7 §3.6 recall.
//
// Marks a batch + every serial in the batch as recalled. Future
// verify scans return a hard warning with the recall reason.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { recallBatch } from "@/lib/pharma-store";
import { parseJson, z } from "@/lib/validate";

export const runtime = "nodejs";

const Schema = z.object({ reason: z.string().min(2).max(2000) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!["admin", "support", "vendor"].includes(session.user.role || "")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;
  const batch = await recallBatch(id, parsed.reason);
  if (!batch) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ batch });
}
