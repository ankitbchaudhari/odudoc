// Auto-reorder scanner.
//
// Walk the org's SKU catalogue, group SKUs at-or-below reorder by
// preferred vendor, and propose a draft PO per vendor. Idempotent:
// SKUs that fired in the last `cooldownHours` (default 24) are
// skipped so the same low-stock SKU doesn't generate multiple POs
// in a single procurement window.
//
// Returns the list of drafted POs + a per-SKU "candidate" report for
// the UI's scanner dashboard so ops can see what fired and what was
// debounced.

import {
  listSkus,
  markReorderFired,
  type ProcurementSku,
} from "./sku-store";
import {
  createPo,
  listPosForOrg,
  type PoLine,
  type PurchaseOrder,
} from "./po-store";

export interface ScanCandidate {
  sku: ProcurementSku;
  /** Why we considered this SKU. */
  reason: "below_reorder" | "low_cover" | "skipped_cooldown" | "skipped_paused" | "skipped_no_vendor";
  daysOfCover?: number;
}

export interface ScanReport {
  candidates: ScanCandidate[];
  draftedPos: PurchaseOrder[];
  scannedAt: string;
}

export interface ScanInput {
  organizationId: string;
  cooldownHours?: number;
  /** When true, scanner only reports — no POs are created. */
  dryRun?: boolean;
}

export function runScanner(input: ScanInput): ScanReport {
  const cooldownHours = input.cooldownHours ?? 24;
  const cooldownMs = cooldownHours * 60 * 60 * 1000;
  const now = Date.now();
  const skus = listSkus(input.organizationId);
  const candidates: ScanCandidate[] = [];

  // Group fireable SKUs by preferred vendor.
  const byVendor = new Map<string, { vendorName: string; lines: PoLine[]; firedSkus: ProcurementSku[] }>();
  for (const sku of skus) {
    const burn = sku.avgDailyBurn || 0;
    const cover = burn > 0 ? sku.stock / burn : Infinity;
    if (sku.paused) {
      candidates.push({ sku, reason: "skipped_paused" });
      continue;
    }
    if (sku.lastReorderAt && now - new Date(sku.lastReorderAt).getTime() < cooldownMs) {
      candidates.push({ sku, reason: "skipped_cooldown" });
      continue;
    }
    if (!sku.preferredVendorId && !sku.preferredVendorName) {
      // We still flag these so ops can fix the missing vendor pairing
      // — but only when stock is below the threshold; otherwise it's
      // not interesting noise.
      if (sku.stock <= sku.reorderLevel) {
        candidates.push({ sku, reason: "skipped_no_vendor" });
      }
      continue;
    }
    if (sku.stock <= sku.reorderLevel) {
      candidates.push({ sku, reason: "below_reorder", daysOfCover: cover });
    } else if (burn > 0 && cover < sku.leadTimeDays) {
      // "Stock above reorder level but vendor lead time will eat it" —
      // less common but a real procurement signal.
      candidates.push({ sku, reason: "low_cover", daysOfCover: cover });
    } else {
      continue;
    }
    const vendorKey = sku.preferredVendorId || sku.preferredVendorName!;
    let bucket = byVendor.get(vendorKey);
    if (!bucket) {
      bucket = {
        vendorName: sku.preferredVendorName || sku.preferredVendorId!,
        lines: [],
        firedSkus: [],
      };
      byVendor.set(vendorKey, bucket);
    }
    bucket.lines.push({
      skuId: sku.id,
      genericName: sku.genericName,
      brand: sku.brand,
      unit: sku.unit,
      orderedQty: sku.reorderQty,
      unitCostRupees: sku.unitCostRupees,
      reason: `Stock ${sku.stock} ≤ reorder ${sku.reorderLevel}`,
    });
    bucket.firedSkus.push(sku);
  }

  const draftedPos: PurchaseOrder[] = [];
  if (!input.dryRun) {
    for (const [vendorKey, bucket] of byVendor) {
      // Compute expected delivery as max lead-time across the lines.
      const maxLead = Math.max(...bucket.firedSkus.map((s) => s.leadTimeDays));
      const expected = new Date(now + maxLead * 24 * 60 * 60 * 1000).toISOString();
      const po = createPo({
        organizationId: input.organizationId,
        vendorId: bucket.firedSkus[0].preferredVendorId || vendorKey,
        vendorName: bucket.vendorName,
        source: "auto",
        lines: bucket.lines,
        expectedAt: expected,
        notes: `Auto-drafted by scanner — ${bucket.lines.length} SKU${bucket.lines.length === 1 ? "" : "s"} below reorder threshold.`,
      });
      draftedPos.push(po);
      // Stamp lastReorderAt on every fired SKU.
      for (const sku of bucket.firedSkus) markReorderFired(sku.id);
    }
  }

  // Suppress unused-arg warning when no real call site uses the
  // `listPosForOrg` import, but re-exporting helps callers.
  void listPosForOrg;

  return {
    candidates,
    draftedPos,
    scannedAt: new Date(now).toISOString(),
  };
}
