"use client";

// V5 §5 Manager catch-all dashboard. Theme: V5 §4.1 navy #042C53 with
// a gold accent (the "premium" V4 colour) — manager sits between CEO
// and floor staff, so the colour treatment is a blend.
//
// Aimed at department managers / shift leads who don't need the
// CEO's MIS rollups but DO need the team's open CARs, attendance,
// and KPI dashboards.

import StaffDashboardFrame, { StaffPanel, StaffRow, StaffNote } from "@/components/staff/StaffDashboardFrame";

export default function ManagerDashboard() {
  return (
    <StaffDashboardFrame
      config={{
        roleLabel: "Manager",
        themeHex: "#042C53",
        accentHex: "#C9A84C",
        heroTitle: "Department · 22 staff on shift · 2 absences",
        heroSub: "1 critical breach unack · 2 CARs overdue · 7 near-miss reports this week. Pattern review Friday 14:00.",
        primaryCta: { label: "Open accountability feed", href: "/admin/accountability" },
        secondaryCta: { label: "Staff scorecards", href: "/admin/scorecards" },
        tiles: [
          { label: "Staff on shift",         value: 22, tone: "info" },
          { label: "Unplanned absences",     value: 2,  tone: "watch" },
          { label: "Open CARs (your dept)",  value: 3,  tone: "alert", href: "/admin/cars" },
          { label: "Unack critical breaches", value: 1, tone: "alert", href: "/admin/accountability?breachOnly=1&unacknowledgedBreachOnly=1" },
          { label: "Near-misses this week",  value: 7,  tone: "info", href: "/admin/near-miss" },
          { label: "Avg scorecard",          value: 82, tone: "ok",   href: "/admin/scorecards" },
        ],
        timeline: (
          <StaffPanel title="Needs your attention this morning">
            <ul className="divide-y divide-white/5">
              <StaffRow who="CAR #41 — N. Devi"      what="High-alert MAR override without reason. Overdue by 6 days." tag={{ label: "overdue", tone: "high" }} />
              <StaffRow who="Critical lab unack — Bed 7" what="Troponin 4.8 — never acknowledged by night doc"          tag={{ label: "critical", tone: "high" }} />
              <StaffRow who="Roster gap — Sat night"    what="Two nurses needed, one applied"                          tag={{ label: "due", tone: "due" }} />
              <StaffRow who="Pattern review prep"       what="Compile last 4 weeks of medication near-miss reports"    tag={{ label: "info", tone: "info" }} />
              <StaffRow who="1:1 with R. Sharma"        what="Performance review — score dropped from 84 to 72"        tag={{ label: "watch", tone: "watch" }} />
              <StaffRow who="Equipment quote sign-off"  what="Vitals monitor x4 — biomedical recommends approve"       tag={{ label: "info", tone: "info" }} />
            </ul>
          </StaffPanel>
        ),
        sidebar: (
          <StaffPanel title="Pattern signals (last 30 days)">
            <div className="space-y-3 p-4">
              <StaffNote priority="watch" body="Medication near-misses cluster on Tuesday + Thursday night shifts. Possible roster + workload signal." />
              <StaffNote priority="info"  body="Fall reports up 30% — all in Ward 5B. Check bed-rail compliance." />
              <StaffNote priority="ok"    body="Hand-hygiene compliance +12% this month. Reinforce in tomorrow's huddle." />
            </div>
          </StaffPanel>
        ),
      }}
    />
  );
}
