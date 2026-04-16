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
  bgGradient = "from-primary-600 to-teal-500",
}: BannerWithCTAProps) {
  return (
    <section className={`bg-gradient-to-r ${bgGradient} py-16 md:py-20`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
          <div className="max-w-2xl text-center md:text-left">
            <h2 className="text-2xl font-bold text-white sm:text-3xl md:text-4xl">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-3 text-lg text-white/80">{subtitle}</p>
            )}
          </div>
          <div className="flex-shrink-0">
            <Link
              href={buttonHref}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-sm font-semibold text-primary-700 shadow-lg transition-all hover:bg-gray-50 hover:shadow-xl"
            >
              {buttonText}
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
