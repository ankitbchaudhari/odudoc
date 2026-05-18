"use client";

// Outer chrome for every post-sign-in dashboard. Lays the aurora
// background, sets the role-tinted glow CSS variable so GlassCards
// can pick it up, and frames the page with a consistent max-width.
// Forces a light-on-dark scheme inside so child links / text use
// white-on-glass without each component overriding colours.
//
// Also mounts the top-right user menu (avatar + sign-out) because
// the public navbar is suppressed on these routes — without this,
// signed-in users would have no way to log out from the dashboard.

import Link from "next/link";
import AuroraBackground from "./AuroraBackground";
import UserMenu from "./UserMenu";
import { ROLE_THEMES, type DashboardRole } from "./aurora-theme";

export default function DashboardShell({
  role,
  children,
  hideUserMenu = false,
}: {
  role: DashboardRole;
  children: React.ReactNode;
  /** Opt-out for surfaces that authenticate via a non-NextAuth
   *  session (clinic staff cookie, etc.) and render their own
   *  sign-out control. */
  hideUserMenu?: boolean;
}) {
  const theme = ROLE_THEMES[role];
  return (
    <div
      className="relative min-h-screen text-white"
      style={{
        ["--glass-glow" as string]: `${theme.accentHex}40`,
      }}
    >
      <AuroraBackground role={role} />

      {/* Top bar — wordmark on the left, user menu on the right.
          Sticky so logout is always one click away even when the
          user has scrolled deep into a long list. */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-slate-950/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br ${theme.primary} text-base font-bold text-slate-950 shadow-lg`}
            >
              O
            </span>
            <span className="text-sm font-bold tracking-tight text-white">
              OduDoc{" "}
              <span className="font-medium text-white/50">· {theme.label}</span>
            </span>
          </Link>
          {!hideUserMenu && <UserMenu role={role} />}
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}
