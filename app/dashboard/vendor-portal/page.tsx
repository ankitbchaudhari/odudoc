"use client";

// V5 §5.11 Vendor dashboard. Theme: V5 §4.1 multi-role/external #5B21B6.
//
// Lives at /dashboard/vendor-portal so it doesn't collide with the
// existing /dashboard/vendor route (legacy admin vendor list).
// This is the vendor's own surface — what they see when they sign
// in as a supplier.

import StaffDashboardFrame, { StaffPanel, StaffRow, StaffNote } from "@/components/staff/StaffDashboardFrame";

export default function VendorPortalDashboard() {
  return (
    <StaffDashboardFrame
      config={{
        roleLabel: "Vendor",
        themeHex: "#5B21B6",
        accentHex: "#C9A84C",
        heroTitle: "MedTech Surgicals · 8 active hospital accounts",
        heroSub: "₹2.3 L outstanding receivables. Q1 vendor score 91/100. New product catalogue approved.",
        primaryCta: { label: "Open active POs", href: "/dashboard/vendor-portal/po" },
        secondaryCta: { label: "Manage catalogue", href: "/dashboard/profile-builder" },
        tiles: [
          { label: "Active POs",          value: 11, tone: "info",  href: "/dashboard/vendor-portal/po" },
          { label: "Goods to dispatch today", value: 3, tone: "watch" },
          { label: "Receivables (AR)",    value: "₹2.3 L", tone: "watch", href: "/dashboard/finance" },
          { label: "Hospital accounts",   value: 8, tone: "info" },
          { label: "Vendor score (Q1)",   value: "91/100", tone: "ok", sub: "On-time 98% · quality 88%" },
          { label: "Product listings",    value: 142, tone: "info",  href: "/dashboard/profile-builder" },
        ],
        timeline: (
          <StaffPanel title="Today's dispatches">
            <ul className="divide-y divide-white/5">
              <StaffRow time="09:00" who="Apollo Vadodara — PO #1287" what="Surgical drapes ×500, sutures ×1200 · invoice ₹84,500" tag={{ label: "due", tone: "due" }} />
              <StaffRow time="11:00" who="Sterling Hospital — PO #1290" what="Catheters ×200 · invoice ₹28,000" tag={{ label: "due", tone: "due" }} />
              <StaffRow time="15:30" who="HCG Cancer Centre — PO #1291" what="Disposables bundle · invoice ₹61,200" tag={{ label: "due", tone: "due" }} />
              <StaffRow who="HCG Cancer Centre — PO #1289" what="Awaiting dispatch (vendor delay)" tag={{ label: "watch", tone: "watch" }} />
            </ul>
          </StaffPanel>
        ),
        sidebar: (
          <StaffPanel title="Hospital messages">
            <div className="space-y-3 p-4">
              <StaffNote priority="alert" body="Apollo Vadodara — invoice #INV-8821 due 3 days. Total ₹84,500. Use Pay button at /dashboard/finance." />
              <StaffNote priority="watch" body="Sterling Hospital — please confirm batch numbers on PO #1290 before 12:00 today (compliance requirement)." />
              <StaffNote priority="info"  body="Quarterly vendor review meeting Friday 14:00 with three hospital procurement leads." />
            </div>
          </StaffPanel>
        ),
      }}
    />
  );
}
