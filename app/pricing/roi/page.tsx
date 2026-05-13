"use client";

// ROI calculator — companion to /pricing. Lets a hospital procurement
// officer model their savings with sliders. Numbers are conservative
// midpoints from published Indian healthtech ROI studies.

import Link from "next/link";
import { useMemo, useState } from "react";

interface RoiInput {
  beds: number;
  opdPerDay: number;
  doctors: number;
  nurses: number;
  avgConsultFeeInr: number;
}

function computeRoi(input: RoiInput) {
  const consultsPerYear = input.opdPerDay * 365;
  // 1. Ambient scribe + voice station — saves ~2 min per consult
  //    of documentation overhead. Doctor time @ ₹2,500/hr.
  const scribeMinSavedPerYear = consultsPerYear * 2;
  const scribeRupees = (scribeMinSavedPerYear / 60) * 2500;
  // 2. Auto-roster — 6 hours / fortnight of admin time saved.
  //    Admin time @ ₹600/hr × 26 cycles.
  const rosterRupees = 6 * 600 * 26;
  // 3. Procurement auto-reorder — pharma waste from expiry +
  //    emergency-buy markup is ~3% of pharmacy spend; we save ~30%
  //    of that. Pharma spend ≈ ₹40k/bed/yr.
  const procurementRupees = input.beds * 40000 * 0.03 * 0.3;
  // 4. Drug-safety guardrail — one prevented adverse event per 200
  //    doctor-consult pairs; avg adverse-event cost ₹15k.
  const safetyRupees = (consultsPerYear * input.doctors / 200) * 15000;
  // 5. TPA cashless — reduces patient-paid-then-claim friction by
  //    ~₹250 per IPD admission. 5% of OPD become IPD.
  const cashlessRupees = consultsPerYear * 0.05 * 250;
  // 6. Pharmacy marketplace — 4% gross margin on Rx fulfillment;
  //    50% of OPD prescriptions get filled through us.
  const marketplaceRupees = consultsPerYear * 0.5 * input.avgConsultFeeInr * 0.04;
  // 7. Network effect — chronic-care + cross-hospital referral.
  //    Modest 1% of consults.
  const networkRupees = consultsPerYear * 0.01 * input.avgConsultFeeInr;

  const total = scribeRupees + rosterRupees + procurementRupees + safetyRupees + cashlessRupees + marketplaceRupees + networkRupees;
  return {
    items: [
      { label: "Doctor time saved (Ambient Scribe + Voice Station)", v: scribeRupees, detail: `${Math.round(scribeMinSavedPerYear / 60)} hours/year reclaimed` },
      { label: "Admin time saved (Auto-Roster)", v: rosterRupees, detail: "6 hours/fortnight × 26 cycles" },
      { label: "Pharmacy waste reduced (Procurement)", v: procurementRupees, detail: "Expiry + emergency-buy markup" },
      { label: "Adverse-event prevention (Drug Safety)", v: safetyRupees, detail: "1 prevented event per 200 consults" },
      { label: "Billing friction (TPA Cashless)", v: cashlessRupees, detail: "₹250/admission overhead" },
      { label: "Marketplace revenue (Pharmacy + Lab)", v: marketplaceRupees, detail: "4% on filled prescriptions" },
      { label: "Network referral revenue", v: networkRupees, detail: "Cross-hospital + chronic-care" },
    ],
    total,
  };
}

function Slider({ label, v, setV, min, max, step }: { label: string; v: number; setV: (n: number) => void; min: number; max: number; step?: number }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</label>
        <span className="rounded-md bg-white dark:bg-slate-900 px-2 py-0.5 font-mono text-xs font-bold text-slate-900 dark:text-slate-100 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">{v.toLocaleString("en-IN")}</span>
      </div>
      <input type="range" min={min} max={max} step={step || 1} value={v} onChange={(e) => setV(Number(e.target.value))} className="mt-1 w-full accent-emerald-600" />
    </div>
  );
}

export default function RoiPage() {
  const [roi, setRoi] = useState<RoiInput>({ beds: 80, opdPerDay: 250, doctors: 18, nurses: 36, avgConsultFeeInr: 800 });
  const result = useMemo(() => computeRoi(roi), [roi]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="text-center">
          <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700">ROI calculator</span>
          <h1 className="mt-3 text-4xl font-extrabold text-slate-900 dark:text-slate-100 sm:text-5xl">What does OduDoc save your hospital?</h1>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
            Tweak the sliders. Numbers are conservative midpoints from published Indian healthtech studies.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm">
            <p className="mb-4 text-sm font-bold text-slate-900 dark:text-slate-100">Your hospital</p>
            <div className="space-y-4">
              <Slider label="Beds" v={roi.beds} setV={(n) => setRoi({ ...roi, beds: n })} min={5} max={500} />
              <Slider label="OPD consults / day" v={roi.opdPerDay} setV={(n) => setRoi({ ...roi, opdPerDay: n })} min={20} max={1500} />
              <Slider label="Doctors on staff" v={roi.doctors} setV={(n) => setRoi({ ...roi, doctors: n })} min={1} max={300} />
              <Slider label="Nurses on staff" v={roi.nurses} setV={(n) => setRoi({ ...roi, nurses: n })} min={2} max={600} />
              <Slider label="Avg consult fee (₹)" v={roi.avgConsultFeeInr} setV={(n) => setRoi({ ...roi, avgConsultFeeInr: n })} min={200} max={5000} step={50} />
            </div>
          </div>

          <div className="rounded-2xl bg-emerald-50 p-6 shadow-sm ring-2 ring-emerald-300">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Estimated annual savings + revenue</p>
            <p className="mt-2 text-5xl font-extrabold text-emerald-600">₹{Math.round(result.total).toLocaleString("en-IN")}</p>
            <p className="mt-1 text-xs text-emerald-800">≈ ₹{Math.round(result.total / 12).toLocaleString("en-IN")} per month · ₹{Math.round(result.total / 365).toLocaleString("en-IN")} per day</p>

            <ul className="mt-5 space-y-2 text-xs">
              {result.items.map((it) => (
                <li key={it.label} className="flex items-start justify-between gap-3 rounded-md bg-white dark:bg-slate-900 px-3 py-2">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{it.label}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{it.detail}</p>
                  </div>
                  <p className="font-mono font-bold text-emerald-700">₹{Math.round(it.v).toLocaleString("en-IN")}</p>
                </li>
              ))}
            </ul>

            <p className="mt-4 rounded-lg bg-white dark:bg-slate-900 p-3 text-[11px] text-slate-600 dark:text-slate-300">
              Conservative model. Excludes lives saved by NEWS2 alerts, regulatory fines avoided by DPDP consent vault, and the network effect of patients staying in-system across hospitals.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link href="/pricing" className="rounded-lg border border-slate-300 bg-white dark:bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-200">See plans</Link>
          <Link href="/contact" className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white">Book a demo →</Link>
        </div>
      </div>
    </main>
  );
}
