interface BannerRoundedProps {
  title: string;
  subtitle?: string;
  bgGradient?: string;
}

export default function BannerRounded({
  title,
  subtitle,
  bgGradient = "from-primary-600 via-primary-700 to-teal-600",
}: BannerRoundedProps) {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className={`overflow-hidden rounded-3xl bg-gradient-to-r ${bgGradient} px-8 py-16 text-center md:px-16 md:py-20`}>
          <h2 className="text-2xl font-bold text-white sm:text-3xl md:text-4xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
              {subtitle}
            </p>
          )}
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href="/contact"
              className="rounded-xl bg-white px-8 py-3 text-sm font-semibold text-primary-700 shadow-lg transition-all hover:bg-gray-50 hover:shadow-xl"
            >
              Book Appointment
            </a>
            <a
              href="tel:+18001234567"
              className="rounded-xl border border-white/30 px-8 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10"
            >
              Call Us Now
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
