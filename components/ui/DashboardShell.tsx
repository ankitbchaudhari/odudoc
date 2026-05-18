"use client";

// Outer chrome for every post-sign-in dashboard. Lays the aurora
// background, sets the role-tinted glow CSS variable so GlassCards
// can pick it up, and frames the page with a consistent max-width.
// Forces a light-on-dark scheme inside so child links / text use
// white-on-glass without each component overriding colours.

import AuroraBackground from "./AuroraBackground";
import { ROLE_THEMES, type DashboardRole } from "./aurora-theme";

export default function DashboardShell({
  role,
  children,
}: {
  role: DashboardRole;
  children: React.ReactNode;
}) {
  const theme = ROLE_THEMES[role];
  return (
    <div
      className="relative min-h-screen text-white"
      style={{
        // Used by GlassCard's `glow` prop. Hex with alpha for the
        // outer drop-shadow.
        ["--glass-glow" as string]: `${theme.accentHex}40`,
      }}
    >
      <AuroraBackground role={role} />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}
