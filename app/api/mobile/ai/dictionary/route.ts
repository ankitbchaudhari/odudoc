// POST /api/mobile/ai/dictionary
//
// Mobile-Bearer-auth medical dictionary. One endpoint, two modes:
// body { mode: "term", query } → TermLookup
// body { mode: "drug", query } → DrugLookup
//
// Single endpoint instead of two routes so the doctor app keeps one
// network helper. The mode discriminator is cheap and makes it easier
// to swap one search box between term + drug lookup with no
// per-mode plumbing.

import { NextRequest, NextResponse } from "next/server";
import { requireMobileUser } from "@/lib/mobile-auth";
import { lookupTerm, lookupDrug } from "@/lib/ai-medical-dictionary";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { log } from "@/lib/log";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const blocked = await enforceRateLimit(req, "mobile-ai-dict", 60, "10 m");
  if (blocked) return blocked;

  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "doctor" && auth.role !== "admin" && auth.role !== "nurse") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { mode?: "term" | "drug"; query?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const mode = body.mode === "drug" ? "drug" : "term";
  const query = (body.query || "").trim();
  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }
  if (query.length > 200) {
    return NextResponse.json({ error: "query too long" }, { status: 413 });
  }

  try {
    const result =
      mode === "drug"
        ? await lookupDrug({ query, callerEmail: auth.email })
        : await lookupTerm({ query, callerEmail: auth.email });
    return NextResponse.json({ mode, result });
  } catch (err) {
    log.error("mobile_ai_dict.failed", err, { mode });
    const msg = err instanceof Error ? err.message : "Lookup failed";
    return NextResponse.json(
      {
        error: /GEMINI_API_KEY/.test(msg)
          ? "AI dictionary is not configured."
          : "Could not look up.",
      },
      { status: 502 }
    );
  }
}
