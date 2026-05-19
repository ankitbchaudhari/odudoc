// GET /api/loinc?q=…&class=…
// Lookup endpoint over the LOINC seed (~120 codes). Production
// integrators can swap in a full LOINC database by replacing
// lib/loinc-seed.ts with a fuller list (RegenStrief's quarterly
// release).

import { NextRequest, NextResponse } from "next/server";
import { searchLoinc, type LabClass } from "@/lib/loinc-seed";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const q = sp.get("q") || "";
  const cls = (sp.get("class") as LabClass | null) || undefined;
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit") || 50)));
  return NextResponse.json({ results: searchLoinc(q, { class: cls, limit }) });
}
