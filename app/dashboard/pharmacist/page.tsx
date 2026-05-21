"use client";

// V5 §5.7 Pharmacist dashboard. Theme: V5 §4.1 pharma #854D0E.

import StaffDashboardFrame, { StaffPanel, StaffRow, StaffNote } from "@/components/staff/StaffDashboardFrame";

export default function PharmacistDashboard() {
  return (
    <StaffDashboardFrame
      config={{
        roleLabel: "Pharmacist",
        themeHex: "#854D0E",
        accentHex: "#C9A84C",
        heroTitle: "Pharmacy counter · 14 Rx queued · 2 NDPS",
        heroSub: "Cold-chain temp 4.2°C ✓. DDI alerts open: 1. Expiry alerts (≤30 days): 7.",
        primaryCta: { label: "Open Rx queue", href: "/dashboard/pharmacist/rx-queue" },
        secondaryCta: { label: "NDPS log", href: "/dashboard/pharmacist/ndps" },
        tiles: [
          { label: "Rx queued",            value: 14, tone: "watch", href: "/dashboard/pharmacist/rx-queue" },
          { label: "NDPS pending biometric", value: 2, tone: "alert", sub: "Schedule X — needs your fingerprint" },
          { label: "DDI alerts",           value: 1, tone: "alert", href: "/dashboard/pharmacist/ddi", sub: "Warfarin + clarithromycin" },
          { label: "Stock-out items",      value: 4, tone: "alert", href: "/dashboard/pharmacist/stock" },
          { label: "Expiry ≤ 30 days",     value: 7, tone: "watch" },
          { label: "B2B pharma orders",    value: 1, tone: "info", href: "/dashboard/pharmacist/b2b", sub: "Cipla — pending verify" },
        ],
        timeline: (
          <StaffPanel title="Rx queue">
            <ul className="divide-y divide-white/5">
              <StaffRow who="OPD #08234 — Mrs Mehta"   what="Amox-clav 625 mg TID × 7d + Pantoprazole 40 mg" tag={{ label: "due", tone: "due" }} />
              <StaffRow who="OPD #08235 — Mr Patel"    what="Atorvastatin 20 mg OD + Aspirin 75 mg OD" tag={{ label: "due", tone: "due" }} />
              <StaffRow who="IPD Bed 7 — Priya Mehta"  what="Heparin 5000u SC BD · Clopidogrel 75 mg OD" tag={{ label: "high alert", tone: "high" }} />
              <StaffRow who="OPD #08236 — Ms Khan"     what="Morphine 10 mg PO PRN (Schedule X)"      tag={{ label: "ndps", tone: "high" }} />
              <StaffRow who="Ward 3B Bed 12"           what="Tramadol 50 mg + Paracetamol 1g IV"    tag={{ label: "due", tone: "due" }} />
              <StaffRow who="Discharge — Mr Iyer"      what="Take-home pack: 5 medications"          tag={{ label: "info", tone: "info" }} />
            </ul>
          </StaffPanel>
        ),
        sidebar: (
          <StaffPanel title="DDI + safety alerts">
            <div className="space-y-3 p-4">
              <StaffNote priority="alert" body="Mrs Mehta (OPD #08234) — new amoxicillin order. Patient already on warfarin. Confirm INR before dispense." />
              <StaffNote priority="watch" body="Ipratropium nebs expire 2026-06-05. Move to front-of-shelf or transfer to ICU stock." />
              <StaffNote priority="info"  body="Cipla B2B PO #4421 arrived — 18 items to receive + barcode-verify." />
            </div>
          </StaffPanel>
        ),
      }}
    />
  );
}
