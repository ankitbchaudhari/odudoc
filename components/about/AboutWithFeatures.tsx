"use client";

const features = [
  {
    title: "Expert Medical Team",
    subtitle: "Board-certified doctors with years of experience in their respective fields.",
  },
  {
    title: "Advanced Technology",
    subtitle: "State-of-the-art medical equipment for accurate diagnosis and treatment.",
  },
  {
    title: "Patient-Centered Care",
    subtitle: "Personalized treatment plans tailored to each patient's unique needs.",
  },
  {
    title: "24/7 Availability",
    subtitle: "Round-the-clock emergency services and online consultations.",
  },
];

export default function AboutWithFeatures() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          {/* Image Side */}
          <div className="relative">
            <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary-100 to-primary-200">
              <div className="flex h-[420px] items-center justify-center">
                <svg className="h-40 w-40 text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
                </svg>
              </div>
            </div>
            {/* Mini rotating overlay */}
            <div className="absolute -bottom-4 -right-4 flex h-24 w-24 animate-spin-slow items-center justify-center rounded-full bg-white shadow-lg">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-600 text-white">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
            </div>
          </div>

          {/* Content Side */}
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary-600">
              About OduDoc
            </p>
            <h2 className="mt-3 text-4xl font-bold text-gray-900">
              We Are Committed to Your Health and Well-Being
            </h2>
            <p className="mt-4 leading-relaxed text-gray-500">
              For over a decade, OduDoc has been at the forefront of providing accessible,
              high-quality healthcare. Our platform connects patients with expert doctors,
              cutting-edge diagnostics, and compassionate care -- all designed to make your
              health journey seamless.
            </p>

            {/* Features List */}
            <div className="mt-8 space-y-5">
              {features.map((f) => (
                <div key={f.title} className="flex items-start gap-4">
                  <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{f.title}</h4>
                    <p className="mt-0.5 text-sm text-gray-500">{f.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
