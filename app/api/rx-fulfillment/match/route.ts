// Match an Rx to nearby pharmacies.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { matchRxToPharmacies, type RxLine } from "@/lib/rx-fulfillment/match";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json();
  const rx: RxLine[] = Array.isArray(body.rx) ? body.rx : [];
  if (rx.length === 0) return NextResponse.json({ error: "missing_rx" }, { status: 400 });
  const offers = matchRxToPharmacies({
    rx,
    patientPincode: body.patientPincode,
    includePartial: Boolean(body.includePartial),
  });
  return NextResponse.json({ offers });
}
