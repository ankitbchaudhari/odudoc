"use client";

// V5 §5.9 Housekeeping dashboard. Theme: V5 §4.1 neutral grey #444444.
//
// Light-weight surface — V5 explicitly says housekeeping should
// only see task cards. We keep tile data minimal and the timeline
// becomes the room-cleaning queue.

import StaffDashboardFrame, { StaffPanel, StaffRow } from "@/components/staff/StaffDashboardFrame";

export default function HousekeepingDashboard() {
  return (
    <StaffDashboardFrame
      config={{
        roleLabel: "Housekeeping",
        themeHex: "#444444",
        accentHex: "#0F6E56",
        heroTitle: "12 rooms to clean · 3 biowaste pickups due",
        heroSub: "OPD opens 08:00. Discharge cleans priority. Spillage call from Ward 2 — pending.",
        primaryCta: { label: "Open task queue", href: "/dashboard/housekeeping/tasks" },
        secondaryCta: { label: "Biowaste log", href: "/dashboard/housekeeping/biowaste" },
        tiles: [
          { label: "Discharge cleans queued", value: 5, tone: "alert", href: "/dashboard/housekeeping/tasks?type=discharge" },
          { label: "Routine cleans queued",   value: 7, tone: "watch", href: "/dashboard/housekeeping/tasks?type=routine" },
          { label: "Biowaste bins full",      value: 3, tone: "alert" },
          { label: "Linen requests open",     value: 2, tone: "info" },
          { label: "Spillage / urgent calls", value: 1, tone: "alert" },
          { label: "Done this shift",         value: 14, tone: "ok" },
        ],
        timeline: (
          <StaffPanel title="Next tasks">
            <ul className="divide-y divide-white/5">
              <StaffRow who="Ward 3B Bed 5"  what="Discharge clean · linen replace · waste sort" tag={{ label: "discharge", tone: "high" }} />
              <StaffRow who="Ward 3B Bed 9"  what="Discharge clean"        tag={{ label: "discharge", tone: "high" }} />
              <StaffRow who="OPD cabin 7"    what="Routine clean before 08:00 open" tag={{ label: "due", tone: "due" }} />
              <StaffRow who="ICU 2 corridor" what="Floor mop + sanitise"   tag={{ label: "due", tone: "due" }} />
              <StaffRow who="Ward 2 spillage" what="Urgent — IV bag leak corridor outside Bed 12" tag={{ label: "urgent", tone: "high" }} />
              <StaffRow who="Biowaste pickup" what="Bins: Ward 3B, OT 2, ICU 1" tag={{ label: "info", tone: "info" }} />
            </ul>
          </StaffPanel>
        ),
        sidebar: (
          <StaffPanel title="Supervisor messages">
            <div className="space-y-3 p-4 text-sm text-white/80">
              <p>Biomedical waste collection van arrives 11:00 — Ward 3B + ICU bins must be sealed and at the loading bay by 10:45.</p>
              <p>New rotational schedule for next week posted at the front desk. Please sign by Thursday.</p>
              <p>Hand-hygiene audit Friday morning. Refresher training video link in your messages.</p>
            </div>
          </StaffPanel>
        ),
      }}
    />
  );
}
