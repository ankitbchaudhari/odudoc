// /api/preauth
//   GET  — list pre-auth requests for the tenant.
//   POST — create a draft pre-auth from the order entry surface.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createDraft,
  listRequests,
  submit,
  raiseQuery,
  approve,
  deny,
  submitClaim,
  settle,
  appeal,
  type PreAuthStatus,
} from "@/lib/insurance-preauth-store";
import { parseJson, z, nonEmptyString } from "@/lib/validate";

export const runtime = "nodejs";

const CreateSchema = z.object({
  patientEmail: nonEmptyString.max(120),
  patientName: nonEmptyString.max(120),
  tpaId: nonEmptyString.max(40),
  policyNumber: nonEmptyString.max(60),
  encounterType: z.enum(["opd", "ipd", "surgery", "emergency"]),
  diagnosis: nonEmptyString.max(500),
  diagnosisCodes: z.array(z.string().trim().max(20)).max(20),
  procedureCodes: z.array(z.string().trim().max(20)).max(20),
  estimatedAmount: z.number().min(0).max(10_000_000),
  currency: z.string().trim().length(3).default("INR"),
});

const ActionSchema = z.object({
  action: z.enum(["submit", "query", "approve", "deny", "claim", "settle", "appeal"]),
  amount: z.number().optional(),
  query: z.string().trim().max(2000).optional(),
  reason: z.string().trim().max(2000).optional(),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as { organizationId?: string } | undefined)?.organizationId;
  const status = (request.nextUrl.searchParams.get("status") as PreAuthStatus | null) || undefined;
  return NextResponse.json({
    requests: listRequests({ organizationId: orgId, status: status || undefined }),
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session.user as { organizationId?: string } | undefined)?.organizationId;
  if (!orgId) return NextResponse.json({ error: "No tenant context" }, { status: 400 });

  const parsed = await parseJson(request, CreateSchema);
  if (parsed instanceof NextResponse) return parsed;

  const r = createDraft({
    organizationId: orgId,
    doctorId: session.user.email,
    doctorName: session.user.name || "Doctor",
    ...parsed,
  });
  return NextResponse.json({ request: r }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const parsed = await parseJson(request, ActionSchema);
  if (parsed instanceof NextResponse) return parsed;

  const actor = session.user.name || session.user.email;
  let result;
  switch (parsed.action) {
    case "submit":   result = submit(id, actor); break;
    case "query":    result = parsed.query ? raiseQuery(id, parsed.query, actor) : null; break;
    case "approve":  result = typeof parsed.amount === "number" ? approve(id, parsed.amount, actor) : null; break;
    case "deny":     result = parsed.reason ? deny(id, parsed.reason, actor) : null; break;
    case "claim":    result = typeof parsed.amount === "number" ? submitClaim(id, parsed.amount, actor) : null; break;
    case "settle":   result = settle(id, actor); break;
    case "appeal":   result = parsed.reason ? appeal(id, parsed.reason, actor) : null; break;
  }
  if (!result) return NextResponse.json({ error: "Invalid action or state" }, { status: 400 });
  return NextResponse.json({ request: result });
}
