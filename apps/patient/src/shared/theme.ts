// Shared design tokens used by both the Patient + Doctor apps.
// Mirrors the web `components/ui/aurora-theme.ts` so the brand reads
// the same across web ↔ native.

export type Role = "patient" | "doctor";

export interface RoleTheme {
  label: string;
  /** Primary brand colour (solid surfaces, CTAs). */
  primary: string;
  /** Lighter shade for tints, hover, highlights. */
  primaryTint: string;
  /** Accent (active dot, neon text). */
  accent: string;
  /** Aurora gradient stops — used in hero blobs + big buttons. */
  gradient: [string, string, string];
}

export const ROLE_THEMES: Record<Role, RoleTheme> = {
  patient: {
    label: "Patient",
    primary: "#14b8a6",        // teal-500
    primaryTint: "#5eead4",    // teal-300
    accent: "#10b981",         // emerald-500
    gradient: ["#34d399", "#14b8a6", "#06b6d4"], // emerald → teal → cyan
  },
  doctor: {
    label: "Doctor",
    primary: "#8b5cf6",        // violet-500
    primaryTint: "#c4b5fd",    // violet-300
    accent: "#a855f7",         // purple-500
    gradient: ["#a78bfa", "#c084fc", "#6366f1"], // violet → fuchsia → indigo
  },
};

// Neutral palette (works in both light + dark variants of the apps).
export const COLORS = {
  bg: "#020617",            // slate-950 — base for the aurora-style screens
  bgRaised: "#0f172a",      // slate-900
  card: "#1e293b",          // slate-800
  border: "#334155",        // slate-700
  text: "#f1f5f9",          // slate-100
  textMuted: "#94a3b8",     // slate-400
  textDim: "#64748b",       // slate-500
  // Light surfaces (some screens use them)
  bgLight: "#ffffff",
  cardLight: "#f8fafc",
  borderLight: "#e2e8f0",
  textLight: "#0f172a",
  // Status palette — universal across both apps
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#0ea5e9",
};

export const RADII = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FONT_SIZES = {
  caption: 11,
  small: 13,
  body: 15,
  subtitle: 17,
  title: 22,
  hero: 32,
};

// API base — the live OduDoc backend serves every endpoint the apps need.
// Override per-build via EXPO_PUBLIC_API_BASE for staging / preview.
export const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE || "https://www.odudoc.com";
