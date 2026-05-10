"use client";

// Anti-counterfeit pharmacist kiosk.
//
// Pharmacist points the camera at the strip's barcode (or types
// brand+batch). We use the browser's native BarcodeDetector API
// when available — works on Chrome (Android + ChromeOS + recent
// desktop). Falls back to keyboard input which a USB barcode
// scanner emits as keystrokes by default. No vendor SDK required.
//
// On scan we call /api/pharma/verify (already public) and render
// the verdict — verified / warning / counterfeit_risk.

import { useCallback, useEffect, useRef, useState } from "react";

type Verdict = "verified" | "warning" | "counterfeit_risk";
interface VerifyResponse {
  verdict: Verdict;
  reasons: string[];
  drug?: { drug?: { brandName: string; genericName: string }; match: "exact" | "brand_only" } | null;
  partner?: { status: string; partner?: { legalName: string } } | null;
}

declare global {
  interface Window {
    BarcodeDetector?: new (opts?: { formats?: string[] }) => BarcodeDetectorLike;
  }
}
interface BarcodeDetectorLike {
  detect: (image: HTMLVideoElement | HTMLCanvasElement) => Promise<Array<{ rawValue: string; format: string }>>;
}

export default function AntiCounterfeitKioskPage() {
  const [scanning, setScanning] = useState(false);
  const [supported, setSupported] = useState(true);
  const [brandName, setBrandName] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [partner, setPartner] = useState("");
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && !window.BarcodeDetector) setSupported(false);
  }, []);

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startScan = async () => {
    if (!window.BarcodeDetector) { setSupported(false); return; }
    setError(null); setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 640, height: 480 }, audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      detectorRef.current = new window.BarcodeDetector({
        formats: ["ean_13", "ean_8", "code_128", "code_39", "qr_code", "data_matrix", "upc_a", "upc_e"],
      });
      setScanning(true);
      const tick = async () => {
        if (!detectorRef.current || !videoRef.current) return;
        try {
          const codes = await detectorRef.current.detect(videoRef.current);
          if (codes.length > 0) {
            // Common format: brand|batch encoded as a single string
            // separated by "|" or whitespace. Fall back to setting
            // the whole code as the batch number if no separator.
            const raw = codes[0].rawValue;
            const parts = raw.split(/[|;,\s]+/).filter(Boolean);
            if (parts.length >= 2) { setBrandName(parts[0]); setBatchNumber(parts[1]); }
            else setBatchNumber(raw);
            stopCamera();
            // Kick off verify if brand is now populated.
            if (parts.length >= 2) submit(parts[0], parts[1]);
            return;
          }
        } catch { /* skip frame */ }
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      setError(`Camera access denied: ${(e as Error).message}`);
    }
  };

  const submit = async (brandOverride?: string, batchOverride?: string) => {
    const b = (brandOverride ?? brandName).trim();
    if (!b) { setError("Brand name required."); return; }
    setError(null); setBusy(true);
    try {
      const r = await fetch("/api/pharma/verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: b,
          batchNumber: (batchOverride ?? batchNumber).trim() || undefined,
          partnerIdentifier: partner.trim() || undefined,
        }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) { setError((d as { error?: string } | null)?.error || `Failed (${r.status})`); return; }
      setResult(d as VerifyResponse);
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Anti-counterfeit kiosk</h2>
        <p className="mt-1 text-sm text-gray-500">
          Pharmacist scans the strip barcode or types brand + batch. The verdict draws from the pharma company's own registry on OduDoc.
        </p>
      </div>

      {!supported && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Camera barcode detection isn't supported on this browser. Use a USB barcode scanner (most emit keystrokes — focus the Batch field and scan), or type the values manually.
        </p>
      )}

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        {scanning ? (
          <>
            <video ref={videoRef} className="aspect-[4/3] w-full rounded-xl bg-slate-900" playsInline />
            <button onClick={stopCamera} className="mt-3 w-full rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white">Stop scanning</button>
          </>
        ) : supported ? (
          <button onClick={startScan} className="w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white">📷 Start camera scan</button>
        ) : null}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <I label="Brand" v={brandName} on={setBrandName} placeholder="e.g. Crocin" />
          <I label="Batch" v={batchNumber} on={setBatchNumber} placeholder="From the strip" />
          <I label="Seller / pharmacy (optional)" v={partner} on={setPartner} placeholder="Legal name, GSTIN, or drug license" className="sm:col-span-2" />
        </div>
        <button onClick={() => submit()} disabled={busy || !brandName.trim()} className="mt-4 w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
          {busy ? "Checking…" : "Verify"}
        </button>
        {error && <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
      </section>

      {result && (
        <section className={`mt-6 rounded-2xl border-2 p-6 ${
          result.verdict === "verified" ? "border-emerald-300 bg-emerald-50" :
          result.verdict === "warning" ? "border-amber-300 bg-amber-50" :
          "border-rose-300 bg-rose-50"
        }`}>
          <p className="text-3xl">{result.verdict === "verified" ? "✓" : result.verdict === "warning" ? "⚠️" : "🚨"}</p>
          <p className={`mt-2 text-lg font-extrabold ${
            result.verdict === "verified" ? "text-emerald-900" :
            result.verdict === "warning" ? "text-amber-900" :
            "text-rose-900"
          }`}>
            {result.verdict === "verified" ? "Verified" : result.verdict === "warning" ? "Caution" : "Counterfeit risk"}
          </p>
          {result.reasons.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-xs text-slate-700 space-y-0.5">
              {result.reasons.map((r) => <li key={r}>{r.replace(/_/g, " ")}</li>)}
            </ul>
          )}
          {result.drug?.drug && (
            <p className="mt-3 text-xs text-slate-700">
              <b>{result.drug.drug.brandName}</b> · {result.drug.drug.genericName} · match: {result.drug.match}
            </p>
          )}
          {result.partner?.partner && (
            <p className="mt-1 text-xs text-slate-700">
              Seller: <b>{result.partner.partner.legalName}</b> · {result.partner.status.replace(/_/g, " ")}
            </p>
          )}
        </section>
      )}
    </div>
  );
}

function I({ label, v, on, placeholder, className = "" }: { label: string; v: string; on: (v: string) => void; placeholder?: string; className?: string }) {
  return <label className={`text-xs font-semibold text-slate-700 ${className}`}>{label}<input value={v} onChange={(e) => on(e.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" /></label>;
}
