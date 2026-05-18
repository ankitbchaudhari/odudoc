// PATCH /api/bells/[id]  body: { action: "ack" | "close" }
//
// Single-route variant since both ack and close are simple status
// flips. Keeps the route tree small.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { acknowledgeBell, closeBell } from "@/lib/bells-store";
import { parseJson, z } from "@/lib/validate";

export const runtime = "nodejs";

const Schema = z.object({ action: z.enum(["ack", "close"]) });

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const staffId = (session.user as { id?: string } | undefined)?.id || session.user?.email || "unknown";

  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;

  const e = parsed.action === "ack"
    ? acknowledgeBell(params.id, staffId)
    : closeBell(params.id, staffId);
  if (!e) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  return NextResponse.json({ event: e });
}
