// /api/pharma/adrs — V7 §3.7 Adverse Drug Reaction reporting.
//
// GET — list ADRs (admin / pharma / clinician).
// POST — report a new ADR. Open to authenticated clinicians.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listAdrs, reportAdr, type AdverseDrugReaction } from "@/lib/pharma-store";
import { parseJson, z } from "@/lib/validate";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const role = session.user.role || "";
  const isManager = ["admin", "support", "vendor"].includes(role);
  const url = new URL(request.url);
  const adrs = await listAdrs({
    drugInn: url.searchParams.get("drugInn") || undefined,
    manufacturerPharmaId: url.searchParams.get("manufacturerPharmaId") || undefined,
    severity: (url.searchParams.get("severity") as AdverseDrugReaction["severity"]) || undefined,
    pvSentOnly: url.searchParams.get("pvSentOnly") === "1",
  });
  // Non-managers don't see other clinicians' ADRs — only their own
  // submissions.
  return NextResponse.json({
    adrs: isManager ? adrs : adrs.filter((a) => a.reportedByEmail === session.user.email),
  });
}

const Schema = z.object({
  drugInn: z.string().min(1).max(200),
  manufacturerPharmaId: z.string().optional(),
  severity: z.enum(["mild", "moderate", "severe", "life_threatening", "fatal"]),
  reaction: z.string().min(2).max(2000),
  patientId: z.string().optional(),
  onsetAt: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;
  const adr = await reportAdr({
    ...parsed,
    reportedByEmail: session.user.email,
    reportedByRole: session.user.role,
  });
  return NextResponse.json({ adr }, { status: 201 });
}
