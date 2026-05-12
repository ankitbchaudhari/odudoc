import Link from "next/link";

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

const sizes: Record<string, string> = {
  sm: "h-9",
  md: "h-11",
  lg: "h-16",
  xl: "h-24",
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
  const sizeClass = sizes[size];

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
      role="img"
      aria-label="OduDoc"
      className={`${sizeClass} w-auto ${colorClass} ${className}`}
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

  return link ? <Link href="/">{svg}</Link> : svg;
}
