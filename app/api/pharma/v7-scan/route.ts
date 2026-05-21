// POST /api/pharma/v7-scan — V7 §3.6 anti-counterfeit serial verification.
//
// Distinct from the legacy /api/pharma/scan (which is the
// brand-catalogue verifier) — this one is keyed on the V7 §3.6
// batch + serial registry shipped in lib/pharma-store.ts.
//
// Public endpoint (no auth required). The serial code is the secret —
// it's printed under a scratch-off panel on the real packaging, so
// possessing the code IS the proof. Rate-limited to discourage
// enumeration of the code space.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifySerial } from "@/lib/pharma-store";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { parseJson, z } from "@/lib/validate";

export const runtime = "nodejs";

const Schema = z.object({ code: z.string().min(4).max(64) });

export async function POST(request: NextRequest) {
  const blocked = await enforceRateLimit(request, "pharma-v7-scan", 30, "1 m");
  if (blocked) return blocked;
  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;
  const session = await getServerSession(authOptions);
  const result = await verifySerial(parsed.code, session?.user?.email || undefined);
  return NextResponse.json(result);
}
