// ICD-10 code suggester.
//
// POST body: { query: string }            single-line lookup
//          OR { lines: string[] }          multi-line dedupe lookup

import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError } from "@/lib/tenant";
import { suggestIcd10, suggestIcd10Multi } from "@/lib/clinical-ai/icd10";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await requireOrg();
    const body = await req.json();
    const limit = Math.min(20, Math.max(1, parseInt(String(body.limit || 8), 10)));
    if (Array.isArray(body.lines)) {
      return NextResponse.json({ suggestions: suggestIcd10Multi(body.lines, limit) });
    }
    if (typeof body.query === "string") {
      return NextResponse.json({ suggestions: suggestIcd10(body.query, limit) });
    }
    return NextResponse.json({ error: "missing_query_or_lines" }, { status: 400 });
  } catch (err) {
    if (err instanceof TenantError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
