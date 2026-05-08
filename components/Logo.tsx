import Link from "next/link";

interface LogoProps {
  /** "sm" = navbar, "md" = footer/cards, "lg" = login/hero, "xl" = splash */
  size?: "sm" | "md" | "lg" | "xl";
  link?: boolean;
  className?: string;
}

const sizes: Record<string, string> = {
  sm: "h-9",
  md: "h-11",
  lg: "h-16",
  xl: "h-24",
};

export default function Logo({ size = "sm", link = true, className = "" }: LogoProps) {
  // Plain <img> rather than next/image: the logo is a vector SVG and
  // Next's image optimizer rasterizes it to a low-DPI PNG on mobile,
  // which looks soft on Retina iPhones. <img> + SVG = crisp at any DPR.
  // eslint-disable-next-line @next/next/no-img-element
  const img = (
    <img
      src="/images/logo.svg"
      alt="OduDoc"
      width={440}
      height={108}
      className={`${sizes[size]} w-auto object-contain ${className}`}
    />
  );

  if (!link) return img;
  return <Link href="/">{img}</Link>;
}
