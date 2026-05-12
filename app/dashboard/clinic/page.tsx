"use client";

import Link from "next/link";
import {
  useClinicAppointments,
  useClinicPatients,
  useClinicInvoices,
  useClinicInventory,
  useClinicStaff,
} from "@/lib/clinic-store";

export default function ClinicOverviewPage() {
  const { items: appts } = useClinicAppointments();
  const { items: patients } = useClinicPatients();
  const { items: invoices } = useClinicInvoices();
  const { items: inventory } = useClinicInventory();
  const { items: staff } = useClinicStaff();

  const today = new Date().toISOString().slice(0, 10);
  const todayAppts = appts.filter((a) => a.date === today && a.status === "scheduled");
  const unpaid = invoices.filter((i) => i.status !== "paid");
  const lowStock = inventory.filter((i) => i.stock <= i.reorderLevel);
  const monthRevenue = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + i.total, 0);

  const stats = [
    { label: "Today's appointments", value: todayAppts.length, sub: `${appts.length} total`, color: "bg-primary-50 text-primary-700", href: "/dashboard/clinic/appointments" },
    { label: "Patients", value: patients.length, sub: "in EHR", color: "bg-teal-50 text-teal-700", href: "/dashboard/clinic/patients" },
    { label: "Revenue (paid)", value: `$${monthRevenue.toLocaleString()}`, sub: `${unpaid.length} unpaid`, color: "bg-emerald-50 text-emerald-700", href: "/dashboard/clinic/billing" },
    { label: "Low stock alerts", value: lowStock.length, sub: `${inventory.length} items`, color: lowStock.length ? "bg-red-50 text-red-700" : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300", href: "/dashboard/clinic/inventory" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Clinic Overview</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          Real-time snapshot of appointments, revenue, and operations.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-xl bg-white dark:bg-slate-900 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-xs text-gray-500 dark:text-slate-400">{s.label}</p>
            <p className={`mt-2 inline-block rounded-lg px-2 py-1 text-2xl font-bold ${s.color}`}>
              {s.value}
            </p>
            <p className="mt-2 text-xs text-gray-400 dark:text-slate-500 dark:text-slate-400">{s.sub}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Today's schedule */}
        <div className="rounded-xl bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-slate-100">Today&apos;s schedule</h2>
            <Link href="/dashboard/clinic/appointments" className="text-xs font-medium text-primary-600 hover:text-primary-700">
              Manage →
            </Link>
          </div>
          {todayAppts.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400 dark:text-slate-500 dark:text-slate-400">
              No appointments today
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-slate-800">
              {todayAppts.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-slate-100">{a.patientName}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{a.doctorName} · {a.reason}</p>
                  </div>
                  <span className="rounded bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
                    {a.time}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Low stock */}
        <div className="rounded-xl bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-slate-100">Stock alerts</h2>
            <Link href="/dashboard/clinic/inventory" className="text-xs font-medium text-primary-600 hover:text-primary-700">
              Inventory →
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400 dark:text-slate-500 dark:text-slate-400">
              All items stocked above reorder level
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-slate-800">
              {lowStock.slice(0, 5).map((i) => (
                <li key={i.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-slate-100">{i.name}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Supplier: {i.supplier}</p>
                  </div>
                  <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                    {i.stock} left · reorder at {i.reorderLevel}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-white dark:bg-slate-900 p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-gray-900 dark:text-slate-100">At a glance</h2>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="Staff members" value={staff.length} />
          <Stat label="Monthly payroll" value={`$${staff.reduce((s, p) => s + p.salary, 0).toLocaleString()}`} />
          <Stat label="Invoices issued" value={invoices.length} />
          <Stat label="Inventory value" value={`$${inventory.reduce((s, i) => s + i.stock * i.unitPrice, 0).toLocaleString()}`} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-gray-50 dark:bg-slate-900 p-3">
      <p className="text-xs text-gray-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-gray-900 dark:text-slate-100">{value}</p>
    </div>
  );
}
