// POST /api/pharma/units
//
// Admin-only — mint N unit serials for a given batch. Returns the
// list of newly-created serials so the admin can generate QR codes
// to print. The pharma company calls this once per shipment leaving
// their warehouse.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { mintUnits, listUnitsForBatch } from "@/lib/pharma/units-store";
import { getDrug, incrementMintedUnits } from "@/lib/pharma/catalogue-store";
import { parseJson, z } from "@/lib/validate";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";

export const runtime = "nodejs";

const Schema = z.object({
  drugId: z.string().trim().min(1).max(64),
  batchNumber: z.string().trim().min(1).max(64),
  count: z.number().int().min(1).max(10000),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!["admin", "pharmacist", "staff"].includes(role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const blocked = await enforceRateLimit(request, "pharma-units-mint", 10, "10 m");
  if (blocked) return blocked;

  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;
  const { drugId, batchNumber, count } = parsed;

  const drug = getDrug(drugId);
  if (!drug) return NextResponse.json({ error: "Drug not found" }, { status: 404 });
  const batch = drug.batches.find((b) => b.batchNumber === batchNumber);
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

  const serials = mintUnits({
    drugId,
    batchNumber,
    organizationId: drug.organizationId,
    count,
  });
  incrementMintedUnits(drugId, batchNumber, count);

  return NextResponse.json({
    ok: true,
    serials,
    total: listUnitsForBatch(drugId, batchNumber).length,
  });
}

export async function GET(request: NextRequest) {
  // Admin-only — list serials for a given batch (used by the print
  // page to render the QR codes).
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!["admin", "pharmacist", "staff"].includes(role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const drugId = request.nextUrl.searchParams.get("drugId") || "";
  const batchNumber = request.nextUrl.searchParams.get("batchNumber") || "";
  if (!drugId || !batchNumber) {
    return NextResponse.json({ error: "drugId + batchNumber required" }, { status: 400 });
  }
  const units = listUnitsForBatch(drugId, batchNumber);
  return NextResponse.json({ units });
}
