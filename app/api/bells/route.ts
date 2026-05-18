// /api/bells
//   GET  — list events for the calling tenant (active only by default).
//   POST — fire a new bell event { deviceId, reason, note? }.
//
// Acknowledge + close use /api/bells/[id]/{ack,close}.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fireBell, listEvents } from "@/lib/bells-store";
import { parseJson, z } from "@/lib/validate";

export const runtime = "nodejs";

const FireSchema = z.object({
  deviceId: z.string().trim().min(1).max(64),
  reason: z.enum(["opd_queue_advance", "ipd_help_request", "ipd_pain", "ipd_toilet", "code_blue", "code_pink", "other"]),
  note: z.string().trim().max(500).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as { organizationId?: string } | undefined)?.organizationId;
  const events = listEvents(orgId, { activeOnly: true });
  return NextResponse.json({ events });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = await parseJson(request, FireSchema);
  if (parsed instanceof NextResponse) return parsed;
  const e = fireBell(parsed);
  if (!e) return NextResponse.json({ error: "Device not found" }, { status: 404 });
  return NextResponse.json({ event: e }, { status: 201 });
}
