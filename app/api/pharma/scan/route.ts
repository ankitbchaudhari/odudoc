// GET /api/pharma/scan?u=<serial>
//
// Public anti-counterfeit verification endpoint. Looks up a unit
// serial (the QR payload on the box), joins to its drug + batch,
// and returns:
//   - verdict: "verified" | "recalled" | "unknown"
//   - drug name + composition + strength
//   - batch number + expiry + manufacturer
//   - dispense state: "first_scan" | "replay" + when it was last
//     scanned
//
// Logged on every call (lib/pharma/scan-log-store). No auth — the
// whole point is a patient with a phone can verify before swallowing
// a pill. Rate-limited by IP to deter scraping the unit space.

import { NextRequest, NextResponse } from "next/server";
import { findUnit, reloadUnits } from "@/lib/pharma/units-store";
import { getDrug } from "@/lib/pharma/catalogue-store";
import { recordScan, listScansForSerial, fingerprintIp } from "@/lib/pharma/scan-log-store";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const blocked = await enforceRateLimit(request, "pharma-scan", 60, "10 m");
  if (blocked) return blocked;

  const serial = (request.nextUrl.searchParams.get("u") || "").trim();
  if (!serial || serial.length < 8 || serial.length > 32) {
    return NextResponse.json({ verdict: "unknown", reason: "missing_or_invalid_serial" }, { status: 400 });
  }

  await reloadUnits();
  const unit = findUnit(serial);
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    null;
  const session = await getServerSession(authOptions).catch(() => null);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!unit) {
    // Log the unknown-serial scan too — useful for forensics (a
    // counterfeit ring scanning bogus codes leaves a trace here).
    recordScan({ serial, verdict: "unknown", userId, fingerprint: fingerprintIp(ip) });
    return NextResponse.json({
      verdict: "unknown",
      message:
        "This code is not registered with any pharma company on OduDoc. It may be a misprint or a counterfeit. Show this result to your pharmacist.",
    });
  }

  const drug = getDrug(unit.drugId);
  const batch = drug?.batches.find((b) => b.batchNumber === unit.batchNumber);
  const prevScans = listScansForSerial(serial);
  const recalled = !!batch?.recalledAt;
  const verdict: "verified" | "recalled" = recalled ? "recalled" : "verified";

  // Record THIS scan before computing dispense state so the log
  // already reflects it on the next call.
  const e = recordScan({ serial, verdict, userId, fingerprint: fingerprintIp(ip) });

  return NextResponse.json({
    verdict,
    drug: drug
      ? {
          brandName: drug.brandName,
          genericName: drug.genericName,
          composition: drug.composition,
          strength: drug.strength,
          form: drug.form,
          scheduleClass: drug.scheduleClass,
          manufacturerLicense: drug.manufacturerLicense,
        }
      : null,
    batch: batch
      ? {
          batchNumber: batch.batchNumber,
          manufacturedOn: batch.manufacturedOn,
          expiresOn: batch.expiresOn,
          recalledAt: batch.recalledAt || null,
          recallReason: batch.recallReason || null,
        }
      : null,
    dispense:
      prevScans.length === 0
        ? { state: "first_scan" as const, at: e.at }
        : {
            state: "replay" as const,
            firstScanAt: prevScans[0].at,
            scanCount: prevScans.length + 1, // +1 for the current
          },
  });
}
