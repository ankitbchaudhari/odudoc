"use client";

// V5 §5.10 Supply Chain / Store dashboard. Theme: V5 §4.1 blue #1E40AF.

import StaffDashboardFrame, { StaffPanel, StaffRow, StaffNote } from "@/components/staff/StaffDashboardFrame";

export default function SupplyChainDashboard() {
  return (
    <StaffDashboardFrame
      config={{
        roleLabel: "Supply Chain",
        themeHex: "#1E40AF",
        accentHex: "#0F6E56",
        heroTitle: "Stores · ₹2.4 Cr inventory on hand · 11 POs in flight",
        heroSub: "Cipla delivery expected 14:00. Reorder points hit on 6 SKUs. Vendor performance Q1 = 91%.",
        primaryCta: { label: "Open PO board", href: "/dashboard/supply-chain/po" },
        secondaryCta: { label: "Inventory drilldown", href: "/dashboard/supply-chain/inventory" },
        tiles: [
          { label: "POs open",          value: 11, tone: "info",  href: "/dashboard/supply-chain/po" },
          { label: "Reorder points hit", value: 6, tone: "alert", href: "/dashboard/supply-chain/inventory?lowStock=1" },
          { label: "Expiry ≤ 60 days",  value: 23, tone: "watch", href: "/dashboard/supply-chain/expiry" },
          { label: "GRN pending today", value: 3, tone: "watch" },
          { label: "Vendor invoices to verify", value: 5, tone: "watch", href: "/admin/withdrawals" },
          { label: "Returns / claims",  value: 1, tone: "info" },
        ],
        timeline: (
          <StaffPanel title="Today's receipts + issues">
            <ul className="divide-y divide-white/5">
              <StaffRow time="09:00" who="GRN #1287 — MedTech Surgicals" what="Surgical drapes ×500, sutures ×1200" tag={{ label: "due", tone: "due" }} />
              <StaffRow time="14:00" who="GRN #1288 — Cipla Pharma" what="42 SKUs · ₹3.8 L"          tag={{ label: "info", tone: "info" }} />
              <StaffRow time="11:30" who="Issue to OT" what="2u packed RBC + 4u FFP for case #12"     tag={{ label: "high alert", tone: "high" }} />
              <StaffRow time="13:00" who="Issue to ICU" what="Vasopressors restock — noradrenaline 4 mg vials ×20" />
              <StaffRow time="15:00" who="Issue to Ward 3B" what="Routine top-up — IV fluids, syringes, gauze" />
              <StaffRow time="16:00" who="Vendor meeting"  what="Siemens — CT capex review with biomedical" tag={{ label: "info", tone: "info" }} />
            </ul>
          </StaffPanel>
        ),
        sidebar: (
          <StaffPanel title="Stock-out risk this week">
            <div className="space-y-3 p-4">
              <StaffNote priority="alert" body="Insulin glargine (Lantus 100u/ml) — 8 vials left, daily burn 3. Cipla PO #4421 ETA today." />
              <StaffNote priority="alert" body="Atracurium 50 mg — 4 vials. OT consumes 6/week. Expedite reorder." />
              <StaffNote priority="watch" body="Surgical gloves (size 7.5) — 5 boxes. MedTech PO arriving in 2 days." />
            </div>
          </StaffPanel>
        ),
      }}
    />
  );
}
