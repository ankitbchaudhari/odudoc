// Public (unauthenticated) list of active medical departments, enriched
// with patient-facing display metadata (emoji, starting fee, wait-time
// label). Used by /doctors "Browse by Specialty" and /consult
// "Book appointment with experts" so admin add/remove/toggle actions
// in /admin/departments show up on the marketing surfaces immediately.

import { NextResponse } from "next/server";
import { listDepartments } from "@/lib/departments-store";
import { toDisplayDepartments } from "@/lib/specialty-display";
import { listDoctors, reloadDoctors } from "@/lib/doctors-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Same key-fold used by /api/admin/departments — strips suffixes
 *  ("Cardiologist" → "cardio") so we match a doctor's specialty
 *  string against the department name regardless of plural / -ist /
 *  -ology variants. */
function normaliseSpecialty(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/(ist|ian|ologist|s)$/, "")
    .replace(/(ology|y)$/, "");
}

export async function GET() {
  // Compute live "X doctors available" per department from the actual
  // doctors store. The seeded doctorCount on each department row was
  // a marketing placeholder and stayed wrong forever. Reload is cheap
  // on warm Lambda + matches admin-side freshness.
  await reloadDoctors();
  const doctors = listDoctors({ status: "Active" });
  const countByKey = new Map<string, number>();
  for (const d of doctors) {
    const key = normaliseSpecialty(d.specialty);
    if (!key) continue;
    countByKey.set(key, (countByKey.get(key) || 0) + 1);
  }

  const liveDepartments = listDepartments().map((d) => ({
    ...d,
    doctorCount: countByKey.get(normaliseSpecialty(d.name)) || 0,
  }));
  const departments = toDisplayDepartments(liveDepartments);
  return NextResponse.json({ departments });
}
