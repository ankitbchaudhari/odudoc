// /api/ams
//   GET  — list AMS requests for the tenant (status filter optional).
//   POST — submit a new restricted-antibiotic request.
//   PATCH — approve / deny / de-escalate (?id=<requestId>)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  approveAms,
  denyAms,
  listRequests,
  recordDeEscalation,
  requestAms,
  type AmsStatus,
} from "@/lib/antimicrobial-stewardship";
import { parseJson, z, nonEmptyString } from "@/lib/validate";

export const runtime = "nodejs";

const CreateSchema = z.object({
  patientEmail: nonEmptyString.max(120),
  patientName: nonEmptyString.max(120),
  drug: nonEmptyString.max(60),
  indication: nonEmptyString.max(2000),
  cultureRef: z.string().trim().max(120).optional(),
});

const PatchSchema = z.object({
  action: z.enum(["approve", "deny", "de_escalate"]),
  note: z.string().trim().max(2000).optional(),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as { organizationId?: string } | undefined)?.organizationId;
  const status = (request.nextUrl.searchParams.get("status") as AmsStatus | null) || undefined;
  return NextResponse.json({ requests: listRequests({ organizationId: orgId, status: status || undefined }) });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "doctor" && role !== "admin") {
    return NextResponse.json({ error: "Only clinicians can request restricted antibiotics" }, { status: 403 });
  }
  const orgId = (session.user as { organizationId?: string } | undefined)?.organizationId || "default";

  const parsed = await parseJson(request, CreateSchema);
  if (parsed instanceof NextResponse) return parsed;

  const r = requestAms({
    organizationId: orgId,
    doctorId: session.user.email,
    doctorName: session.user.name || "Doctor",
    ...parsed,
  });
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ request: r }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  // Approval is the ID consultant's job — admin role for MVP.
  if (role !== "admin" && role !== "doctor") {
    return NextResponse.json({ error: "Only ID consultants can act on AMS requests" }, { status: 403 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const parsed = await parseJson(request, PatchSchema);
  if (parsed instanceof NextResponse) return parsed;

  const approver = { email: session.user.email, name: session.user.name || "Consultant", note: parsed.note };
  let result;
  switch (parsed.action) {
    case "approve":     result = approveAms(id, approver); break;
    case "deny":        result = denyAms(id, { ...approver, note: parsed.note || "denied" }); break;
    case "de_escalate": result = recordDeEscalation(id, parsed.note); break;
  }
  if (!result) return NextResponse.json({ error: "Invalid action or state" }, { status: 400 });
  return NextResponse.json({ request: result });
}
