// POST /api/equipment/[slug]/order { qty }
//
// Charges the buyer's wallet (retail or wholesale tier per V10 §2.4),
// creates the order row, registers warranty. Manufacturer payout
// happens when status flips to "dispatched" via a separate endpoint
// (not in this commit — manufacturer panel ships with V7 §3 pharma /
// manufacturer panels).

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getProductBySlug, placeOrder, type EquipmentOrder } from "@/lib/equipment-marketplace-store";
import { parseJson, z } from "@/lib/validate";

export const runtime = "nodejs";

const Schema = z.object({ qty: z.number().int().positive().max(10_000) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;

  const product = await getProductBySlug(slug);
  if (!product) return NextResponse.json({ error: "product_not_found" }, { status: 404 });

  // Map web-side roles to buyer kinds for V10 §3.3 wholesale gate.
  const role = session.user.role;
  const buyerKind: EquipmentOrder["buyerKind"] =
    role === "admin" || role === "staff" || role === "support" ? "hospital"
    : role === "doctor" ? "clinic"
    : "patient";

  const result = await placeOrder({
    productId: product.id,
    qty: parsed.qty,
    buyer: {
      id: session.user.email,
      kind: buyerKind,
      name: session.user.name || session.user.email,
    },
  });
  if (!result.ok) {
    const status = result.error === "insufficient_balance" ? 422
      : result.error === "product_not_listed" ? 409
      : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ order: result.order });
}
