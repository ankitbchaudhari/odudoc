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

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: session, status } = useSession();
  const { t } = useLanguage();

  const { totalItems } = useCart();

  const links = [
    { href: "/doctors", label: t("nav.doctors") },
    { href: "/consult", label: t("nav.videoConsult") },
    { href: "/blog", label: t("nav.blog") },
    { href: "/shop", label: t("nav.shop") },
    { href: "/about", label: t("nav.about") },
    { href: "/corporate", label: "For Hospitals" },
  ];

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
    <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Logo size="sm" />

        {/* Desktop Nav */}
        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-primary-600"
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Desktop Auth Buttons / User Menu */}
        <div className="hidden items-center gap-3 md:flex">
          {/* Search Icon */}
          <button
            onClick={() => setSearchOpen(true)}
            className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-50 hover:text-primary-600"
            aria-label="Search (Ctrl+K)"
            title="Search (Ctrl+K)"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          {/* Language Switcher */}
          <LanguageSwitcher />
          {/* Cart Icon */}
          <Link
            href="/cart"
            className="relative rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-50 hover:text-primary-600"
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
          {status === "loading" ? (
            <div className="h-9 w-24 animate-pulse rounded-lg bg-gray-100" />
          ) : session ? (
            <>
            <NotificationBell />
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-50"
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
                <span className="text-sm font-medium text-gray-700">
                  {session.user.name?.split(" ")[0]}
                </span>
                <svg
                  className={`h-4 w-4 text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white py-2 shadow-lg ring-1 ring-gray-100">
                  <div className="border-b border-gray-100 px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">
                      {session.user.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {session.user.email}
                    </p>
                  </div>
                  <Link
                    href="/dashboard"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                    Dashboard
                  </Link>
                  <Link
                    href="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
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
                className="rounded-lg px-4 py-2 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50"
              >
                {t("common.login")}
              </Link>
              <Link href="/auth/register" className="btn-primary !py-2 !text-sm">
                {t("common.signUp")}
              </Link>
            </>
          )}
        </div>

        {/* Mobile Cart + Hamburger */}
        <div className="flex items-center gap-1 md:hidden">
          <Link
            href="/cart"
            className="relative flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
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
          className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 md:hidden"
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
        <div className="border-t border-gray-100 bg-white px-4 pb-4 md:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className="block rounded-lg px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary-600"
            >
              {l.label}
            </Link>
          ))}
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
                    <p className="text-sm font-medium text-gray-900">
                      {session.user.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {session.user.email}
                    </p>
                  </div>
                </div>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Dashboard
                </Link>
                <Link
                  href="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
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
