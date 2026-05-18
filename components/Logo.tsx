"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

interface LogoProps {
  /** "sm" = navbar, "md" = footer/cards, "lg" = login/hero, "xl" = splash */
  size?: "sm" | "md" | "lg" | "xl";
  link?: boolean;
  className?: string;
  /** Force a specific wordmark color regardless of theme. Useful inside
   *  fixed dark surfaces (e.g. always-dark hero) where the auto-swap is
   *  wrong. */
  variant?: "auto" | "light" | "dark";
}

// Each size sets BOTH width and height in pixels so the SVG can't render
// at 0×0. The viewBox aspect ratio is 338:64 (~5.28:1), so width is
// height × 5.28 rounded.
const sizePx: Record<NonNullable<LogoProps["size"]>, { w: number; h: number }> = {
  sm: { w: 190, h: 36 },
  md: { w: 232, h: 44 },
  lg: { w: 338, h: 64 },
  xl: { w: 507, h: 96 },
};

// Inlining the SVG (not <img src>) so the wordmark's `fill="currentColor"`
// inherits from the parent's text color — which lets Tailwind's `dark:`
// variants drive the swap with a single asset instead of two.
//
// Light mode parent: text-[#0F3570] → dark navy wordmark.
// Dark  mode parent: text-white     → white wordmark.
// The gradient icon (rounded square + cross) stays the same in both.
export default function Logo({
  size = "sm",
  link = true,
  className = "",
  variant = "auto",
}: LogoProps) {
  const { w, h } = sizePx[size];

  // Pick a color class. "auto" honours the theme via Tailwind dark:.
  // "light" / "dark" force one regardless of theme.
  const colorClass =
    variant === "light"
      ? "text-[#0F3570]"
      : variant === "dark"
        ? "text-white"
        : "text-[#0F3570] dark:text-white";

  const svg = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 338 64"
      width={w}
      height={h}
      role="img"
      aria-label="OduDoc"
      className={`block ${colorClass} ${className}`}
    >
      <defs>
        <linearGradient id="odudoc-logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22C98A" />
          <stop offset="100%" stopColor="#0EA5A0" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="64" height="64" rx="18" fill="url(#odudoc-logo-gradient)" />
      <rect x="25" y="12" width="14" height="40" rx="5" fill="white" />
      <rect x="12" y="25" width="40" height="14" rx="5" fill="white" />
      <text
        x="70"
        y="46"
        fontFamily="'Nunito','Poppins','Comfortaa','Arial Rounded MT Bold',Arial,sans-serif"
        fontSize="52"
        fontWeight="800"
        letterSpacing="-1"
        fill="currentColor"
      >
        OduDoc
      </text>
    </svg>
  );

  // Logo destination is conditional on auth: signed-out visitors land
  // on the marketing home page, signed-in users land on their dashboard.
  // Calling useSession() here costs nothing (it reads the SessionProvider
  // context) and keeps the wordmark behavioural without each caller
  // having to thread the auth state in.
  return <LogoLink link={link}>{svg}</LogoLink>;
}

function LogoLink({ link, children }: { link: boolean; children: React.ReactNode }) {
  const { status } = useSession();
  if (!link) return <>{children}</>;
  const href = status === "authenticated" ? "/dashboard" : "/";
  return <Link href={href}>{children}</Link>;
}
