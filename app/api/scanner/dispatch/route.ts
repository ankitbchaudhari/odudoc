// POST /api/scanner/dispatch  { code }
//
// V15 universal scan endpoint. OduDoc Pro has one scanner UI; this
// endpoint figures out what was scanned and routes to the right
// downstream resolver. Returns { context, label, payload, nextAction }
// — the UI uses nextAction to render the right call-to-action.
//
// Rate-limit: 200/min/IP. Reception + pharmacy desks scan fast.

import { NextRequest, NextResponse } from "next/server";
import { dispatchFromRequest } from "@/lib/scanner-dispatch";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { parseJson, z } from "@/lib/validate";

export const runtime = "nodejs";

const Schema = z.object({ code: z.string().min(1).max(256) });

export async function POST(request: NextRequest) {
  const blocked = await enforceRateLimit(request, "scanner-dispatch", 200, "1 m");
  if (blocked) return blocked;
  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;
  const result = await dispatchFromRequest(parsed.code);
  return NextResponse.json(result);
}
