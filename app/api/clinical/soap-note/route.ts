// SOAP-note structurer endpoint.
//
// POST { transcript: string } → structured SOAP note with extracted
// vitals, medications, surfaced symptoms, and basic stats.
//
// Pure pass-through. No persistence — the caller can save the result
// alongside the encounter via the encounters API in a follow-up call.

import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError } from "@/lib/tenant";
import { structureSoapNote } from "@/lib/clinical-ai/soap-note";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await requireOrg();
    const body = await req.json();
    const transcript = String(body.transcript || "");
    if (!transcript.trim()) {
      return NextResponse.json({ error: "missing_transcript" }, { status: 400 });
    }
    const note = structureSoapNote(transcript);
    return NextResponse.json({ note });
  } catch (err) {
    if (err instanceof TenantError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
