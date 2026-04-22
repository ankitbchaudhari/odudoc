"use client";

import { useEffect, useState } from "react";

interface Kpi { label: string; value: number | string; tone: "slate" | "emerald" | "amber" | "rose" | "indigo"; unit?: string; }
interface Section { title: string; kpis: Kpi[]; }

async function fetchStats(url: string): Promise<Record<string, unknown> | null> {
  try { const r = await fetch(url, { cache: "no-store" }); if (!r.ok) return null; const d = await r.json(); return d.stats || null; } catch { return null; }
}

export default function KpiDashboardPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string>("");

  async function load() {
    setLoading(true);
    const [appt, queue, adm, wards, icu, mat, surg, pac, dialysis, endo, lab, rad, path, rx, disp, pharm, inv, bb, invoice, ar, ap, gl, ctms, doc, audit, notif, incidents, infection, mortality, feedback, emrg, handover, housekeeping, maint, gas, wound, camps] = await Promise.all([
      fetchStats("/api/hospital/appointments"),
      fetchStats("/api/hospital/queue"),
      fetchStats("/api/hospital/admissions"),
      fetchStats("/api/hospital/wards"),
      fetchStats("/api/hospital/icu"),
      fetchStats("/api/hospital/maternity"),
      fetchStats("/api/hospital/surgery"),
      fetchStats("/api/hospital/pac"),
      fetchStats("/api/hospital/dialysis"),
      fetchStats("/api/hospital/endoscopy"),
      fetchStats("/api/hospital/lab-orders"),
      fetchStats("/api/hospital/radiology"),
      fetchStats("/api/hospital/pathology"),
      fetchStats("/api/hospital/prescriptions"),
      fetchStats("/api/hospital/dispensing"),
      fetchStats("/api/hospital/pharmacy-inventory"),
      fetchStats("/api/hospital/inventory"),
      fetchStats("/api/hospital/bloodbank"),
      fetchStats("/api/hospital/invoices"),
      fetchStats("/api/hospital/ar-receipts"),
      fetchStats("/api/hospital/ap"),
      fetchStats("/api/hospital/gl"),
      fetchStats("/api/hospital/ctms"),
      fetchStats("/api/hospital/documents"),
      fetchStats("/api/hospital/audit-log"),
      fetchStats("/api/hospital/notifications"),
      fetchStats("/api/hospital/incidents"),
      fetchStats("/api/hospital/infection"),
      fetchStats("/api/hospital/mortality-audit"),
      fetchStats("/api/hospital/feedback"),
      fetchStats("/api/hospital/emergency-codes"),
      fetchStats("/api/hospital/handover"),
      fetchStats("/api/hospital/housekeeping"),
      fetchStats("/api/hospital/biomedical"),
      fetchStats("/api/hospital/medical-gas"),
      fetchStats("/api/hospital/wound"),
      fetchStats("/api/hospital/health-camps"),
    ]);

    const s: Section[] = [
      {
        title: "Outpatient flow",
        kpis: [
          { label: "Appts today", value: num(appt, "today"), tone: "indigo" },
          { label: "Appts total", value: num(appt, "total"), tone: "slate" },
          { label: "Queue waiting", value: num(queue, "waiting"), tone: "amber" },
          { label: "Queue served today", value: num(queue, "servedToday"), tone: "emerald" },
          { label: "Telemedicine sessions", value: num(appt, "teleToday"), tone: "indigo" },
        ],
      },
      {
        title: "Inpatient / Critical care",
        kpis: [
          { label: "Admitted", value: num(adm, "admitted"), tone: "emerald" },
          { label: "Occupied beds", value: num(wards, "occupiedBeds"), tone: "indigo" },
          { label: "Total beds", value: num(wards, "totalBeds"), tone: "slate" },
          { label: "Occupancy %", value: num(wards, "occupancyPct"), tone: "emerald", unit: "%" },
          { label: "ICU occupancy", value: num(icu, "occupied"), tone: "rose" },
          { label: "Live births (mo)", value: num(mat, "livebirthsMonth"), tone: "emerald" },
        ],
      },
      {
        title: "Surgery & procedures",
        kpis: [
          { label: "OT scheduled today", value: num(surg, "todayCount"), tone: "indigo" },
          { label: "OT completed", value: num(surg, "completedToday"), tone: "emerald" },
          { label: "PAC pending", value: num(pac, "pending"), tone: "amber" },
          { label: "Dialysis today", value: num(dialysis, "todayCount"), tone: "indigo" },
          { label: "Endoscopy today", value: num(endo, "todayCount"), tone: "indigo" },
        ],
      },
      {
        title: "Diagnostics",
        kpis: [
          { label: "Lab orders today", value: num(lab, "todayCount"), tone: "indigo" },
          { label: "Lab pending", value: num(lab, "pending"), tone: "amber" },
          { label: "Radiology today", value: num(rad, "todayCount"), tone: "indigo" },
          { label: "Path pending", value: num(path, "pending"), tone: "amber" },
        ],
      },
      {
        title: "Pharmacy & inventory",
        kpis: [
          { label: "Rx today", value: num(rx, "todayCount"), tone: "indigo" },
          { label: "Dispensed today", value: num(disp, "todayCount"), tone: "emerald" },
          { label: "Pharmacy stockouts", value: num(pharm, "stockouts"), tone: "rose" },
          { label: "Inventory items low", value: num(inv, "lowStock"), tone: "amber" },
          { label: "Blood units avail", value: num(bb, "available"), tone: "emerald" },
        ],
      },
      {
        title: "Finance",
        kpis: [
          { label: "Invoices month", value: num(invoice, "month"), tone: "slate" },
          { label: "AR collected today ₹", value: num(ar, "collectedToday"), tone: "emerald" },
          { label: "AR collected month ₹", value: num(ar, "collectedMonth"), tone: "emerald" },
          { label: "AP outstanding ₹", value: num(ap, "totalOutstanding"), tone: "rose" },
          { label: "AP overdue", value: num(ap, "overdueCount"), tone: "rose" },
          { label: "GL journals", value: num(gl, "totalJournals"), tone: "slate" },
          { label: "Unposted journals", value: num(gl, "unpostedCount"), tone: "amber" },
        ],
      },
      {
        title: "Quality & safety",
        kpis: [
          { label: "Incidents (mo)", value: num(incidents, "month"), tone: "amber" },
          { label: "HAI cases", value: num(infection, "activeCases"), tone: "rose" },
          { label: "Mortality reviews", value: num(mortality, "pendingReview"), tone: "amber" },
          { label: "Feedback NPS", value: num(feedback, "nps"), tone: "emerald" },
          { label: "Code drills (mo)", value: num(emrg, "drillsMonth"), tone: "indigo" },
        ],
      },
      {
        title: "Operations",
        kpis: [
          { label: "Handovers open", value: num(handover, "openTasks"), tone: "amber" },
          { label: "Rooms to clean", value: num(housekeeping, "pending"), tone: "amber" },
          { label: "Asset work orders", value: num(maint, "openWO"), tone: "amber" },
          { label: "Gas low alarms", value: num(gas, "lowPressure"), tone: "rose" },
          { label: "Wound care open", value: num(wound, "open"), tone: "amber" },
          { label: "Camps upcoming", value: num(camps, "upcoming"), tone: "indigo" },
        ],
      },
      {
        title: "Research & records",
        kpis: [
          { label: "Trials active", value: num(ctms, "activeTrials"), tone: "emerald" },
          { label: "Trial subjects", value: num(ctms, "activeSubjects"), tone: "indigo" },
          { label: "Documents active", value: num(doc, "active"), tone: "slate" },
          { label: "Docs expiring 30d", value: num(doc, "expiringSoon"), tone: "amber" },
          { label: "Audit today", value: num(audit, "today"), tone: "indigo" },
          { label: "Audit critical", value: num(audit, "critical"), tone: "rose" },
          { label: "Notifications today", value: num(notif, "today"), tone: "indigo" },
          { label: "Delivery %", value: num(notif, "deliveryRate"), tone: "emerald", unit: "%" },
        ],
      },
    ];
    setSections(s);
    setUpdatedAt(new Date().toLocaleTimeString());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900">KPI Dashboard</h1><p className="text-sm text-slate-500">Executive overview · live aggregation across all modules{updatedAt ? ` · updated ${updatedAt}` : ""}</p></div>
        <button onClick={load} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white">Refresh</button>
      </div>
      {loading && <div className="rounded-xl bg-white p-8 text-center text-sm text-slate-500">Loading metrics...</div>}
      {!loading && sections.map((sec) => (
        <div key={sec.title} className="mb-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">{sec.title}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
            {sec.kpis.map((k) => <KpiTile key={k.label} {...k} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function num(obj: Record<string, unknown> | null, key: string): number {
  if (!obj) return 0;
  const v = obj[key];
  if (typeof v === "number") return v;
  if (typeof v === "string") { const n = Number(v); return Number.isFinite(n) ? n : 0; }
  return 0;
}

function KpiTile({ label, value, tone, unit }: Kpi) {
  const t: Record<string, string> = { slate: "bg-slate-50 text-slate-700", amber: "bg-amber-50 text-amber-700", rose: "bg-rose-50 text-rose-700", emerald: "bg-emerald-50 text-emerald-700", indigo: "bg-indigo-50 text-indigo-700" };
  return <div className={`rounded-xl p-4 ${t[tone]}`}><div className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</div><div className="mt-1 text-2xl font-bold">{value}{unit || ""}</div></div>;
}
