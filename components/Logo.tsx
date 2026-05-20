"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { BRAND, COLORS, LOGO_MIN_SIZE_PX } from "@/lib/brand";

// V4 §1.1 — five logo variants, used per surface:
//   primary    : teal on white/light bg (panel headers, login, PDFs)
//   reverse    : white on teal bg (email headers, splash, dark hero)
//   monochrome : dark navy on a coloured (non-white) light bg
//   icon       : icon-only at favicon / app-icon sizes
//   tagline    : primary + tagline (login screens, marketing only)
//
// V4 §1.3 — minimum size 120px on screen. We expose four named sizes
// and refuse to render below the floor by clamping `w` server-side.

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "primary" | "reverse" | "monochrome" | "icon" | "tagline";
  link?: boolean;
  className?: string;
}

// Each size sets BOTH width and height — viewBox aspect is 338:64
// (~5.28:1) for wordmark variants and 64:64 for the icon-only variant.
const sizePx: Record<NonNullable<LogoProps["size"]>, { w: number; h: number }> = {
  sm: { w: 190, h: 36 },
  md: { w: 232, h: 44 },
  lg: { w: 338, h: 64 },
  xl: { w: 507, h: 96 },
};

const iconSizePx: Record<NonNullable<LogoProps["size"]>, number> = {
  sm: 32, md: 40, lg: 56, xl: 80,
};

export default function Logo({
  size = "sm",
  variant = "primary",
  link = true,
  className = "",
}: LogoProps) {
  // Resolve the wordmark colour from the variant.
  const wordmarkColor =
    variant === "reverse" ? "#ffffff"
    : variant === "monochrome" ? COLORS.secondaryNavy
    : COLORS.primaryTeal;

  // The icon's rounded square is teal in normal variants and white
  // (with teal cross) in the reverse variant. V4 explicitly forbids
  // teal-on-dark, so reverse swaps the colours.
  const iconBg = variant === "reverse" ? COLORS.white : COLORS.primaryTeal;
  const iconCross = variant === "reverse" ? COLORS.primaryTeal : COLORS.white;

  // Icon-only at small contexts (favicons, app icons, notification
  // chrome) — no wordmark, no tagline.
  if (variant === "icon") {
    const s = iconSizePx[size];
    const svg = (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        width={s}
        height={s}
        role="img"
        aria-label={BRAND.name}
        className={className}
      >
        <rect x="0" y="0" width="64" height="64" rx="18" fill={iconBg} />
        <rect x="25" y="12" width="14" height="40" rx="5" fill={iconCross} />
        <rect x="12" y="25" width="40" height="14" rx="5" fill={iconCross} />
      </svg>
    );
    return <LogoLink link={link}>{svg}</LogoLink>;
  }

  // Wordmark variants. Floor at V4 minimum 120px.
  const { w: rawW, h } = sizePx[size];
  const w = Math.max(rawW, LOGO_MIN_SIZE_PX);

  const showTagline = variant === "tagline";
  // viewBox stretches to 80 height if we include the tagline below.
  const viewBoxH = showTagline ? 88 : 64;

  const svg = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 338 ${viewBoxH}`}
      width={w}
      height={showTagline ? Math.round(h * (viewBoxH / 64)) : h}
      role="img"
      aria-label={`${BRAND.name}${showTagline ? ` — ${BRAND.tagline}` : ""}`}
      className={`block ${className}`}
    >
      {/* Icon — rounded square + medical cross */}
      <rect x="0" y="0" width="64" height="64" rx="18" fill={iconBg} />
      <rect x="25" y="12" width="14" height="40" rx="5" fill={iconCross} />
      <rect x="12" y="25" width="40" height="14" rx="5" fill={iconCross} />

      {/* Wordmark */}
      <text
        x="76"
        y="46"
        fontFamily="'Inter','Nunito','Poppins','Arial Rounded MT Bold',Arial,sans-serif"
        fontSize="46"
        fontWeight="800"
        letterSpacing="-1"
        fill={wordmarkColor}
      >
        {BRAND.name}
      </text>

      {/* Tagline — only in tagline variant, per V4 §1.4 */}
      {showTagline && (
        <text
          x="76"
          y="78"
          fontFamily="'Inter','Nunito',Arial,sans-serif"
          fontSize="13"
          fontWeight="500"
          letterSpacing="0.4"
          fill={wordmarkColor}
          opacity="0.85"
        >
          {BRAND.tagline}
        </text>
      )}
    </svg>
  );

  return <LogoLink link={link}>{svg}</LogoLink>;
}

function LogoLink({ link, children }: { link: boolean; children: React.ReactNode }) {
  const { status } = useSession();
  if (!link) return <>{children}</>;
  const href = status === "authenticated" ? "/dashboard" : "/";
  return <Link href={href}>{children}</Link>;
}
