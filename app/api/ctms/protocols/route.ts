// /api/ctms/protocols
//   GET — list protocols (optional ?activeOnly=true).
//   POST — create a new protocol draft.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createProtocol, listProtocols } from "@/lib/ctms-store";
import { parseJson, z, nonEmptyString } from "@/lib/validate";

export const runtime = "nodejs";

const CreateSchema = z.object({
  protocolNumber: nonEmptyString.max(40),
  sponsor: nonEmptyString.max(120),
  title: nonEmptyString.max(300),
  phase: z.enum(["I", "II", "III", "IV", "PMS"]),
  siteIds: z.array(z.string().trim().max(40)).max(50).default([]),
  irbApprovalRef: z.string().trim().max(80).optional(),
  irbExpiresOn: z.string().trim().max(40).optional(),
  visitSchedule: z.array(z.object({
    name: nonEmptyString.max(80),
    dayOffset: z.number().int().min(0).max(3650),
    window: z.number().int().min(0).max(60),
  })).max(50).default([]),
  inclusion: z.array(z.string().trim().max(400)).max(50).default([]),
  exclusion: z.array(z.string().trim().max(400)).max(50).default([]),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const activeOnly = request.nextUrl.searchParams.get("activeOnly") === "true";
  return NextResponse.json({ protocols: listProtocols({ activeOnly }) });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "admin" && role !== "doctor") {
    return NextResponse.json({ error: "Only PI / admin can create protocols" }, { status: 403 });
  }
  const parsed = await parseJson(request, CreateSchema);
  if (parsed instanceof NextResponse) return parsed;
  const p = createProtocol(parsed);
  return NextResponse.json({ protocol: p }, { status: 201 });
}
