export default function AboutWithGradient() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          {/* Image with gradient backdrop */}
          <div className="relative">
            {/* Decorative SVG shape */}
            <svg
              className="absolute -left-8 -top-8 h-full w-full text-primary-100"
              viewBox="0 0 500 500"
              fill="currentColor"
            >
              <ellipse cx="250" cy="250" rx="230" ry="210" opacity="0.5" />
            </svg>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-200 to-teal-100">
              <div className="flex h-[400px] items-center justify-center">
                <svg className="h-32 w-32 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Content */}
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary-600">
              Who We Are
            </p>
            <h2 className="mt-3 text-4xl font-bold text-gray-900">
              Providing Quality Healthcare Since 2015
            </h2>
            <p className="mt-5 leading-relaxed text-gray-500">
              At OduDoc, we believe everyone deserves access to world-class healthcare.
              Our mission is to bridge the gap between patients and healthcare providers
              through technology and compassion.
            </p>
            <p className="mt-4 leading-relaxed text-gray-500">
              With a network of over 200 expert doctors across multiple specialties,
              we have served more than 100,000 patients with quality care and dedication.
              Our integrated platform makes booking, consultation, and follow-up seamless.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a href="/about" className="btn-primary">
                Learn More
              </a>
              <a href="/doctors" className="btn-outline">
                Our Doctors
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
