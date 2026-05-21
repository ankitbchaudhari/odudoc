// /api/pharma/batches — V7 §3.6 anti-counterfeit batches.
//
// GET — list batches for a pharma company.
// POST — issue a new batch with N serial codes. Returns the batch
//        header + a SAMPLE of the first 8 serials (the bulk
//        export-for-printer pipeline is separate).

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listBatches, issueBatch } from "@/lib/pharma-store";
import { parseJson, z } from "@/lib/validate";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!["admin", "support", "vendor", "pharmacist"].includes(session.user.role || "")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const url = new URL(request.url);
  const rows = await listBatches(url.searchParams.get("pharmaCompanyId") || undefined);
  return NextResponse.json({ batches: rows });
}

const Schema = z.object({
  pharmaCompanyId: z.string().min(1),
  drugInn: z.string().min(1).max(200),
  brandName: z.string().min(1).max(200),
  batchNumber: z.string().min(1).max(64),
  manufacturedOn: z.string().min(1),
  expiresOn: z.string().min(1),
  /** Cap at 100k per batch — bigger runs should split for printer ergonomics. */
  unitsIssued: z.number().int().positive().max(100_000),
  manufacturingSite: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!["admin", "support", "vendor"].includes(session.user.role || "")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;
  const result = await issueBatch(parsed);
  return NextResponse.json(result, { status: 201 });
}
