"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Logo from "@/components/Logo";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { href: "/admin/pages", label: "Pages", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { href: "/admin/doctors", label: "Doctors", icon: "M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
  { href: "/admin/departments", label: "Departments", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
  { href: "/admin/appointments", label: "Appointments", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { href: "/admin/blog", label: "Blog Posts", icon: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" },
  {
    href: "#shop-group",
    label: "Products",
    icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z",
    children: [
      { href: "/admin/products", label: "Products" },
      { href: "/admin/categories", label: "Categories" },
      { href: "/admin/tags", label: "Tags" },
      { href: "/admin/coupons", label: "Coupons" },
      { href: "/admin/reviews", label: "Reviews" },
    ],
  },
  { href: "/admin/orders", label: "Orders", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
  { href: "/admin/media", label: "Media Library", icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { href: "/admin/testimonials", label: "Testimonials", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
  { href: "/admin/subscribers", label: "Subscribers", icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
  { href: "/admin/tickets", label: "Support Tickets", icon: "M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" },
  { href: "/admin/users", label: "Users & Roles", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
  { href: "/admin/careers", label: "Careers", icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
  { href: "/admin/settings", label: "Settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
  { href: "/admin/customize", label: "Customize (Theme)", icon: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" },
];

interface NavItem {
  href: string;
  label: string;
  icon: string;
  children?: { href: string; label: string }[];
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(
    pathname.startsWith("/admin/products") || pathname.startsWith("/admin/categories") || pathname.startsWith("/admin/tags") || pathname.startsWith("/admin/coupons") || pathname.startsWith("/admin/reviews")
      ? "#shop-group"
      : null
  );

  const handleNavClick = (item: NavItem) => {
    if (item.children) {
      setExpandedGroup(expandedGroup === item.href ? null : item.href);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-full flex-col bg-gray-900 text-gray-300 transition-all duration-300 ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-gray-800 px-4">
          {!collapsed ? (
            <Link href="/admin" className="flex items-center gap-2 overflow-hidden">
              <Image src="/images/logo-full.png" alt="OduDoc" width={750} height={200} className="h-8 w-auto brightness-0 invert" />
              <span className="rounded bg-gray-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-300">Admin</span>
            </Link>
          ) : (
            <Link href="/admin" className="flex items-center justify-center">
              <Image src="/images/logo-full.png" alt="OduDoc" width={750} height={200} className="h-6 w-auto brightness-0 invert" style={{ maxWidth: '40px', objectFit: 'cover', objectPosition: 'left' }} />
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white"
            aria-label="Toggle sidebar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={collapsed ? "M13 5l7 7-7 7M5 5l7 7-7 7" : "M11 19l-7-7 7-7m8 14l-7-7 7-7"}
              />
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4">
          {(navItems as NavItem[]).map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : !item.children && pathname.startsWith(item.href) && item.href !== "#shop-group";
            const isGroupActive = item.children?.some((child) => pathname.startsWith(child.href));
            const isExpanded = expandedGroup === item.href;

            if (item.children) {
              return (
                <div key={item.label}>
                  <button
                    onClick={() => handleNavClick(item)}
                    className={`mx-2 mb-1 flex w-[calc(100%-16px)] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isGroupActive
                        ? "bg-gray-800 text-white"
                        : "text-gray-400 hover:bg-gray-800 hover:text-white"
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                    </svg>
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        <svg
                          className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </>
                    )}
                  </button>
                  {!collapsed && isExpanded && (
                    <div className="mb-1 ml-6 space-y-0.5 border-l border-gray-700 pl-4">
                      {item.children.map((child) => {
                        const childActive = pathname.startsWith(child.href);
                        return (
                          <Link
                            key={child.label}
                            href={child.href}
                            className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                              childActive
                                ? "font-medium text-primary-400"
                                : "text-gray-500 hover:text-gray-300"
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
                className={`mx-2 mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary-600 text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
                title={collapsed ? item.label : undefined}
              >
                <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                </svg>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main area */}
      <div className={`flex flex-1 flex-col transition-all duration-300 ${collapsed ? "ml-16" : "ml-64"}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm">
          <h1 className="text-lg font-semibold text-gray-800">Admin Panel</h1>
          <div className="flex items-center gap-4">
            <button className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                A
              </div>
              <span className="text-sm font-medium text-gray-700">Admin</span>
            </div>
            <Link
              href="/"
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              Logout
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
