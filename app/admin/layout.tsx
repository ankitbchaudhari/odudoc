"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface NavChild {
  href: string;
  label: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: string;
  children?: NavChild[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

// Grouped into logical sections so the sidebar scans at a glance instead of
// being a 17-item wall of links.
const navSections: NavSection[] = [
  {
    title: "Overview",
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
      },
    ],
  },
  {
    title: "Healthcare",
    items: [
      {
        href: "/admin/doctors",
        label: "Doctors",
        icon: "M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z",
      },
      {
        href: "/admin/departments",
        label: "Departments",
        icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
      },
      {
        href: "/admin/appointments",
        label: "Appointments",
        icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
      },
      {
        href: "/admin/prescriptions",
        label: "Prescriptions",
        icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      },
      {
        href: "/admin/lab-tests",
        label: "Lab Tests",
        icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",
      },
      {
        href: "/admin/timetable",
        label: "Timetable",
        icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
      },
    ],
  },
  {
    title: "Content",
    items: [
      {
        href: "/admin/pages",
        label: "Pages",
        icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      },
      {
        href: "/admin/blog",
        label: "Blog Posts",
        icon: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z",
      },
      {
        href: "/admin/media",
        label: "Media Library",
        icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
      },
      {
        href: "/admin/testimonials",
        label: "Testimonials",
        icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
      },
      {
        href: "/admin/gallery",
        label: "Gallery",
        icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
      },
    ],
  },
  {
    title: "Commerce",
    items: [
      {
        href: "#shop-group",
        label: "Products",
        icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z",
        children: [
          { href: "/admin/products", label: "All products" },
          { href: "/admin/vendors", label: "Vendors" },
          { href: "/admin/payouts", label: "Payouts" },
          { href: "/admin/categories", label: "Categories" },
          { href: "/admin/tags", label: "Tags" },
          { href: "/admin/coupons", label: "Coupons" },
          { href: "/admin/reviews", label: "Reviews" },
        ],
      },
      {
        href: "/admin/orders",
        label: "Orders",
        icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
      },
      {
        href: "/admin/withdrawals",
        label: "Withdrawals",
        icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
      },
    ],
  },
  {
    title: "Doctors",
    items: [
      {
        href: "/admin/applications",
        label: "Doctor Applications",
        icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      },
      {
        href: "/admin/doctor-earnings",
        label: "Doctor Earnings",
        icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1",
      },
    ],
  },
  {
    title: "Enterprise",
    items: [
      {
        href: "/admin/organizations",
        label: "Organizations",
        icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
      },
      {
        href: "/admin/enterprise-leads",
        label: "Demo Requests",
        icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
      },
    ],
  },
  {
    title: "Marketing",
    items: [
      {
        href: "/admin/offers",
        label: "Special Offers",
        icon: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z",
      },
      {
        href: "/admin/coupons",
        label: "Coupon Codes",
        icon: "M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z",
      },
    ],
  },
  {
    title: "Engagement",
    items: [
      {
        href: "/admin/subscribers",
        label: "Subscribers",
        icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
      },
      {
        href: "/admin/email",
        label: "Email Broadcast",
        icon: "M21 12a2 2 0 00-2-2H5a2 2 0 00-2 2m18 0v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7m18 0l-9 6-9-6",
      },
      {
        href: "/admin/tickets",
        label: "Support Tickets",
        icon: "M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z",
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        href: "/admin/users",
        label: "Users & Roles",
        icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
      },
      {
        href: "/admin/careers",
        label: "Careers",
        icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
      },
      {
        href: "/admin/customize",
        label: "Theme",
        icon: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01",
      },
      {
        href: "/admin/settings",
        label: "Settings",
        icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
      },
    ],
  },
];

