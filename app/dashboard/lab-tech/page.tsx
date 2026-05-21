"use client";

// V5 §5.6 Lab Technician dashboard. Theme: V5 §4.1 lab green #065F46.

import StaffDashboardFrame, { StaffPanel, StaffRow } from "@/components/staff/StaffDashboardFrame";

export default function LabTechDashboard() {
  return (
    <StaffDashboardFrame
      config={{
        roleLabel: "Lab Technician",
        themeHex: "#065F46",
        accentHex: "#1D9E75",
        heroTitle: "Lab — 42 pending · 3 STAT · 1 critical",
        heroSub: "Auto-analyser #1 running CBC batch. Centrifuge #2 due QC. Reagent stock OK.",
        primaryCta: { label: "Scan sample barcode", href: "/dashboard/lab-tech/scan" },
        secondaryCta: { label: "Pending results", href: "/dashboard/lab-tech/results" },
        tiles: [
          { label: "Samples received today", value: 187, tone: "info" },
          { label: "STAT orders pending", value: 3, tone: "alert", href: "/dashboard/lab-tech/results?stat=1" },
          { label: "Critical values to flag", value: 1, tone: "alert", sub: "Troponin 4.8 — Bed 7" },
          { label: "QC due this shift", value: 2, tone: "watch", href: "/dashboard/lab-tech/qc" },
          { label: "Reruns awaiting verify", value: 5, tone: "watch" },
          { label: "Reagent stock low", value: 1, tone: "watch", sub: "K reagent — 2 days left" },
        ],
        timeline: (
          <StaffPanel title="STAT + critical-value queue">
            <ul className="divide-y divide-white/5">
              <StaffRow time="STAT" who="ICU-2 Bed 7 — Priya Mehta" what="Troponin · ACT · ABG · panel" tag={{ label: "critical", tone: "high" }} />
              <StaffRow time="STAT" who="ER Bed 3 — chest pain" what="Troponin · CBC · BMP" tag={{ label: "stat", tone: "high" }} />
              <StaffRow time="STAT" who="OT 2 — pre-op #12" what="Type & cross 2u packed RBC" tag={{ label: "stat", tone: "high" }} />
              <StaffRow time="ROUT" who="Ward 3B Bed 12" what="Post-op day 1 — Hb, CRP" tag={{ label: "due", tone: "due" }} />
              <StaffRow time="ROUT" who="OPD batch 08:00" what="42 tubes — CBC, lipid, HbA1c, TSH" />
            </ul>
          </StaffPanel>
        ),
        sidebar: (
          <StaffPanel title="Instruments">
            <div className="space-y-2 p-3 text-sm">
              <p className="font-semibold text-emerald-300">● Sysmex XN-1000 — running (78 done)</p>
              <p className="font-semibold text-emerald-300">● Beckman AU680 — running (114 done)</p>
              <p className="font-semibold text-amber-300">● Centrifuge #2 — QC due</p>
              <p className="font-semibold text-emerald-300">● ABG GEM 4000 — idle</p>
              <p className="font-semibold text-emerald-300">● Microscope station — open</p>
            </div>
          </StaffPanel>
        ),
      }}
    />
  );
}
