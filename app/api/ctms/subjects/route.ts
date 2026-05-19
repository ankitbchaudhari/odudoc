// /api/ctms/subjects
//   GET — list subjects (?protocolId=… optional).
//   POST — enrol a subject under a protocol.
//   PATCH (?id=…) — transition status.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { enrolSubject, listSubjects, setSubjectStatus } from "@/lib/ctms-store";
import { parseJson, z, nonEmptyString } from "@/lib/validate";

export const runtime = "nodejs";

const EnrolSchema = z.object({
  protocolId: nonEmptyString.max(40),
  subjectId: nonEmptyString.max(40),
  patientEmail: nonEmptyString.max(120),
  baselineDate: z.string().trim().max(40).optional(),
});

const PatchSchema = z.object({
  status: z.enum(["screening", "enrolled", "active", "completed", "withdrawn", "lost_to_followup"]),
  exitReason: z.string().trim().max(500).optional(),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as { organizationId?: string } | undefined)?.organizationId;
  const protocolId = request.nextUrl.searchParams.get("protocolId") || undefined;
  return NextResponse.json({ subjects: listSubjects({ organizationId: orgId, protocolId }) });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "doctor" && role !== "admin") {
    return NextResponse.json({ error: "Only investigators can enrol subjects" }, { status: 403 });
  }
  const orgId = (session.user as { organizationId?: string } | undefined)?.organizationId || "default";
  const parsed = await parseJson(request, EnrolSchema);
  if (parsed instanceof NextResponse) return parsed;
  const s = enrolSubject({ ...parsed, organizationId: orgId });
  return NextResponse.json({ subject: s }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const parsed = await parseJson(request, PatchSchema);
  if (parsed instanceof NextResponse) return parsed;
  const s = setSubjectStatus(id, parsed.status, parsed.exitReason ? { exitReason: parsed.exitReason } : {});
  if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ subject: s });
}
