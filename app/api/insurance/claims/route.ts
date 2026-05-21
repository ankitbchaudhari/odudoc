// /api/insurance/claims
//
// GET — list claims (admin / support).
// POST — submit a new claim (hospital-side, but for the MVP we let
//        admin create them on behalf via the panel).

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listClaims, submitClaim, type ClaimStatus } from "@/lib/insurance-store";
import { parseJson, z } from "@/lib/validate";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!["admin", "support"].includes(session.user.role || "")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const url = new URL(request.url);
  const status = url.searchParams.get("status") as ClaimStatus | null;
  const insurerId = url.searchParams.get("insurerId") || undefined;
  const claims = await listClaims({ insurerId, status: status || undefined });
  return NextResponse.json({ claims });
}

const Schema = z.object({
  insurerId: z.string().min(1),
  patientId: z.string().min(1),
  patientName: z.string().min(1),
  policyNumber: z.string().min(1),
  hospitalId: z.string().min(1),
  hospitalName: z.string().min(1),
  preAuthId: z.string().optional(),
  billedCents: z.number().int().positive(),
  currency: z.string().length(3),
  diagnosis: z.string().min(1).max(500),
  dischargeDate: z.string().min(1),
  documentUrls: z.array(z.string().url()).max(20).optional(),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!["admin", "support"].includes(session.user.role || "")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;
  const claim = await submitClaim({
    ...parsed,
    documentUrls: parsed.documentUrls || [],
  });
  return NextResponse.json({ claim }, { status: 201 });
}
