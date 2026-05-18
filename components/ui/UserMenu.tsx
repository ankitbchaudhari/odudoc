"use client";

// Top-right user chip for dashboard shells. Shows avatar + name and
// drops down to Profile + Sign out. Replaces the public navbar's user
// menu now that the navbar is hidden on /dashboard surfaces.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { ROLE_THEMES, type DashboardRole } from "./aurora-theme";

export default function UserMenu({ role }: { role: DashboardRole }) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const theme = ROLE_THEMES[role];

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onClick);
      return () => document.removeEventListener("mousedown", onClick);
    }
  }, [open]);

  const name = session?.user?.name || "Account";
  const email = session?.user?.email || "";
  const initials = name
    .replace(/^Dr\.?\s+/i, "")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 py-1 pl-1 pr-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
        aria-label="Account menu"
        aria-expanded={open}
      >
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${theme.primary} text-[11px] font-bold text-slate-950`}
        >
          {initials}
        </span>
        <span className="hidden max-w-[140px] truncate sm:inline">{name.split(" ")[0]}</span>
        <svg
          className={`h-3 w-3 text-white/70 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 12 12"
          fill="none"
        >
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/90 shadow-2xl backdrop-blur-xl">
          <div className="border-b border-white/5 px-4 py-3">
            <p className="text-sm font-semibold text-white">{name}</p>
            {email && <p className="mt-0.5 truncate text-xs text-white/60">{email}</p>}
          </div>
          <ul className="py-1 text-sm">
            <li>
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2 text-white/90 transition-colors hover:bg-white/10"
              >
                <span className="text-base">⚙️</span> Profile &amp; settings
              </Link>
            </li>
            <li>
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2 text-white/90 transition-colors hover:bg-white/10"
              >
                <span className="text-base">🌐</span> Back to website
              </Link>
            </li>
            <li className="my-1 border-t border-white/5" />
            <li>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex w-full items-center gap-3 px-4 py-2 text-rose-300 transition-colors hover:bg-rose-500/15"
              >
                <span className="text-base">🚪</span> Sign out
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
