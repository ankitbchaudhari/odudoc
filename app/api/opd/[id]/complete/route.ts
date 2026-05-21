// POST /api/opd/[id]/complete { notes? }
//
// Doctor closes the consultation. Fires footfall (recorded via the
// V13 event written inside completeConsult) and the ABHA sync stub.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { completeConsult } from "@/lib/opd-token-store";
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

  const token = await completeConsult(id, { email: session.user.email, role: session.user.role }, parsed.notes);
  if (!token) return NextResponse.json({ error: "not_found_or_wrong_state" }, { status: 409 });
  return NextResponse.json({ token });
}
