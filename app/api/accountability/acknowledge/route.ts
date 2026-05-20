// POST /api/accountability/acknowledge { eventId } — V13 §4.3.
//
// Closes the loop on a breach: the responsible role (per the
// escalation chain) marks the event acknowledged. The before/after
// state of the event itself never changes — only the breach.ack
// fields are written, and even then they're append-only in the
// audit-envelope chain.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { acknowledgeBreach } from "@/lib/accountability-store";
import { parseJson, z } from "@/lib/validate";

export const runtime = "nodejs";

const Schema = z.object({ eventId: z.string().min(1).max(64) });

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const role = session.user.role;
  if (role !== "admin" && role !== "doctor" && role !== "support") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;

  const ev = await acknowledgeBreach(parsed.eventId, session.user.email);
  if (!ev) {
    return NextResponse.json({ error: "event_not_found_or_no_breach" }, { status: 404 });
  }
  return NextResponse.json({ event: ev });
}
