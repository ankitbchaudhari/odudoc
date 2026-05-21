// POST /api/qr/[token]/revoke — patient kills the QR.
//
// Only the token holder (patient) can revoke. Admin / support
// can revoke on the patient's behalf if needed.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getQr, revokeQr } from "@/lib/qr-store";
import { parseJson, z } from "@/lib/validate";

export const runtime = "nodejs";

const Schema = z.object({ reason: z.string().max(500).optional() });

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;

  const t = await getQr(token);
  if (!t) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Only the patient or platform admin can revoke.
  const isOwner = t.patientId === session.user.id || t.patientId === session.user.email;
  const isAdmin = ["admin", "support"].includes(session.user.role || "");
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const updated = await revokeQr(token, { email: session.user.email, role: session.user.role }, parsed.reason);
  return NextResponse.json({ token: updated });
}
