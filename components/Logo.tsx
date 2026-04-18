import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  /** "sm" = navbar, "md" = footer/cards, "lg" = login/hero, "xl" = splash */
  size?: "sm" | "md" | "lg" | "xl";
  link?: boolean;
  className?: string;
}

// Note: source image is square (1:1) with internal padding around the mark,
// so displayed heights need to be larger than a typical wordmark would be for
// the logo to read at the intended weight.
const sizes: Record<string, string> = {
  sm: "h-14",
  md: "h-20",
  lg: "h-28",
  xl: "h-40",
};

export default function Logo({ size = "sm", link = true, className = "" }: LogoProps) {
  const img = (
    <Image
      src="/images/logo-full.png"
      alt="OduDoc"
      width={512}
      height={512}
      className={`${sizes[size]} w-auto object-contain ${className}`}
      priority
    />
  );

  if (!link) return img;
  return <Link href="/">{img}</Link>;
}
