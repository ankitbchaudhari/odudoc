"use client";

// V5 §5.5 ICU Nurse dashboard. Theme: V5 §4.1 emergency red #991B1B.
//
// ICU nurses live on alarm-acknowledgement, ventilator settings,
// continuous-vitals streams, drip rates, and code-team paging. The
// tiles match those daily-use surfaces.

import StaffDashboardFrame, { StaffPanel, StaffRow, StaffNote } from "@/components/staff/StaffDashboardFrame";

export default function IcuNurseDashboard() {
  return (
    <StaffDashboardFrame
      config={{
        roleLabel: "ICU Nurse",
        themeHex: "#991B1B",
        accentHex: "#C9A84C",
        heroTitle: "ICU 2 · 8 beds occupied · 1 ventilated",
        heroSub: "Acuity score 38 (high). Next family-update round 10:00. APACHE-II average 22.",
        primaryCta: { label: "Open observation flow sheet", href: "/dashboard/icu-nurse/flow-sheet" },
        secondaryCta: { label: "Acknowledge alarms", href: "/dashboard/icu-nurse/alarms" },
        tiles: [
          { label: "Active alarms", value: 2, tone: "alert", href: "/dashboard/icu-nurse/alarms", sub: "Bed 5 SpO₂ low · Bed 3 BP low" },
          { label: "Drips running",  value: 6, tone: "info",  href: "/dashboard/icu-nurse/drips", sub: "2 vasopressors · 3 sedation · 1 insulin" },
          { label: "Vent settings due review", value: 1, tone: "watch", href: "/dashboard/icu-nurse/vent" },
          { label: "ABG due in 30 min", value: 3, tone: "watch", href: "/dashboard/icu-nurse/abg" },
          { label: "Critical labs unack", value: 1, tone: "alert", href: "/admin/accountability?breachOnly=1", sub: "Troponin 4.8 · Bed 7" },
          { label: "Family updates due",   value: 2, tone: "info" },
        ],
        timeline: (
          <StaffPanel title="Next 60 minutes — ICU 2">
            <ul className="divide-y divide-white/5">
              <StaffRow time="07:50" who="Bed 7 — Priya Mehta (STEMI)" what="Heparin titration · ACT due"  tag={{ label: "high alert", tone: "high" }} />
              <StaffRow time="08:00" who="Bed 3 — Mr Singh" what="Vasopressor downtitration trial" tag={{ label: "due", tone: "due" }} />
              <StaffRow time="08:00" who="Bed 5 — Mrs Iyer" what="ABG draw + lactate" tag={{ label: "due", tone: "due" }} />
              <StaffRow time="08:15" who="Bed 1 — Mr Khan" what="Position change · pressure-injury check" tag={{ label: "ok", tone: "ok" }} />
              <StaffRow time="08:30" who="Bed 2 — Mrs Rao (post-CABG)" what="Chest physio · suction" />
              <StaffRow time="09:00" who="Family-update round" what="Beds 1, 2, 5 — relatives waiting" tag={{ label: "info", tone: "info" }} />
            </ul>
          </StaffPanel>
        ),
        sidebar: (
          <>
            <StaffPanel title="Hand-over from night shift">
              <div className="space-y-3 p-4">
                <StaffNote priority="alert" body="Bed 7 — Priya. Troponin 4.8 µg/L. Cardiology phoned 06:30. Repeat ECG at 08:30 + 09:30." />
                <StaffNote priority="watch" body="Bed 3 — Mr Singh weaned to noradrenaline 0.08 µg/kg/min. Continue tapering if MAP stays > 70." />
                <StaffNote priority="info"  body="Bed 1 — Mr Khan stable post-extubation. For step-down to ward if SpO₂ holds." />
              </div>
            </StaffPanel>
          </>
        ),
      }}
    />
  );
}
