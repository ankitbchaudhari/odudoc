// /api/mm-review
//   GET  — list cases for the tenant (?status= optional).
//   POST — queue a new case (typically called from discharge module).
//   PATCH — schedule | present | grade | close (?id=…)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  queueCase,
  scheduleCase,
  recordPresentation,
  gradeCase,
  closeCase,
  listCases,
  type CaseStatus,
  type Preventability,
} from "@/lib/mm-review-store";
import { parseJson, z, nonEmptyString } from "@/lib/validate";

export const runtime = "nodejs";

const QueueSchema = z.object({
  patientEmail: nonEmptyString.max(120),
  patientName: nonEmptyString.max(120),
  patientMrn: z.string().trim().max(40).optional(),
  kind: z.enum(["death", "major_morbidity", "near_miss", "unexpected_outcome"]),
  eventDate: nonEmptyString.max(40),
  primaryDiagnosis: nonEmptyString.max(300),
  causeOfDeath: z.string().trim().max(500).optional(),
  summary: nonEmptyString.max(4000),
});

const ActSchema = z.object({
  action: z.enum(["schedule", "present", "grade", "close"]),
  scheduledFor: z.string().trim().max(40).optional(),
  presenterId: z.string().trim().max(40).optional(),
  presenterName: z.string().trim().max(120).optional(),
  discussion: z.string().trim().max(8000).optional(),
  preventability: z.enum(["non_preventable", "possibly_preventable", "preventable", "indeterminate"]).optional(),
  capaActions: z.array(z.object({
    description: nonEmptyString.max(500),
    owner: nonEmptyString.max(120),
    dueOn: z.string().trim().max(40).optional(),
  })).max(20).optional(),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as { organizationId?: string } | undefined)?.organizationId;
  const status = (request.nextUrl.searchParams.get("status") as CaseStatus | null) || undefined;
  return NextResponse.json({ cases: listCases({ organizationId: orgId, status: status || undefined }) });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "doctor" && role !== "admin") {
    return NextResponse.json({ error: "Only clinical staff can queue cases" }, { status: 403 });
  }
  const orgId = (session.user as { organizationId?: string } | undefined)?.organizationId || "default";
  const parsed = await parseJson(request, QueueSchema);
  if (parsed instanceof NextResponse) return parsed;
  const c = queueCase({
    organizationId: orgId,
    queuedBy: session.user.name || session.user.email,
    ...parsed,
  });
  return NextResponse.json({ case: c }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const parsed = await parseJson(request, ActSchema);
  if (parsed instanceof NextResponse) return parsed;
  const actor = session.user.name || session.user.email;

  let result;
  switch (parsed.action) {
    case "schedule":
      if (!parsed.scheduledFor || !parsed.presenterId || !parsed.presenterName) {
        return NextResponse.json({ error: "scheduledFor + presenter required" }, { status: 400 });
      }
      result = scheduleCase(id, parsed.scheduledFor, { id: parsed.presenterId, name: parsed.presenterName }, actor);
      break;
    case "present":
      if (!parsed.discussion) return NextResponse.json({ error: "discussion required" }, { status: 400 });
      result = recordPresentation(id, parsed.discussion, actor);
      break;
    case "grade":
      if (!parsed.preventability) return NextResponse.json({ error: "preventability required" }, { status: 400 });
      result = gradeCase(id, {
        preventability: parsed.preventability as Preventability,
        capaActions: parsed.capaActions || [],
        by: actor,
      });
      break;
    case "close":
      result = closeCase(id, actor);
      break;
  }
  if (!result) return NextResponse.json({ error: "Invalid action or state" }, { status: 400 });
  return NextResponse.json({ case: result });
}
