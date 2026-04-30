// POST /api/ai/dictionary/drug
// Body: { query: string }
// Returns: { result: DrugLookup }

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { lookupDrug } from "@/lib/ai-medical-dictionary";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { log } from "@/lib/log";

export const runtime = "nodejs";

function isClinician(role: string | undefined): boolean {
  return role === "doctor" || role === "admin" || role === "nurse";
}

export async function POST(req: NextRequest) {
  const blocked = await enforceRateLimit(req, "ai-dict-drug", 60, "10 m");
  if (blocked) return blocked;

  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  if (!isClinician(user?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { query?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const query = (body.query || "").trim();
  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }
  if (query.length > 200) {
    return NextResponse.json({ error: "query too long" }, { status: 413 });
  }

  try {
    const result = await lookupDrug({ query, callerEmail: user?.email });
    return NextResponse.json({ result });
  } catch (err) {
    log.error("ai_dict_drug.failed", err);
    const msg = err instanceof Error ? err.message : "Lookup failed";
    return NextResponse.json(
      {
        error: /GEMINI_API_KEY/.test(msg)
          ? "AI dictionary is not configured."
          : "Could not look up drug. Try again.",
      },
      { status: 502 }
    );
  }
}
