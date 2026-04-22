import Link from "next/link";

interface BannerWithCTAProps {
  title: string;
  subtitle?: string;
  buttonText?: string;
  buttonHref?: string;
  bgGradient?: string;
}

export default function BannerWithCTA({
  title,
  subtitle,
  buttonText = "Get Started",
  buttonHref = "/contact",
  bgGradient = "from-primary-600 via-teal-600 to-emerald-600",
}: BannerWithCTAProps) {
  return (
    <section className={`relative overflow-hidden bg-gradient-to-br ${bgGradient} py-16 md:py-20`}>
      {/* Decorative layers */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
      {/* Subtle grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
          <div className="max-w-2xl text-center md:text-left">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-sm ring-1 ring-white/30">
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              Available 24/7
            </span>
            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl md:text-5xl">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-4 text-lg text-white/90">{subtitle}</p>
            )}
          </div>
          <div className="flex-shrink-0">
            <Link
              href={buttonHref}
              className="group inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-sm font-bold text-primary-700 shadow-2xl transition-all hover:scale-105 hover:shadow-white/20"
            >
              {buttonText}
              <svg
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
