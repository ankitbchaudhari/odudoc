"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useCart } from "@/lib/cart-context";
import { useLanguage } from "@/lib/language-context";
import GlobalSearch from "@/components/GlobalSearch";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Logo from "@/components/Logo";
import NotificationBell from "@/components/NotificationBell";
import ThemeToggle from "@/components/ThemeToggle";
import NavDropdown, { type NavDropdownGroup } from "@/components/NavDropdown";

// Header navigation menus. Spec: Cowork Build Handover Section 2 /
// Header_Footer_Final Section 2. Three dropdowns + two plain links.
// Items here are the source of truth — the mobile menu reads the same
// arrays.
const PATIENTS_GROUPS: NavDropdownGroup[] = [
  {
    label: "Book and consult",
    items: [
      { label: "Find doctors", href: "/doctors" },
      { label: "Book consultation", href: "/booking" },
      { label: "Video consult", href: "/consult" },
    ],
  },
  {
    label: "Your health",
    items: [
      { label: "Medical records", href: "/dashboard/timeline" },
      { label: "Family accounts", href: "/dashboard/family" },
      { label: "Pharmacy and labs", href: "/dashboard/rx-fulfillment" },
      { label: "Vaccinations", href: "/dashboard/vaccinations" },
      { label: "Medical tourism", href: "/medical-tourism" },
      { label: "Insurance", href: "/dashboard/insurance" },
    ],
  },
];

const DOCTORS_GROUPS: NavDropdownGroup[] = [
  {
    label: "Practice",
    items: [
      { label: "Telemedicine", href: "/for-doctors/guide" },
      { label: "AI prescription assist", href: "/dashboard/doctor/ai-prescription" },
      { label: "Patient records", href: "/dashboard/doctor/emr" },
      { label: "Referrals", href: "/dashboard/doctor/referrals" },
    ],
  },
  {
    label: "Growth",
    items: [
      { label: "CME courses", href: "/education" },
      { label: "Earnings", href: "/dashboard/doctor/earnings" },
      { label: "Doctor profile", href: "/dashboard/doctor/profile" },
      { label: "OduDoc AI", href: "/features" },
    ],
  },
];

