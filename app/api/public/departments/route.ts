// Public (unauthenticated) list of active medical departments, enriched
// with patient-facing display metadata (emoji, starting fee, wait-time
// label). Used by /doctors "Browse by Specialty" and /consult
// "Book appointment with experts" so admin add/remove/toggle actions
// in /admin/departments show up on the marketing surfaces immediately.

import { NextResponse } from "next/server";
import { listDepartments } from "@/lib/departments-store";
import { toDisplayDepartments } from "@/lib/specialty-display";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const departments = toDisplayDepartments(listDepartments());
  return NextResponse.json({ departments });
}
