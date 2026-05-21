"use client";

// V15 §4 pharmacy stock screen — barcode-driven receive with
// auto-filled brand / manufacturer / batch / expiry.
//
// Workflow:
//   1. Scan a drug barcode in the top box
//   2. If linked, the brand + drugInn + recent batch auto-fill
//   3. Enter quantity received → submit
//   4. Row appears in the stock list below
//
// Plus V15 §5: paste a pharma B2B order id → inherits all line
// items + their batches in one go.

import { useCallback, useEffect, useState } from "react";

interface MappingHit {
  barcode: string;
  drugInn: string;
  brandName?: string;
  manufacturerPharmaId?: string;
  defaultPackSize?: number;
  recentBatch?: { batchNumber: string; manufacturedOn: string; expiresOn: string; manufacturingSite?: string };
}

interface StockRow {
  id: string;
  pharmacyId: string;
  drugInn: string;
  brandName?: string;
  batchNumber?: string;
  expiresOn?: string;
  packSize?: number;
  unitsOnHand: number;
  inheritedFromOrderId?: string;
  receivedAt: string;
}

const PHARMACY_ID = "demo-pharmacy-001";

export default function PharmacyStockPage() {
  const [barcode, setBarcode] = useState("");
  const [hit, setHit] = useState<MappingHit | null>(null);
  const [needLink, setNeedLink] = useState(false);
  const [units, setUnits] = useState(50);
  const [busy, setBusy] = useState(false);
  const [stockRows, setStockRows] = useState<StockRow[]>([]);

  // V15 §5 inherit form
  const [inheritOrderId, setInheritOrderId] = useState("");
  const [inheritResult, setInheritResult] = useState<{ rows: StockRow[]; warnings: string[] } | null>(null);

  const reload = useCallback(async () => {
    // Use the universal scanner's dispatch for the barcode lookup so
    // we re-use the same engine as everywhere else.
    if (!barcode.trim()) return;
    setHit(null);
    setNeedLink(false);
    const r = await fetch("/api/scanner/dispatch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: barcode.trim() }),
    });
    const j = await r.json();
    if (j.context !== "pharmacy_stock_barcode") {
      // Not a stock barcode — clear.
      return;
    }
    if (j.error === "drug_not_in_master") {
      setNeedLink(true);
      return;
    }
    if (j.payload) setHit(j.payload as MappingHit);
  }, [barcode]);

  const receive = async () => {
    if (!hit) return;
    setBusy(true);
    try {
      const r = await fetch("/api/pharmacy/stock/receive", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          pharmacyId: PHARMACY_ID,
          barcode: hit.barcode,
          unitsOnHand: units,
        }),
      });
      if (r.ok) {
        setBarcode("");
        setHit(null);
        setUnits(50);
        loadStock();
      }
    } finally { setBusy(false); }
  };

  const inherit = async () => {
    if (!inheritOrderId.trim()) return;
    setBusy(true);
    try {
      // Demo: feed three line items as if the pharma order had them
      // (real wire would query equipment-marketplace-store for the
      // order's line items + drugInns).
      const r = await fetch("/api/pharmacy/stock/inherit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          pharmacyId: PHARMACY_ID,
          pharmaCompanyId: "demo-pharma-cipla",
          orderId: inheritOrderId.trim(),
          lineItems: [
            { drugInn: "Paracetamol", brandName: "Crocin 500", units: 200, packSize: 15 },
            { drugInn: "Amoxicillin + Clavulanic Acid", brandName: "Augmentin 625 Duo", units: 80, packSize: 10 },
          ],
        }),
      });
      if (r.ok) {
        const j = await r.json();
        setInheritResult(j);
        setInheritOrderId("");
        loadStock();
      }
    } finally { setBusy(false); }
  };

  const loadStock = useCallback(async () => {
    // No dedicated read endpoint yet — use the scanner dispatcher's
    // barcode lookup or, for the list view, we'd add a GET endpoint.
    // For now this is a placeholder.
    setStockRows((prev) => prev);
  }, []);

  useEffect(() => { void loadStock(); }, [loadStock]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pharmacy stock — barcode receive</h1>
        <p className="mt-1 text-sm text-gray-600">
          V15 §4 — scan a drug barcode, the brand + INN + manufacturer +
          most-recent batch auto-fill from the drug master + active
          pharma batch. V15 §5 — paste a pharma B2B order id to inherit
          every line item at once.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Single barcode receive */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900">Receive by barcode</h2>
          <div className="mt-3 flex gap-2">
            <input
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && reload()}
              placeholder="Scan / paste barcode (EAN-13 or DRG-…)"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
            />
            <button onClick={reload} disabled={!barcode.trim()} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700">Lookup</button>
          </div>

          {needLink && (
            <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              Barcode not linked yet. Add it via the V15 §4.2 link API or
              the future "link barcode" UI (deferred).
            </div>
          )}

          {hit && (
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Auto-filled from master</p>
                <p className="mt-1 text-base font-bold text-gray-900">{hit.brandName || hit.drugInn}</p>
                <p className="text-xs text-gray-600">INN: {hit.drugInn}</p>
                {hit.manufacturerPharmaId && <p className="text-xs text-gray-600">Manufacturer: {hit.manufacturerPharmaId}</p>}
                {hit.defaultPackSize && <p className="text-xs text-gray-600">Pack size: {hit.defaultPackSize}</p>}
                {hit.recentBatch && (
                  <div className="mt-2 rounded border border-emerald-200 bg-white p-2 text-xs">
                    <p className="font-semibold text-emerald-800">Inherited from latest pharma batch:</p>
                    <p className="text-gray-700">Batch <span className="font-mono">{hit.recentBatch.batchNumber}</span> · mfg {hit.recentBatch.manufacturedOn} · expires {hit.recentBatch.expiresOn}</p>
                    {hit.recentBatch.manufacturingSite && <p className="text-gray-500">Site: {hit.recentBatch.manufacturingSite}</p>}
                  </div>
                )}
              </div>
              <label className="block text-xs font-semibold text-gray-700">
                Units received
                <input type="number" value={units} onChange={(e) => setUnits(Math.max(1, Number(e.target.value) || 1))} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm font-normal" />
              </label>
              <button onClick={receive} disabled={busy} className="w-full rounded-xl bg-[#0F6E56] py-2.5 text-sm font-bold text-white hover:bg-[#0A5942] disabled:opacity-60">
                {busy ? "Receiving…" : `Confirm: +${units} units`}
              </button>
            </div>
          )}
        </div>

        {/* V15 §5 — inherit from pharma order */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900">Inherit from pharma B2B order</h2>
          <p className="mt-1 text-xs text-gray-600">
            V15 §5 — when a pharma ships a B2B order, paste the order id
            and every line item auto-creates a stock row with inherited
            batch + manufacturing site + serial range.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              value={inheritOrderId}
              onChange={(e) => setInheritOrderId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && inherit()}
              placeholder="Pharma order id (e.g. ord_xxx)"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
            />
            <button onClick={inherit} disabled={busy || !inheritOrderId.trim()} className="rounded-xl bg-[#0F6E56] px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
              {busy ? "Inheriting…" : "Inherit"}
            </button>
          </div>

          {inheritResult && (
            <div className="mt-3 space-y-2">
              <p className="text-sm font-semibold text-emerald-800">{inheritResult.rows.length} stock rows created</p>
              {inheritResult.warnings.length > 0 && (
                <div className="rounded border border-amber-300 bg-amber-50 p-2 text-xs">
                  <p className="font-semibold text-amber-900">{inheritResult.warnings.length} warnings:</p>
                  <ul className="mt-1 list-disc pl-4 text-amber-800">
                    {inheritResult.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}
              <ul className="space-y-1 text-xs">
                {inheritResult.rows.map((r) => (
                  <li key={r.id} className="rounded bg-gray-50 px-3 py-1.5">
                    <span className="font-semibold">{r.brandName || r.drugInn}</span> · {r.unitsOnHand} units
                    {r.batchNumber && <span className="ml-2 font-mono text-gray-500">batch {r.batchNumber}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-xs text-gray-600">
        <p className="font-semibold text-gray-800">Demo seed barcodes:</p>
        <ul className="mt-2 space-y-0.5 font-mono">
          <li><code className="rounded bg-white px-1.5 py-0.5">8901030801234</code> → Crocin 500 (Paracetamol)</li>
          <li><code className="rounded bg-white px-1.5 py-0.5">DRG-AMOX-625</code> → Augmentin 625 Duo</li>
        </ul>
      </div>
    </div>
  );
}
