// POST /api/pharmacy/stock/receive
//
// Single barcode-scan receive flow. Body may include just a barcode
// + units (server looks up brandName / drugInn / batch from the
// barcode mapping + most-recent active pharma batch), OR full
// override fields for manual adjustment.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { lookupBarcode, receiveStock } from "@/lib/pharmacy-stock-store";
import { parseJson, z } from "@/lib/validate";

export const runtime = "nodejs";

const Schema = z.object({
  pharmacyId: z.string().min(1).default("demo-pharmacy-001"),
  barcode: z.string().min(1).optional(),
  drugInn: z.string().optional(),
  brandName: z.string().optional(),
  manufacturerPharmaId: z.string().optional(),
  batchNumber: z.string().optional(),
  expiresOn: z.string().optional(),
  packSize: z.number().int().positive().optional(),
  unitsOnHand: z.number().int().positive(),
  serialFrom: z.string().optional(),
  serialTo: z.string().optional(),
  inheritedFromOrderId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!["admin", "support", "pharmacist", "staff"].includes(session.user.role || "")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;

  // If only a barcode + units were supplied, hydrate everything else
  // from the mapping + most-recent batch.
  let drugInn = parsed.drugInn;
  let brandName = parsed.brandName;
  let manufacturerPharmaId = parsed.manufacturerPharmaId;
  let batchNumber = parsed.batchNumber;
  let expiresOn = parsed.expiresOn;
  let packSize = parsed.packSize;

  if (parsed.barcode && !drugInn) {
    const hit = await lookupBarcode(parsed.barcode);
    if (!hit) return NextResponse.json({ error: "barcode_not_linked" }, { status: 404 });
    drugInn = hit.drugInn;
    brandName = brandName || hit.brandName;
    manufacturerPharmaId = manufacturerPharmaId || hit.manufacturerPharmaId;
    packSize = packSize || hit.defaultPackSize;
    if (hit.recentBatch) {
      batchNumber = batchNumber || hit.recentBatch.batchNumber;
      expiresOn = expiresOn || hit.recentBatch.expiresOn;
    }
  }

  if (!drugInn) return NextResponse.json({ error: "drug_inn_required" }, { status: 400 });

  const row = await receiveStock({
    pharmacyId: parsed.pharmacyId,
    barcode: parsed.barcode,
    drugInn,
    brandName,
    manufacturerPharmaId,
    batchNumber,
    expiresOn,
    packSize,
    unitsOnHand: parsed.unitsOnHand,
    serialFrom: parsed.serialFrom,
    serialTo: parsed.serialTo,
    inheritedFromOrderId: parsed.inheritedFromOrderId,
    receivedByEmail: session.user.email,
  });
  return NextResponse.json({ row }, { status: 201 });
}
