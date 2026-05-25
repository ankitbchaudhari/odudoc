// Admin-only readonly view of PRICING_PRODUCTS. The admin editor uses
// it to render the base-USD column and the "Custom" markers — it can't
// just call /api/pricing for that because the public endpoint already
// applies FX and doesn't carry the catalogue metadata.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PRICING_PRODUCTS } from "@/lib/regional-pricing";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ products: PRICING_PRODUCTS });
}
