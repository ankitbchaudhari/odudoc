// GET /api/lab-tests/mobile
//
// Public list of active lab tests for the patient app's Lab Tests screen.
// No auth required (catalog data). Reads admin-managed inventory.

import { NextResponse } from "next/server";
import { listLabTests } from "@/lib/lab-tests-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const all = listLabTests({ onlyActive: true });
  // Map to the slimmer shape the patient app expects (lib/data.ts LabTest):
  //   { id, name, category, price, description }
  // The website doesn't track a per-test category — bucket everything into
  // "Lab Test" until we add a categories field admin-side.
  const labTests = all.map((t) => ({
    id: t.id,
    name: t.name,
    category: t.parameters > 5 ? "Package" : "Lab Test",
    price: t.price,
    description: t.description,
    turnaround: t.turnaround,
    parameters: t.parameters,
    originalPrice: t.originalPrice,
    popular: t.popular,
  }));
  return NextResponse.json({ labTests });
}
