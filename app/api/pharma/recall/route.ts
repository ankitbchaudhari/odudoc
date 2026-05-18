// POST /api/pharma/recall
//
// Admin-only — recall an entire batch. Every unit in the batch will
// thereafter show a red "recalled — do not consume" warning on
// /api/pharma/scan. Future enhancement: SMS-blast every patient who
// previously scanned a unit in this batch.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { recallBatch, getDrug } from "@/lib/pharma/catalogue-store";
import { listUnitsForBatch } from "@/lib/pharma/units-store";
import { listScansForBatch } from "@/lib/pharma/scan-log-store";
import { parseJson, z } from "@/lib/validate";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const Schema = z.object({
  drugId: z.string().trim().min(1).max(64),
  batchNumber: z.string().trim().min(1).max(64),
  reason: z.string().trim().min(4).max(1000),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!["admin", "pharmacist"].includes(role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;
  const { drugId, batchNumber, reason } = parsed;

  const drug = getDrug(drugId);
  if (!drug) return NextResponse.json({ error: "Drug not found" }, { status: 404 });

  const updated = recallBatch(drugId, batchNumber, reason);
  if (!updated) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

  // Count downstream impact — units minted vs scans already
  // recorded. Surfaced in the admin response so the operator sees
  // how many patients might need to be notified.
  const units = listUnitsForBatch(drugId, batchNumber);
  const scans = listScansForBatch(units.map((u) => u.serial));
  const uniqueScannedSerials = new Set(scans.map((s) => s.serial)).size;

  log.info("pharma.recall", {
    drugId,
    drug: drug.brandName,
    batchNumber,
    reason,
    unitsMinted: units.length,
    serialsScanned: uniqueScannedSerials,
    actor: session?.user?.email,
  } as Record<string, unknown>);

  return NextResponse.json({
    ok: true,
    drug: drug.brandName,
    batchNumber,
    recalledAt: updated.batches.find((b) => b.batchNumber === batchNumber)?.recalledAt,
    impact: {
      unitsMinted: units.length,
      serialsScanned: uniqueScannedSerials,
    },
  });
}
