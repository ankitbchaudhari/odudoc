// POST /api/opd/call-next  { doctorId }
//
// Doctor (or their assistant) calls the next waiting token. Refuses
// if a token is currently called or in_consult for this doctor —
// finish the current consult first.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { callNext } from "@/lib/opd-token-store";
import { parseJson, z } from "@/lib/validate";

export const runtime = "nodejs";

const Schema = z.object({ doctorId: z.string().min(1).max(64) });

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!["admin", "support", "doctor", "staff"].includes(session.user.role || "")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;

  const token = await callNext(parsed.doctorId, { email: session.user.email, role: session.user.role });
  if (!token) return NextResponse.json({ token: null, message: "no_waiting_patients" });
  return NextResponse.json({ token });
}