const SHOP_PREFIXES = ["/admin/products", "/admin/vendors", "/admin/payouts", "/admin/categories", "/admin/tags", "/admin/coupons", "/admin/reviews"];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(
    SHOP_PREFIXES.some((p) => pathname.startsWith(p)) ? "#shop-group" : null
  );

  const toggleGroup = (href: string) => {
    setExpandedGroup(expandedGroup === href ? null : href);
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-full flex-col border-r border-slate-800/60 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-300 shadow-2xl transition-all duration-300 ${
          collapsed ? "w-[72px]" : "w-64"
        }`}
      >
        {/* Brand */}
        <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-800/60 px-4">
          {!collapsed ? (
            <Link href="/admin" className="flex items-center gap-2.5 overflow-hidden">
              <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-400 to-primary-700 text-sm font-bold text-white shadow-lg shadow-primary-900/40 ring-1 ring-white/10">
                O
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-[15px] font-bold tracking-tight text-white">OduDoc</span>
                <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-primary-400">
                  Admin Console
                </span>
              </span>
            </Link>
          ) : (
            <Link href="/admin" className="flex w-full items-center justify-center">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-400 to-primary-700 text-sm font-bold text-white shadow-lg shadow-primary-900/40 ring-1 ring-white/10">
                O
              </span>
            </Link>
          )}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-white"
              aria-label="Collapse sidebar"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* Collapse button (floating when collapsed) */}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="mx-3 mt-3 flex items-center justify-center rounded-lg border border-slate-800 bg-slate-800/50 p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            aria-label="Expand sidebar"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Nav — custom scrollbar, grouped sections */}
        <nav className="admin-scroll flex-1 overflow-y-auto py-3">
          {navSections.map((section) => (
            <div key={section.title} className="mb-3">
              {!collapsed && (
                <div className="mb-1 px-5 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {section.title}
                </div>
              )}
              {collapsed && <div className="mx-4 my-3 h-px bg-slate-800/70" />}

              {section.items.map((item) => {
                const isActive =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : !item.children && item.href !== "#shop-group" && pathname.startsWith(item.href);
                const isGroupActive = item.children?.some((child) => pathname.startsWith(child.href));
                const isExpanded = expandedGroup === item.href;

                if (item.children) {
                  return (
                    <div key={item.label}>
                      <button
                        onClick={() => toggleGroup(item.href)}
                        className={`group relative mx-2 mb-0.5 flex w-[calc(100%-16px)] items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all ${
                          isGroupActive
                            ? "bg-slate-800/70 text-white"
                            : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                        }`}
                        title={collapsed ? item.label : undefined}
                      >
                        {isGroupActive && (
                          <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary-400" />
                        )}
                        <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d={item.icon} />
                        </svg>
                        {!collapsed && (
                          <>
                            <span className="flex-1 text-left">{item.label}</span>
                            <svg
                              className={`h-3.5 w-3.5 text-slate-500 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5l7 7-7 7" />
                            </svg>
                          </>
                        )}
                      </button>
                      {!collapsed && isExpanded && (
                        <div className="mb-1 ml-[26px] space-y-0.5 border-l border-slate-800 pl-3">
                          {item.children.map((child) => {
                            const childActive = pathname.startsWith(child.href);
                            return (
                              <Link
                                key={child.label}
                                href={child.href}
                                className={`block rounded-md px-3 py-1.5 text-[12.5px] transition-colors ${
                                  childActive
                                    ? "font-semibold text-primary-300"
                                    : "text-slate-500 hover:text-slate-200"
                                }`}
                              >
                                {child.label}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`group relative mx-2 mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-primary-600/90 to-primary-500/80 text-white shadow-lg shadow-primary-900/30"
                        : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-white/90" />
                    )}
                    <svg
                      className={`h-5 w-5 flex-shrink-0 ${isActive ? "text-white" : "text-slate-500 group-hover:text-slate-200"}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d={item.icon} />
                    </svg>
                    {!collapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <span className="rounded-full bg-primary-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-primary-300">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User footer card */}
        <div className="flex-shrink-0 border-t border-slate-800/60 p-3">
          {!collapsed ? (
            <div className="flex items-center gap-2.5 rounded-lg bg-slate-800/40 px-2.5 py-2 ring-1 ring-slate-800/50">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-700 text-[13px] font-bold text-white ring-2 ring-slate-900">
                A
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-white">Admin</p>
                <p className="truncate text-[11px] text-slate-500">admin@odudoc.com</p>
              </div>
              <Link
                href="/"
                className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-700/50 hover:text-red-400"
                title="Logout"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </Link>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-700 text-[13px] font-bold text-white ring-2 ring-slate-900">
                A
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main area */}
      <div className={`flex flex-1 flex-col transition-all duration-300 ${collapsed ? "ml-[72px]" : "ml-64"}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur-md">
          <div>
            <h1 className="text-[15px] font-semibold text-slate-900">Admin Panel</h1>
            <p className="text-[11px] text-slate-500">Manage your healthcare platform</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative hidden md:block">
              <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search…"
                className="w-60 rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder-slate-400 outline-none transition focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <button className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700" title="View site">
              <Link href="/">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </button>
            <NotificationBell />
            <div className="mx-1 h-6 w-px bg-slate-200" />
            <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-700 text-sm font-bold text-white shadow-sm">
                A
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-[12.5px] font-semibold leading-tight text-slate-800">Admin</p>
                <p className="text-[10.5px] leading-tight text-slate-500">Super admin</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6">{children}</main>
      </div>

      {/* Scoped sidebar scrollbar */}
      <style jsx global>{`
        .admin-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .admin-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .admin-scroll::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.15);
          border-radius: 3px;
        }
        .admin-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.3);
        }
      `}</style>
    </div>
  );
}

interface AdminNotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  createdAt: string;
  read: boolean;
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AdminNotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/admin/notifications", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        notifications: AdminNotificationItem[];
        unread: number;
      };
      setItems(data.notifications || []);
      setUnread(data.unread || 0);
    } catch {
      // Ignore polling errors — bell will just stay stale.
    }
  }

  useEffect(() => {
    load();
    const id = window.setInterval(load, 30_000);
    return () => window.clearInterval(id);
  }, []);

  // Close on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function markAllRead() {
    try {
      await fetch("/api/admin/notifications/read", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      await load();
    } catch {
      // no-op
    }
  }

  function fmt(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const now = Date.now();
    const diff = Math.max(0, now - d.getTime());
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!open) load();
        }}
        className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
        title="Notifications"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="text-sm font-semibold text-slate-900">
              Notifications
            </div>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">
                You&apos;re all caught up.
              </div>
            ) : (
              items.map((n) => (
                <Link
                  key={n.id}
                  href={n.link || "/admin"}
                  onClick={() => setOpen(false)}
                  className={`block border-b border-slate-50 px-4 py-3 transition-colors hover:bg-slate-50 ${
                    n.read ? "" : "bg-primary-50/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-[13px] font-semibold text-slate-900">
                      {n.title}
                    </div>
                    {!n.read && (
                      <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary-500" />
                    )}
                  </div>
                  <div className="mt-0.5 text-[12px] text-slate-600">
                    {n.body}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    {fmt(n.createdAt)}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
