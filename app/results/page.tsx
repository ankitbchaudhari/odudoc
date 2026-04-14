import BeforeAfterSlider from "@/components/BeforeAfterSlider";

const treatments = [
  { name: "Dental Whitening", description: "Professional teeth whitening showing dramatic improvement in tooth color and brightness.", beforeColor: "bg-yellow-800", afterColor: "bg-yellow-200" },
  { name: "Dermatology - Acne Treatment", description: "Complete acne treatment program with visible skin clearing over 3 months.", beforeColor: "bg-red-800", afterColor: "bg-rose-200" },
  { name: "Orthopedic - Posture Correction", description: "Posture correction therapy showing improved spinal alignment.", beforeColor: "bg-gray-700", afterColor: "bg-green-200" },
  { name: "Hair Restoration", description: "Advanced hair restoration treatment with natural-looking results.", beforeColor: "bg-amber-900", afterColor: "bg-amber-300" },
  { name: "Weight Management", description: "Comprehensive weight management program with measurable results.", beforeColor: "bg-orange-800", afterColor: "bg-emerald-300" },
  { name: "Vision Correction - LASIK", description: "Laser vision correction procedure for improved eyesight clarity.", beforeColor: "bg-slate-700", afterColor: "bg-sky-200" },
];

export default function ResultsPage() {
  return (
    <div className="bg-gray-50 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 md:text-4xl">
            Treatment <span className="text-primary-600">Results</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-gray-500">
            See the real results our patients have experienced. Drag the slider to compare before and after treatment outcomes.
          </p>
        </div>

        {/* Grid */}
        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {treatments.map((t) => (
            <div key={t.name} className="rounded-xl bg-white p-5 shadow-md">
              <BeforeAfterSlider
                beforeColor={t.beforeColor}
                afterColor={t.afterColor}
                treatmentName={t.name}
              />
              <p className="mt-2 text-center text-xs text-gray-500">{t.description}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <div className="mx-auto max-w-2xl rounded-2xl bg-gradient-to-r from-primary-600 to-teal-500 p-8 text-white">
            <h2 className="text-2xl font-bold">Ready to Transform Your Health?</h2>
            <p className="mt-2 text-primary-100">
              Book a consultation with our specialists to discuss your treatment options.
            </p>
            <a
              href="/doctors"
              className="mt-6 inline-block rounded-lg bg-white px-6 py-3 text-sm font-semibold text-primary-600 shadow-lg transition-transform hover:scale-105"
            >
              Find a Doctor
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
