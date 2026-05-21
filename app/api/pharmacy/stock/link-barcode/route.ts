// POST /api/pharmacy/stock/link-barcode  { barcode, drugInn, ... }
//
// Pharmacy scanned a barcode that's not yet in the mapping. Link
// it once; future scans auto-resolve. V15 §4.2.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { linkBarcode } from "@/lib/pharmacy-stock-store";
import { parseJson, z } from "@/lib/validate";

export const runtime = "nodejs";

const Schema = z.object({
  barcode: z.string().min(1).max(64),
  drugInn: z.string().min(1).max(200),
  brandName: z.string().max(200).optional(),
  manufacturerPharmaId: z.string().max(64).optional(),
  defaultPackSize: z.number().int().positive().optional(),
  linkedByPharmacyId: z.string().max(64).optional(),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!["admin", "support", "pharmacist", "staff"].includes(session.user.role || "")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;
  const mapping = await linkBarcode(parsed);
  return NextResponse.json({ mapping }, { status: 201 });
}
