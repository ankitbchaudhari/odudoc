interface BannerSimpleProps {
  title: string;
  subtitle?: string;
  bgGradient?: string;
}

export default function BannerSimple({
  title,
  subtitle,
  bgGradient = "from-primary-600 to-primary-800",
}: BannerSimpleProps) {
  return (
    <section className={`relative overflow-hidden bg-gradient-to-r ${bgGradient} py-20 md:py-28`}>
      {/* Decorative overlay */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
          backgroundSize: "30px 30px",
        }} />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-white sm:text-4xl md:text-5xl">{title}</h1>
        {subtitle && (
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">{subtitle}</p>
        )}
      </div>
    </section>
  );
}
