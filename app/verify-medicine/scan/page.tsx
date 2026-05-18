"use client";

// /verify-medicine/scan?u=<serial>
//
// Landing target for QR codes printed on pharma packaging. The QR
// encodes a URL like https://www.odudoc.com/verify-medicine/scan?u=ABCD1234XY.
// Page reads `u` from the query string, calls /api/pharma/scan, and
// renders a verdict card with the drug + batch + dispense state.
//
// Public — no auth required, no PII captured (a signed-in scanner's
// id is attached server-side only).

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import DrugScheduleBadge from "@/components/DrugScheduleBadge";
import { getScheduleInfo } from "@/lib/drug-schedules";

interface ScanResponse {
  verdict: "verified" | "recalled" | "unknown";
  message?: string;
  drug?: {
    brandName: string;
    genericName: string;
    composition: string;
    strength: string;
    form: string;
    scheduleClass: string;
    manufacturerLicense: string;
  } | null;
  batch?: {
    batchNumber: string;
    manufacturedOn: string;
    expiresOn: string;
    recalledAt: string | null;
    recallReason: string | null;
  } | null;
  dispense?:
    | { state: "first_scan"; at: string }
    | { state: "replay"; firstScanAt: string; scanCount: number };
}

function ScanInner() {
  const params = useSearchParams();
  const serial = params?.get("u") || "";
  const [data, setData] = useState<ScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!serial) return;
    fetch(`/api/pharma/scan?u=${encodeURIComponent(serial)}`)
      .then(async (r) => {
        const j = (await r.json()) as ScanResponse;
        if (!r.ok && r.status !== 400) throw new Error("Scan failed");
        setData(j);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Scan failed"));
  }, [serial]);

  if (!serial) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">No code in this URL</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
          This page expects a <code>?u=</code> serial. Scan the QR on your packaging again, or use the
          {" "}
          <Link href="/verify-medicine" className="text-emerald-600 hover:underline">brand+batch verifier</Link>.
        </p>
      </main>
    );
  }
  if (error) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <p className="text-rose-700">{error}</p>
      </main>
    );
  }
  if (!data) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-gray-500">Verifying serial {serial}…</p>
      </main>
    );
  }

  // Verdict colour + copy
  const palette = {
    verified: {
      bg: "from-emerald-500 to-teal-600",
      ring: "border-emerald-300",
      title: "✓ Verified — genuine OduDoc-registered product",
      tone: "text-emerald-800",
    },
    recalled: {
      bg: "from-rose-500 to-pink-600",
      ring: "border-rose-300",
      title: "⚠ Recalled — do not consume",
      tone: "text-rose-900",
    },
    unknown: {
      bg: "from-amber-500 to-orange-600",
      ring: "border-amber-300",
      title: "? Not registered — possible counterfeit",
      tone: "text-amber-900",
    },
  }[data.verdict];

  return (
    <main className="bg-gradient-to-br from-slate-50 via-white to-emerald-50 min-h-screen py-12 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">Anti-counterfeit scan</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-slate-100">Verification result</h1>

        {/* Verdict banner */}
        <div className={`mt-6 overflow-hidden rounded-3xl border-2 ${palette.ring} bg-white shadow-lg dark:bg-slate-900`}>
          <div className={`bg-gradient-to-br ${palette.bg} px-6 py-5 text-white`}>
            <p className="text-lg font-extrabold leading-tight">{palette.title}</p>
            <p className="mt-1 text-sm text-white/85">Serial: <code className="rounded bg-white/15 px-2 py-0.5">{serial}</code></p>
          </div>

          <div className="space-y-4 p-6">
            {data.verdict === "unknown" && (
              <p className={`rounded-2xl bg-amber-50 p-4 text-sm ${palette.tone}`}>
                {data.message || "This serial isn't registered. Don't take the medicine. Show this result to your pharmacist or call the pharma company on the package."}
              </p>
            )}

            {data.drug && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Drug</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <p className="text-lg font-bold text-gray-900 dark:text-slate-100">
                    {data.drug.brandName}{" "}
                    <span className="text-gray-500 dark:text-slate-400 text-base font-normal">({data.drug.genericName})</span>
                  </p>
                  <DrugScheduleBadge schedule={data.drug.scheduleClass} size="full" />
                </div>
                <p className="text-sm text-gray-600 dark:text-slate-300">
                  {data.drug.composition} · {data.drug.strength} · {data.drug.form}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                  License: {data.drug.manufacturerLicense}
                </p>
                {(() => {
                  const info = getScheduleInfo(data.drug.scheduleClass);
                  return info ? (
                    <p className="mt-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <strong>{info.longLabel}.</strong> {info.patientHint}
                    </p>
                  ) : null;
                })()}
              </div>
            )}

            {data.batch && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Batch</p>
                <p className="mt-1 font-bold text-gray-900 dark:text-slate-100">
                  #{data.batch.batchNumber}
                  {data.batch.recalledAt && (
                    <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-800">RECALLED</span>
                  )}
                </p>
                <p className="text-sm text-gray-600 dark:text-slate-300">
                  Manufactured {fmt(data.batch.manufacturedOn)} · Expires {fmt(data.batch.expiresOn)}
                </p>
                {data.batch.recallReason && (
                  <p className="mt-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-800">
                    <strong>Reason:</strong> {data.batch.recallReason}
                  </p>
                )}
              </div>
            )}

            {data.dispense && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Dispense status</p>
                {data.dispense.state === "first_scan" ? (
                  <p className="mt-1 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-800">
                    First scan — this is the original, never-before-scanned packaging.
                  </p>
                ) : (
                  <p className="mt-1 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">
                    <strong>Replay scan.</strong> This serial was first scanned on{" "}
                    {fmt(data.dispense.firstScanAt)} and has been scanned {data.dispense.scanCount} times in total.
                    If you didn&apos;t scan it before, the seal may have been tampered with — consult your pharmacist.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500 dark:text-slate-400">
          Don&apos;t have a QR? Use the{" "}
          <Link href="/verify-medicine" className="text-emerald-600 hover:underline">
            brand + batch verifier
          </Link>{" "}
          instead.
        </p>
      </div>
    </main>
  );
}

function fmt(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

export default function ScanPage() {
  return (
    <Suspense fallback={null}>
      <ScanInner />
    </Suspense>
  );
}
