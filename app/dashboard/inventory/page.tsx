"use client";

import DepartmentShell, { StatTile } from "@/components/DepartmentShell";
import StatusBadge from "@/components/StatusBadge";

export default function InventoryDashboard() {
  return (
    <DepartmentShell
      eyebrow="Hospital · Inventory"
      glyph="📦"
      title="Inventory console"
      subtitle="Single SKU registry across pharmacy, lab, biomedical, and ward stocks. Reorder thresholds, expiry tracking, and supplier history."
      gradient="from-sky-600 via-indigo-600 to-violet-600"
      quickLinks={[
        { label: "Pharmacy", href: "/dashboard/inventory?scope=pharmacy", emoji: "💊" },
        { label: "Laboratory", href: "/dashboard/inventory?scope=laboratory", emoji: "🧪" },
        { label: "Biomedical", href: "/dashboard/inventory?scope=biomedical", emoji: "🧰" },
        { label: "Ward stocks", href: "/dashboard/inventory?scope=ward", emoji: "🛏️" },
      ]}
    >
      <div className="mb-6 grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total SKUs" value={0} emoji="📦" tone="indigo" />
        <StatTile label="Low stock" value={0} emoji="⚠️" tone="amber" hint="below reorder point" />
        <StatTile label="Expiring < 30 d" value={0} emoji="⏱️" tone="rose" />
        <StatTile label="Out of stock" value={0} emoji="✕" tone="rose" />
      </div>

      <section className="rounded-3xl border border-white/60 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Stock status</h2>
          <span className="text-xs text-slate-500">Live status colours per SKU.</span>
        </div>
        <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center">
          <span className="text-4xl">📦</span>
          <p className="mt-3 text-sm font-semibold text-slate-900">Inventory coming online</p>
          <p className="mt-1 text-xs text-slate-500">
            One SKU table powers four stock locations (pharmacy, lab, biomedical, ward).
            Reorder thresholds, expiry tracking, supplier purchase history.
          </p>
          <p className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
            <StatusBadge status="in_stock" />
            <StatusBadge status="low_stock" />
            <StatusBadge status="out_of_stock" />
            <StatusBadge status="expiring_soon" />
            <StatusBadge status="expired" />
          </p>
        </div>
      </section>
    </DepartmentShell>
  );
}
