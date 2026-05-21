"use client";

// V5 §5.12 Blood Bank Technician dashboard. Theme: V5 §4.1 red #991B1B
// (clinical safety / urgency context).

import StaffDashboardFrame, { StaffPanel, StaffRow, StaffNote } from "@/components/staff/StaffDashboardFrame";

export default function BloodBankDashboard() {
  return (
    <StaffDashboardFrame
      config={{
        roleLabel: "Blood Bank",
        themeHex: "#991B1B",
        accentHex: "#0F6E56",
        heroTitle: "Inventory 412 units · 18 expiring this week",
        heroSub: "Cross-match queue: 3. Today's donations: 12. Cold-chain temp 4.1°C ✓. NAT testing on schedule.",
        primaryCta: { label: "Open cross-match queue", href: "/dashboard/blood-bank/cross-match" },
        secondaryCta: { label: "Donation register", href: "/dashboard/blood-bank/donations" },
        tiles: [
          { label: "Total units in inventory", value: 412, tone: "info" },
          { label: "O- units (universal)",     value: 22, tone: "watch", sub: "Below par level (30)" },
          { label: "Cross-matches pending",    value: 3,  tone: "alert", href: "/dashboard/blood-bank/cross-match" },
          { label: "Expiring ≤ 7 days",        value: 18, tone: "alert" },
          { label: "Donations today",          value: 12, tone: "ok" },
          { label: "NAT tests pending result", value: 5,  tone: "watch" },
        ],
        timeline: (
          <StaffPanel title="Cross-match + issue queue">
            <ul className="divide-y divide-white/5">
              <StaffRow time="STAT" who="OT 2 — Case #12 (CABG)" what="2u packed RBC O+ · cross-match"  tag={{ label: "high alert", tone: "high" }} />
              <StaffRow time="STAT" who="ER Bed 3 — trauma"      what="2u packed RBC · 2u FFP · O- emergency uncrossmatched" tag={{ label: "emergency", tone: "high" }} />
              <StaffRow time="ROUT" who="Ward 5B Bed 8 — anaemia" what="1u packed RBC · cross-match" tag={{ label: "due", tone: "due" }} />
              <StaffRow who="Donor camp at IT campus (Tuesday)" what="Expected 80 donors · 60 viable units" tag={{ label: "info", tone: "info" }} />
              <StaffRow who="NAT lab" what="Yesterday batch (40) — results in 90 min" tag={{ label: "watch", tone: "watch" }} />
            </ul>
          </StaffPanel>
        ),
        sidebar: (
          <StaffPanel title="Inventory by group">
            <div className="space-y-2 p-4 text-sm">
              <Row group="O+"  units={94} par={80} />
              <Row group="A+"  units={108} par={80} />
              <Row group="B+"  units={142} par={80} />
              <Row group="AB+" units={38}  par={20} />
              <Row group="O-"  units={22}  par={30} />
              <Row group="A-"  units={6}   par={15} />
              <Row group="B-"  units={2}   par={15} />
            </div>
            <div className="border-t border-white/10 p-4">
              <StaffNote priority="alert" body="Below par: O-, A-, B-. Trigger donor outreach + city blood-bank exchange request." />
            </div>
          </StaffPanel>
        ),
      }}
    />
  );
}

function Row({ group, units, par }: { group: string; units: number; par: number }) {
  const tone = units >= par ? "text-emerald-300" : units >= par * 0.5 ? "text-amber-300" : "text-rose-300";
  return (
    <div className="flex items-center justify-between">
      <span className="font-mono font-bold text-white/80">{group}</span>
      <div className="flex items-baseline gap-2">
        <span className={`text-lg font-extrabold ${tone}`}>{units}</span>
        <span className="text-xs text-white/50">/ {par}</span>
      </div>
    </div>
  );
}
