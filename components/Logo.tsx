import Link from "next/link";

interface LogoProps {
  /** "sm" = navbar, "md" = footer/cards, "lg" = login/hero, "xl" = splash */
  size?: "sm" | "md" | "lg" | "xl";
  link?: boolean;
  className?: string;
  /** Force a specific variant regardless of theme. Useful inside fixed
   *  dark surfaces (e.g. always-dark hero) where the auto-swap is wrong. */
  variant?: "auto" | "light" | "dark";
}

const sizes: Record<string, string> = {
  sm: "h-9",
  md: "h-11",
  lg: "h-16",
  xl: "h-24",
};

export default function Logo({
  size = "sm",
  link = true,
  className = "",
  variant = "auto",
}: LogoProps) {
  // Plain <img> rather than next/image: the logo is a vector SVG and
  // Next's image optimizer rasterizes it to a low-DPI PNG on mobile,
  // which looks soft on Retina iPhones. <img> + SVG = crisp at any DPR.
  //
  // For the "auto" variant we render BOTH images and use Tailwind's
  // `dark:` class to flip visibility. This avoids a JS round-trip and
  // means SSR ships the correct logo for both themes — the wrong one
  // is just hidden via CSS.
  const sizeClass = sizes[size];

  if (variant === "light") {
    // eslint-disable-next-line @next/next/no-img-element
    const img = (
      <img
        src="/images/logo-light.svg"
        alt="OduDoc"
        width={338}
        height={64}
        className={`${sizeClass} w-auto object-contain ${className}`}
      />
    );
    return link ? <Link href="/">{img}</Link> : img;
  }
  if (variant === "dark") {
    // eslint-disable-next-line @next/next/no-img-element
    const img = (
      <img
        src="/images/logo-dark.svg"
        alt="OduDoc"
        width={338}
        height={64}
        className={`${sizeClass} w-auto object-contain ${className}`}
      />
    );
    return link ? <Link href="/">{img}</Link> : img;
  }

  // Auto: render both, CSS hides the inactive one.
  const both = (
    <span className={`inline-flex ${sizeClass} w-auto ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/logo-light.svg"
        alt="OduDoc"
        width={338}
        height={64}
        className={`${sizeClass} w-auto object-contain dark:hidden`}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/logo-dark.svg"
        alt="OduDoc"
        width={338}
        height={64}
        className={`hidden ${sizeClass} w-auto object-contain dark:inline-block`}
      />
    </span>
  );
  return link ? <Link href="/">{both}</Link> : both;
}
