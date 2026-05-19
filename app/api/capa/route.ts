// /api/capa
//   GET  — list CAPAs (?status=…&source=… optional).
//   POST — open a new CAPA from any quality source.
//   PATCH — RCA / add-action / complete-action / VoE (?id=…)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  openCapa,
  recordRca,
  addAction,
  completeAction,
  recordVoe,
  listCapas,
  type CapaStatus,
  type CapaSource,
  type CapaAction,
  type RootCauseCategory,
} from "@/lib/capa-store";
import { parseJson, z, nonEmptyString } from "@/lib/validate";

export const runtime = "nodejs";

const OpenSchema = z.object({
  sourceKind: z.enum(["incident", "mortality_review", "infection_control", "audit_finding", "patient_complaint", "medication_error", "other"]),
  sourceRef: z.string().trim().max(40).optional(),
  problem: nonEmptyString.max(4000),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
});

const ActSchema = z.object({
  action: z.enum(["rca", "add_action", "complete_action", "voe"]),
  rca: z.object({
    whys: z.array(z.string().trim().max(500)).min(1).max(10),
    category: z.enum(["people", "process", "equipment", "environment", "communication", "policy"]),
  }).optional(),
  newAction: z.object({
    description: nonEmptyString.max(500),
    owner: nonEmptyString.max(120),
    ownerEmail: z.string().trim().max(120).optional(),
    dueOn: nonEmptyString.max(40),
    kind: z.enum(["corrective", "preventive"]),
  }).optional(),
  actionIndex: z.number().int().min(0).max(50).optional(),
  evidenceNote: z.string().trim().max(2000).optional(),
  voeRecurred: z.boolean().optional(),
  voeNote: z.string().trim().max(2000).optional(),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as { organizationId?: string } | undefined)?.organizationId;
  const sp = request.nextUrl.searchParams;
  return NextResponse.json({
    records: listCapas({
      organizationId: orgId,
      status: (sp.get("status") as CapaStatus | null) || undefined,
      source: (sp.get("source") as CapaSource | null) || undefined,
    }),
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as { organizationId?: string } | undefined)?.organizationId || "default";
  const parsed = await parseJson(request, OpenSchema);
  if (parsed instanceof NextResponse) return parsed;
  const r = openCapa({
    organizationId: orgId,
    openedBy: session.user.name || session.user.email,
    ...parsed,
  });
  return NextResponse.json({ record: r }, { status: 201 });
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
    case "rca":
      if (!parsed.rca) return NextResponse.json({ error: "rca required" }, { status: 400 });
      result = recordRca(id, { whys: parsed.rca.whys, category: parsed.rca.category as RootCauseCategory }, actor);
      break;
    case "add_action":
      if (!parsed.newAction) return NextResponse.json({ error: "newAction required" }, { status: 400 });
      result = addAction(id, parsed.newAction as Omit<CapaAction, "completedAt" | "completedBy" | "evidenceNote">, actor);
      break;
    case "complete_action":
      if (parsed.actionIndex == null) return NextResponse.json({ error: "actionIndex required" }, { status: 400 });
      result = completeAction(id, parsed.actionIndex, { by: actor, note: parsed.evidenceNote });
      break;
    case "voe":
      if (parsed.voeRecurred == null) return NextResponse.json({ error: "voeRecurred required" }, { status: 400 });
      result = recordVoe(id, { recurred: parsed.voeRecurred, note: parsed.voeNote, by: actor });
      break;
  }
  if (!result) return NextResponse.json({ error: "Invalid action or state" }, { status: 400 });
  return NextResponse.json({ record: result });
}
