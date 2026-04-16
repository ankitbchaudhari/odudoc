import Link from "next/link";

interface BannerSplitProps {
  title: string;
  subtitle?: string;
  buttonText?: string;
  buttonHref?: string;
  imageColor?: string;
}

export default function BannerSplit({
  title,
  subtitle,
  buttonText = "Learn More",
  buttonHref = "/about",
  imageColor = "from-primary-400 to-teal-400",
}: BannerSplitProps) {
  return (
    <section className="bg-gray-50 py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          {/* Image placeholder */}
          <div className={`flex aspect-[4/3] items-center justify-center rounded-2xl bg-gradient-to-br ${imageColor} shadow-xl`}>
            <div className="text-center text-white/80">
              <svg className="mx-auto h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <p className="mt-2 text-sm font-medium">Medical Facility</p>
            </div>
          </div>

          {/* Text content */}
          <div>
            <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-4 text-lg leading-relaxed text-gray-500">
                {subtitle}
              </p>
            )}
            <ul className="mt-6 space-y-3">
              {["State-of-the-art medical equipment", "Experienced specialist doctors", "Patient-centered care approach", "24/7 emergency services"].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-gray-600">
                  <svg className="h-5 w-5 flex-shrink-0 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link href={buttonHref} className="btn-primary">
                {buttonText}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
