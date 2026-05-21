// POST /api/pharmacy/stock/inherit
//
// V15 §5 — pharma B2B order arrives, pharmacy inherits batch +
// serial + manufacturing-site data without re-typing.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { inheritFromPharmaOrder } from "@/lib/pharmacy-stock-store";
import { parseJson, z } from "@/lib/validate";

export const runtime = "nodejs";

const Schema = z.object({
  pharmacyId: z.string().min(1),
  pharmaCompanyId: z.string().min(1),
  orderId: z.string().min(1),
  lineItems: z.array(z.object({
    drugInn: z.string().min(1).max(200),
    brandName: z.string().max(200).optional(),
    barcode: z.string().max(64).optional(),
    units: z.number().int().positive().max(1_000_000),
    packSize: z.number().int().positive().optional(),
  })).min(1).max(500),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!["admin", "support", "pharmacist"].includes(session.user.role || "")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;
  const result = await inheritFromPharmaOrder({ ...parsed, receivedByEmail: session.user.email });
  return NextResponse.json(result, { status: 201 });
}
