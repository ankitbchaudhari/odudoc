// Lab catalogue — list all distinct test codes the marketplace
// recognises. Powers the "pick tests" multi-select on the patient
// flow when there's no doctor-issued order to start from.

import { NextResponse } from "next/server";
import { listTestsForLab, listAllLabs, seedDemoLabs } from "@/lib/lab-marketplace/lab-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const labs = listAllLabs();
  // Aggregate distinct test codes across labs.
  const map = new Map<string, { testCode: string; testName: string; category: string; minPrice: number }>();
  for (const lab of labs) {
    for (const t of listTestsForLab(lab.labId)) {
      if (!t.active) continue;
      const ex = map.get(t.testCode);
      const priced = Math.round(t.mrpRupees * (1 - t.discountPct / 100));
      if (!ex || priced < ex.minPrice) {
        map.set(t.testCode, { testCode: t.testCode, testName: t.testName, category: t.category, minPrice: priced });
      }
    }
  }
  const tests = Array.from(map.values()).sort((a, b) => a.testName.localeCompare(b.testName));
  return NextResponse.json({ labs, tests });
}

export async function POST() {
  const r = seedDemoLabs();
  try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
  return NextResponse.json(r);
}
