"use client";

// Animated aurora background — three blurred colour blobs drifting
// behind the dashboard content. Pure CSS animation (no JS loop), so
// it costs nothing on the main thread once the gradients are
// composited. Respects prefers-reduced-motion: the blobs stay still
// for users who've asked the OS to reduce animation.

import { ROLE_THEMES, type DashboardRole } from "./aurora-theme";

export default function AuroraBackground({
  role,
  className = "",
}: {
  role: DashboardRole;
  className?: string;
}) {
  const theme = ROLE_THEMES[role];
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden ${className}`}
    >
      {/* Base canvas — deep slate that lets the neon blobs glow. */}
      <div className="absolute inset-0 bg-slate-950" />

      {/* Three drifting blobs. Each uses a different keyframe + delay
          so they never line up the same way twice. */}
      <div
        className={`absolute -top-32 -left-32 h-[40rem] w-[40rem] rounded-full bg-gradient-to-br ${theme.aurora} opacity-30 blur-[120px] aurora-drift-a`}
      />
      <div
        className={`absolute top-1/3 -right-40 h-[36rem] w-[36rem] rounded-full bg-gradient-to-br ${theme.aurora} opacity-25 blur-[120px] aurora-drift-b`}
      />
      <div
        className={`absolute -bottom-40 left-1/4 h-[44rem] w-[44rem] rounded-full bg-gradient-to-br ${theme.aurora} opacity-20 blur-[140px] aurora-drift-c`}
      />

      {/* Subtle noise overlay — kills banding on the gradient. */}
      <div className="absolute inset-0 opacity-[0.035] mix-blend-overlay [background-image:url('data:image/svg+xml;utf8,<svg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/></svg>')]" />

      <style jsx>{`
        @keyframes drift-a {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(80px, 40px, 0) scale(1.1); }
        }
        @keyframes drift-b {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1.05); }
          50% { transform: translate3d(-60px, 60px, 0) scale(0.95); }
        }
        @keyframes drift-c {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(40px, -50px, 0) scale(1.08); }
        }
        .aurora-drift-a { animation: drift-a 22s ease-in-out infinite; }
        .aurora-drift-b { animation: drift-b 28s ease-in-out infinite; }
        .aurora-drift-c { animation: drift-c 32s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .aurora-drift-a, .aurora-drift-b, .aurora-drift-c { animation: none; }
        }
      `}</style>
    </div>
  );
}
