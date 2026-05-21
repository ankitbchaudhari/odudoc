// /api/near-miss
//
// POST — anyone signed in can submit (V13 §7 no-blame culture).
//        Anonymous submissions are stored with reporterEmail="" so
//        the reporter still has the form ergonomics of "submit"
//        without being identified.
// GET  — admin / support / hr see the full review queue.
//        Other signed-in users see only their own non-anonymous
//        submissions.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { submitNearMiss, listNearMisses, aggregateByDomain, type NearMissFilter } from "@/lib/near-miss-store";
import { parseJson, z } from "@/lib/validate";

export const runtime = "nodejs";

const SubmitSchema = z.object({
  anonymous: z.boolean().optional(),
  what: z.string().min(10).max(2000),
  where: z.string().min(2).max(120),
  whenAt: z.string().min(1),
  domain: z.enum([
    "medication", "identification", "procedure", "infection", "fall",
    "equipment", "communication", "documentation", "security", "other",
  ]),
  severity: z.enum(["minor", "moderate", "serious", "catastrophic_avoided"]),
  outcome: z.enum(["no_harm", "delayed_treatment", "extra_intervention", "psychological"]),
  patientId: z.string().max(64).optional(),
  contributingFactors: z.array(z.string().max(80)).max(20).optional(),
  suggestedFix: z.string().max(2000).optional(),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const parsed = await parseJson(request, SubmitSchema);
  if (parsed instanceof NextResponse) return parsed;

  const report = await submitNearMiss({
    what: parsed.what,
    where: parsed.where,
    whenAt: parsed.whenAt,
    domain: parsed.domain,
    severity: parsed.severity,
    outcome: parsed.outcome,
    reporterEmail: parsed.anonymous ? "" : session.user.email,
    reporterRole: session.user.role, // role kept even when anonymous so patterns can group by role-type
    patientId: parsed.patientId,
    contributingFactors: parsed.contributingFactors,
    suggestedFix: parsed.suggestedFix,
  });

  return NextResponse.json({ report }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const role = session.user.role;
  const isManager = role === "admin" || role === "support" || role === "hr";

  const url = new URL(request.url);
  const aggregate = url.searchParams.get("aggregate") === "1";
  if (aggregate) {
    if (!isManager) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const windowDays = Math.min(Math.max(Number(url.searchParams.get("windowDays") || 30), 1), 365);
    const buckets = await aggregateByDomain(windowDays);
    return NextResponse.json({ buckets });
  }

  if (isManager) {
    const reports = await listNearMisses({
      domain: (url.searchParams.get("domain") as NearMissFilter["domain"]) || undefined,
      reviewStatus: (url.searchParams.get("reviewStatus") as NearMissFilter["reviewStatus"]) || undefined,
    });
    return NextResponse.json({ reports });
  }

  // Non-manager → only their own non-anonymous reports.
  const reports = await listNearMisses({ reporterEmail: session.user.email });
  return NextResponse.json({ reports });
}
