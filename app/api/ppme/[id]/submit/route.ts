// POST /api/ppme/[id]/submit — examiner locks the report.
//
// Triggers the V9 §3.8 settlement: insurer → platform → facility.
// Wallet correctness is preserved (under-funded insurer wallets
// don't block report submission — the unpaid fee becomes AR).

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { submitPpme } from "@/lib/ppme-store";
import { parseJson, z } from "@/lib/validate";

export const runtime = "nodejs";

const Schema = z.object({ notes: z.string().max(2000).optional() });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!["admin", "doctor", "support"].includes(session.user.role || "")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;
  const report = await submitPpme(id, {
    email: session.user.email,
    role: session.user.role,
    notes: parsed.notes,
  });
  if (!report) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ report });
}
