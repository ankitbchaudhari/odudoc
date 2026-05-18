// /api/ctms/adverse-events
//   GET — list AEs, with ?overdueSae=true for unnotified SAEs >24h.
//   POST — report a new AE.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listOverdueSaes,
  markNotified,
  reportAdverseEvent,
  resolveAdverseEvent,
} from "@/lib/ctms-store";
import { parseJson, z, nonEmptyString } from "@/lib/validate";

export const runtime = "nodejs";

const ReportSchema = z.object({
  subjectId: nonEmptyString.max(40),
  protocolId: nonEmptyString.max(40),
  observedOn: nonEmptyString.max(40),
  description: nonEmptyString.max(2000),
  severity: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  causality: z.enum(["unrelated", "unlikely", "possible", "probable", "definite"]),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const overdue = request.nextUrl.searchParams.get("overdueSae") === "true";
  return NextResponse.json({ events: overdue ? listOverdueSaes() : [] });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "doctor" && role !== "admin") {
    return NextResponse.json({ error: "Only investigators / admin can report AEs" }, { status: 403 });
  }
  const orgId = (session.user as { organizationId?: string } | undefined)?.organizationId || "default";

  const parsed = await parseJson(request, ReportSchema);
  if (parsed instanceof NextResponse) return parsed;
  const ae = reportAdverseEvent({
    organizationId: orgId,
    reportedBy: session.user.email,
    ...parsed,
  });
  return NextResponse.json({ event: ae }, { status: 201 });
}

const ActSchema = z.object({
  action: z.enum(["notify", "resolve"]),
  resolution: z.enum(["resolved", "resolved_with_sequelae", "ongoing", "fatal", "unknown"]).optional(),
});

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const parsed = await parseJson(request, ActSchema);
  if (parsed instanceof NextResponse) return parsed;
  const result =
    parsed.action === "notify"
      ? markNotified(id)
      : resolveAdverseEvent(id, parsed.resolution || "resolved");
  if (!result) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  return NextResponse.json({ event: result });
}
