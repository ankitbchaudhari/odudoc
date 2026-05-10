// Match an order (test code list) to nearby labs.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { matchLabOrder, type OrderTest } from "@/lib/lab-marketplace/match";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json();
  const tests: OrderTest[] = Array.isArray(body.tests) ? body.tests : [];
  if (tests.length === 0) return NextResponse.json({ error: "missing_tests" }, { status: 400 });
  const offers = matchLabOrder({
    tests,
    patientPincode: body.patientPincode,
    includePartial: Boolean(body.includePartial),
  });
  return NextResponse.json({ offers });
}
