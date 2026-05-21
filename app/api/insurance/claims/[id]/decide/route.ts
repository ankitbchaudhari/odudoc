// POST /api/insurance/claims/[id]/decide  { decision, approvedCents?, notes? }
//
// Insurer adjudicates a submitted claim.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { decideClaim } from "@/lib/insurance-store";
import { parseJson, z } from "@/lib/validate";

export const runtime = "nodejs";

const Schema = z.object({
  decision: z.enum(["approved", "rejected"]),
  approvedCents: z.number().int().nonnegative().optional(),
  notes: z.string().max(2000).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!["admin", "support"].includes(session.user.role || "")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;
  const claim = await decideClaim(id, { email: session.user.email, role: session.user.role }, parsed.decision, parsed.approvedCents, parsed.notes);
  if (!claim) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ claim });
}
