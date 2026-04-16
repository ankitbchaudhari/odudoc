import Image from "next/image";
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
  const img = (
    <Image
      src="/images/logo-full.png"
      alt="OduDoc"
      width={750}
      height={200}
      className={`${sizes[size]} w-auto object-contain ${className}`}
      priority
    />
  );

  if (!link) return img;
  return <Link href="/">{img}</Link>;
}
