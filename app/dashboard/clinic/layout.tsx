"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/dashboard/clinic", label: "Overview", icon: "📊" },
  { href: "/dashboard/clinic/appointments", label: "Appointments", icon: "📅" },
  { href: "/dashboard/clinic/patients", label: "Patients (EHR)", icon: "🩺" },
  { href: "/dashboard/clinic/billing", label: "Billing", icon: "💳" },
  { href: "/dashboard/clinic/inventory", label: "Inventory", icon: "📦" },
  { href: "/dashboard/clinic/staff", label: "Staff & Payroll", icon: "👥" },
  { href: "/dashboard/clinic/branches", label: "Branches", icon: "🏥" },
];

export default function ClinicLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Sidebar */}
        <aside className="hidden w-60 shrink-0 md:block">
          <div className="sticky top-20 rounded-xl bg-white dark:bg-slate-900 p-3 shadow-sm">
            <div className="mb-3 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                Clinic Admin
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-gray-900 dark:text-slate-100">
                OduDoc Clinic
              </p>
            </div>
            <nav className="space-y-1">
              {nav.map((item) => {
                const active =
                  item.href === "/dashboard/clinic"
                    ? pathname === item.href
                    : pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-primary-50 text-primary-700"
                        : "text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:bg-slate-900"
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Mobile nav as pill scroller */}
        <div className="fixed inset-x-0 top-[64px] z-30 overflow-x-auto border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 md:hidden">
          <div className="flex gap-2">
            {nav.map((item) => {
              const active =
                item.href === "/dashboard/clinic"
                  ? pathname === item.href
                  : pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
                    active
                      ? "bg-primary-600 text-white"
                      : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300"
                  }`}
                >
                  {item.icon} {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 pt-14 md:pt-0">{children}</main>
      </div>
    </div>
  );
}
