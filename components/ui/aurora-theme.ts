// Per-role visual identity tokens for the glass / aurora dashboard
// system. Keep colours here so every screen the user lands on after
// sign-in picks them up automatically — no copy-pasting Tailwind
// strings across 20 files.
//
// V5 §4.1 of the Master Spec defines role colour coding:
//   Patient       #0F6E56  (V4 primaryTeal)
//   Doctor/HOD    #042C53  (V4 secondaryNavy) + #1E40AF (clinical blue)
//   Nurse         #1E40AF
//   ICU / ER      #991B1B  (V4 errorRed — emergency context)
//   Pharma        #854D0E
//   Lab           #065F46
//   Multi-role    #5B21B6  (violet)
// The website's three-role dashboard (patient / doctor / corporate)
// maps as: patient → teal, doctor → navy, corporate → navy+gold
// (corporate is the hospital-admin surface, which V4 treats as a
// premium/HOD context — hence the gold accent).

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
    // V4 primaryTeal #0F6E56 → V4 accentGreen #1D9E75 — keeps the
    // visual energy of the original aurora while landing exactly on
    // the spec colours.
    primary: "from-[#0F6E56] to-[#1D9E75]",
    aurora: "from-[#0F6E56] via-[#1D9E75] to-[#10B981]",
    tint: "emerald",
    accentHex: "#0F6E56",
    pillBg: "bg-[#0F6E56]/15",
    pillText: "text-[#1D9E75]",
  },
  doctor: {
    label: "Doctor",
    // V5 doctor colour #042C53 (navy) + clinical blue #1E40AF.
    primary: "from-[#042C53] to-[#1E40AF]",
    aurora: "from-[#042C53] via-[#1E40AF] to-[#5B21B6]",
    tint: "blue",
    accentHex: "#1E40AF",
    pillBg: "bg-[#1E40AF]/15",
    pillText: "text-blue-300",
  },
  corporate: {
    label: "Corporate",
    // V4 secondaryNavy + V4 gold — gold is the "premium / HNI" marker
    // and the corporate surface is the hospital-admin panel.
    primary: "from-[#042C53] to-[#C9A84C]",
    aurora: "from-[#042C53] via-[#C9A84C] to-[#1E40AF]",
    tint: "amber",
    accentHex: "#C9A84C",
    pillBg: "bg-[#C9A84C]/15",
    pillText: "text-amber-300",
  },
};
