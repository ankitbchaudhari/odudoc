// Per-role visual identity tokens for the glass / aurora dashboard
// system. Keep colours here so every screen the user lands on after
// sign-in picks them up automatically — no copy-pasting Tailwind
// strings across 20 files.

export type DashboardRole = "patient" | "doctor" | "corporate";

export interface RoleTheme {
  /** Single-word display name, used in headings ("Welcome back · Patient"). */
  label: string;
  /** Two-stop gradient for primary CTAs, ring-on-focus, key numerals. */
  primary: string;
  /** Three-stop gradient used by the aurora blobs. Neon-bright on purpose. */
  aurora: string;
  /** Soft tint for glass-card borders + low-opacity overlays. */
  tint: string;
  /** Hex used for canvas, JSON-LD og-images, accent dots. */
  accentHex: string;
  /** Text colour for "live" / "online" status pills in this role. */
  pillBg: string;
  pillText: string;
}

export const ROLE_THEMES: Record<DashboardRole, RoleTheme> = {
  patient: {
    label: "Patient",
    primary: "from-emerald-400 to-teal-600",
    aurora: "from-emerald-400 via-teal-500 to-cyan-500",
    tint: "emerald",
    accentHex: "#14b8a6",
    pillBg: "bg-emerald-500/15",
    pillText: "text-emerald-300",
  },
  doctor: {
    label: "Doctor",
    primary: "from-violet-500 to-fuchsia-600",
    aurora: "from-violet-500 via-fuchsia-500 to-indigo-500",
    tint: "violet",
    accentHex: "#8b5cf6",
    pillBg: "bg-violet-500/15",
    pillText: "text-violet-300",
  },
  corporate: {
    label: "Corporate",
    primary: "from-amber-500 to-rose-600",
    aurora: "from-amber-500 via-orange-500 to-rose-500",
    tint: "amber",
    accentHex: "#f59e0b",
    pillBg: "bg-amber-500/15",
    pillText: "text-amber-300",
  },
};