const ORGS_GROUPS: NavDropdownGroup[] = [
  {
    label: "Healthcare",
    items: [
      { label: "Hospitals", href: "/signup/corporate/hospital" },
      { label: "Clinics", href: "/signup/corporate/clinic" },
      { label: "Pathology labs", href: "/signup/corporate/pathology-lab" },
      { label: "Diagnostic centres", href: "/signup/corporate/diagnostic-centre" },
      { label: "Ambulance services", href: "/signup/corporate/ambulance" },
      { label: "Home healthcare", href: "/signup/corporate/home-healthcare" },
    ],
  },
  {
    label: "Commerce",
    items: [
      { label: "Pharmacies", href: "/signup/corporate/pharmacy" },
      { label: "Pharma companies", href: "/signup/corporate/pharma" },
      { label: "Insurance companies", href: "/signup/corporate/insurance" },
      { label: "Service-provider doctors", href: "/signup/corporate/service-provider" },
    ],
  },
  {
    label: "Education",
    items: [
      { label: "Medical institutes", href: "/signup/corporate/education" },
      { label: "Education agencies", href: "/signup/corporate/education-agency" },
      { label: "Foreign study programmes", href: "/foreign-studies", badge: "New" },
      { label: "Students and interns", href: "/signup/corporate/student" },
    ],
  },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: session, status } = useSession();
  const { t } = useLanguage();

  const { totalItems } = useCart();

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Ctrl+K shortcut for search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const userInitial =
    session?.user?.name?.charAt(0)?.toUpperCase() || "U";

  // Pick up the avatar the user uploaded on /profile (stored client-side in
  // localStorage keyed by email). We watch focus + storage events so the
  // navbar updates immediately after they save the new photo in another tab.
  const [avatar, setAvatar] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const email = session?.user?.email;
    if (!email) {
      setAvatar(null);
      return;
    }
    const key = `odudoc:avatar:${email}`;
    const read = () => setAvatar(localStorage.getItem(key));
    read();
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) read();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", read);
    window.addEventListener("odudoc:avatar-changed", read);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", read);
      window.removeEventListener("odudoc:avatar-changed", read);
    };
  }, [session?.user?.email]);

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800/70 bg-white/85 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/70 dark:border-slate-800/70 dark:bg-slate-950/85 dark:supports-[backdrop-filter]:bg-slate-950/70">
      {/* Hairline gradient under the nav for a subtle "floating" feel */}
      <div className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-primary-300/60 to-transparent" />
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo — flex-shrink-0 so it can't be squished off-screen on
            narrow viewports + min-w-0 on flex siblings would let them
            shrink instead. */}
        <div className="flex-shrink-0">
          <Logo size="sm" />
        </div>

        {/* Desktop Nav — three dropdowns + two plain links per spec.
            xl: (1280px+) shows the full bar; below that the nav lives
            in the hamburger menu. */}
        <div className="hidden flex-1 items-center justify-center xl:flex">
          <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50/70 p-1 shadow-inner shadow-slate-200/40 dark:border-slate-800/70 dark:bg-slate-800/40 dark:shadow-slate-900/40">
            <NavDropdown
              label="For patients"
              groups={PATIENTS_GROUPS}
              viewAll={{ label: "View all patient features", href: "/for-patients" }}
            />
            <NavDropdown
              label="For doctors"
              groups={DOCTORS_GROUPS}
              viewAll={{ label: "View all doctor features", href: "/for-doctors" }}
            />
            <NavDropdown
              label="For organisations"
              groups={ORGS_GROUPS}
              viewAll={{ label: "View all organisation types", href: "/signup/corporate" }}
              width="wide"
              alignRight
            />
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium text-slate-600 transition-colors hover:bg-white hover:text-primary-700 hover:shadow-sm dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Pricing
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium text-slate-600 transition-colors hover:bg-white hover:text-primary-700 hover:shadow-sm dark:text-slate-300 dark:hover:bg-slate-800"
            >
              About
            </Link>
          </div>
        </div>

        {/* Desktop Auth Buttons / User Menu — flex-shrink-0 reserves
            space so the middle pill (flex-1) can't crowd it off the
            right edge. */}
        <div className="hidden shrink-0 items-center gap-1.5 md:flex">
          {/* Search Icon */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary-600"
            aria-label="Search (Ctrl+K)"
            title="Search (Ctrl+K)"
          >
            <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          {/* Language Switcher */}
          <LanguageSwitcher />
          {/* Cart Icon */}
          <Link
            href="/cart"
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            {totalItems > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-primary-600 text-[10px] font-bold text-white min-w-[18px] h-[18px]">
                {totalItems > 99 ? "99+" : totalItems}
              </span>
            )}
          </Link>
          <ThemeToggle />
          {status === "loading" ? (
            <div className="h-9 w-24 animate-pulse rounded-lg bg-gray-100 dark:bg-slate-800" />
          ) : session ? (
            <>
            <NotificationBell />
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatar}
                    alt={session.user.name || "Profile"}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                    {userInitial}
                  </div>
                )}
                <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                  {session.user.name?.split(" ")[0]}
                </span>
                <svg
                  className={`h-4 w-4 text-gray-400 dark:text-slate-500 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-slate-900 py-2 shadow-lg ring-1 ring-gray-100">
                  <div className="border-b border-gray-100 px-4 py-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                      {session.user.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {session.user.email}
                    </p>
                  </div>
                  <Link
                    href="/dashboard"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 transition-colors hover:bg-gray-50 dark:hover:bg-slate-800"
                  >
                    <svg className="h-4 w-4 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                    Dashboard
                  </Link>
                  <Link
                    href="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 transition-colors hover:bg-gray-50 dark:hover:bg-slate-800"
                  >
                    <svg className="h-4 w-4 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    Profile
                  </Link>
                  <div className="my-1 border-t border-gray-100" />
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      signOut({ callbackUrl: "/" });
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    Sign out
                  </button>
                </div>
              )}
            </div>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="rounded-lg px-4 py-2 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50 dark:text-primary-300 dark:hover:bg-slate-800"
              >
                {t("common.login")}
              </Link>
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-700 hover:shadow-md dark:bg-primary-500 dark:hover:bg-primary-400"
              >
                {t("common.signUp")}
              </Link>
            </>
          )}
        </div>

        {/* Mobile Cart + Hamburger */}
        <div className="flex items-center gap-1 md:hidden">
          <Link
            href="/cart"
            className="relative flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            {totalItems > 0 && (
              <span className="absolute right-0.5 top-0.5 flex items-center justify-center rounded-full bg-primary-600 text-[10px] font-bold text-white min-w-[18px] h-[18px]">
                {totalItems > 99 ? "99+" : totalItems}
              </span>
            )}
          </Link>
        </div>
        <button
          className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 xl:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="border-t border-gray-100 bg-white dark:bg-slate-900 px-4 pb-4 xl:hidden">
          <MobileSection title="For patients" groups={PATIENTS_GROUPS} viewAll={{ label: "View all patient features", href: "/for-patients" }} onPick={() => setMobileOpen(false)} />
          <MobileSection title="For doctors" groups={DOCTORS_GROUPS} viewAll={{ label: "View all doctor features", href: "/for-doctors" }} onPick={() => setMobileOpen(false)} />
          <MobileSection title="For organisations" groups={ORGS_GROUPS} viewAll={{ label: "View all organisation types", href: "/signup/corporate" }} onPick={() => setMobileOpen(false)} />
          <Link
            href="/pricing"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Pricing
          </Link>
          <Link
            href="/about"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            About
          </Link>
          <div className="mt-3 border-t border-gray-100 pt-3">
            {session ? (
              <div className="space-y-1">
                <div className="flex items-center gap-3 px-3 py-2">
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatar}
                      alt={session.user.name || "Profile"}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                      {userInitial}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                      {session.user.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {session.user.email}
                    </p>
                  </div>
                </div>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  Dashboard
                </Link>
                <Link
                  href="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  Profile
                </Link>
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    signOut({ callbackUrl: "/" });
                  }}
                  className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <Link
                  href="/auth/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 rounded-lg border border-primary-600 py-2 text-center text-sm font-medium text-primary-600"
                >
                  {t("common.login")}
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setMobileOpen(false)}
                  className="btn-primary flex-1 !py-2 !text-sm text-center"
                >
                  {t("common.signUp")}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Global Search Modal */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </nav>
  );
}

// Mobile accordion section — one per dropdown. Tapping the header
// toggles the items list. Keeps parity with the desktop menu while
// staying touch-friendly on small viewports.
function MobileSection({
  title,
  groups,
  viewAll,
  onPick,
}: {
  title: string;
  groups: NavDropdownGroup[];
  viewAll: { label: string; href: string };
  onPick: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 dark:border-slate-800">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-3 text-sm font-medium text-gray-700 hover:text-primary-600 dark:text-slate-300"
      >
        <span>{title}</span>
        <svg className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 12 12" fill="none">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="pb-2">
          {groups.map((g) => (
            <div key={g.label} className="px-2">
              <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                {g.label}
              </p>
              {g.items.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={onPick}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <span>{it.label}</span>
                  {it.badge && (
                    <span className="rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                      {it.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          ))}
          <Link
            href={viewAll.href}
            onClick={onPick}
            className="mx-3 mt-2 block rounded-lg bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-700 dark:bg-slate-800 dark:text-primary-300"
          >
            {viewAll.label} →
          </Link>
        </div>
      )}
    </div>
  );
}
