// GET /api/medicines/catalog
//
// Lightweight public catalog listing used by vendor inventory forms so
// they can pick from the same medicineIds the pharmacy search uses.
// No auth required — this is just the name/brand directory, no pricing.

import { NextResponse } from "next/server";
import { listMedicines } from "@/lib/medicines-catalog";

export const runtime = "nodejs";

export async function GET() {
  const items = listMedicines().map((m) => ({
    id: m.id,
    generic: m.generic,
    brands: m.brands,
    form: m.form,
    strengths: m.strengths,
    otc: m.otc,
  }));
  return NextResponse.json({ items });
}
