"use client";

// V5 §5.8 CEO / Medical Director dashboard. Theme: V5 §4.1 #042C53 navy.
//
// Executive view: the things a hospital owner / clinical director
// asks for first thing in the morning — yesterday's revenue, today's
// census, OT utilisation, MIS exceptions, open accountability cases.

import StaffDashboardFrame, { StaffPanel, StaffRow } from "@/components/staff/StaffDashboardFrame";

export default function CeoDashboard() {
  return (
    <StaffDashboardFrame
      config={{
        roleLabel: "CEO / Medical Director",
        themeHex: "#042C53",
        accentHex: "#C9A84C",
        heroTitle: "Apollo Vadodara — Tuesday, 21 May 2026",
        heroSub: "Yesterday: ₹18.4 L revenue · OT utilisation 78% · 412 OPD · 38 IPD admissions. No code blues.",
        primaryCta: { label: "MIS dashboard", href: "/admin" },
        secondaryCta: { label: "Open accountability feed", href: "/admin/accountability" },
        tiles: [
          { label: "Yesterday revenue",  value: "₹18.4 L", tone: "premium",  href: "/admin", sub: "+12% WoW" },
          { label: "OT utilisation",     value: "78%",     tone: "ok" },
          { label: "Bed census",         value: "82%",     tone: "info",     sub: "188 of 230 occupied" },
          { label: "Open CARs",          value: 5,         tone: "watch",    href: "/admin/cars" },
          { label: "Unack critical breaches", value: 1,    tone: "alert",    href: "/admin/accountability?breachOnly=1&unacknowledgedBreachOnly=1" },
          { label: "Pending claims (AR)", value: "₹6.2 L", tone: "watch",    href: "/admin/insurance-claims" },
        ],
        timeline: (
          <StaffPanel title="Today's clinical KPIs">
            <ul className="divide-y divide-white/5">
              <StaffRow who="OPD queue length" what="Average 18 min · target 25 min" tag={{ label: "ok", tone: "ok" }} />
              <StaffRow who="IPD ALOS"          what="4.2 days · target 4.5"        tag={{ label: "ok", tone: "ok" }} />
              <StaffRow who="OT cancellations"  what="2 today (1 patient no-show, 1 anaesthetist unavailable)" tag={{ label: "watch", tone: "watch" }} />
              <StaffRow who="HAI rate (week)"   what="0.6% · target ≤ 1.0%"          tag={{ label: "ok", tone: "ok" }} />
              <StaffRow who="Medication errors (week)" what="2 — both caught at MAR scan (no harm)" tag={{ label: "info", tone: "info" }} />
              <StaffRow who="Patient satisfaction" what="NPS 62 · target 55+"        tag={{ label: "ok", tone: "ok" }} />
            </ul>
          </StaffPanel>
        ),
        sidebar: (
          <StaffPanel title="Needs your decision">
            <div className="space-y-3 p-4 text-sm">
              <div className="rounded-xl border border-amber-300/40 bg-amber-500/10 p-3">
                <p className="font-bold text-amber-200">Capex approval — CT scanner upgrade</p>
                <p className="mt-1 text-xs text-amber-100/80">Quote ₹1.2 Cr from Siemens. Biomedical recommends approve.</p>
              </div>
              <div className="rounded-xl border border-rose-300/40 bg-rose-500/10 p-3">
                <p className="font-bold text-rose-200">CAR #41 overdue</p>
                <p className="mt-1 text-xs text-rose-100/80">High-alert override without reason. Assigned to N. Devi 6 days ago.</p>
              </div>
              <div className="rounded-xl border border-blue-300/40 bg-blue-500/10 p-3">
                <p className="font-bold text-blue-200">3 doctor applications pending</p>
                <p className="mt-1 text-xs text-blue-100/80">All cleared verification + credentialing.</p>
              </div>
            </div>
          </StaffPanel>
        ),
      }}
    />
  );
}
