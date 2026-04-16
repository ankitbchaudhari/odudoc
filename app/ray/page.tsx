import Link from "next/link";

const features = [
  { title: "AI-Powered Diagnostics", desc: "Upload X-rays, CT scans, and MRIs for instant AI-assisted analysis. Get preliminary findings in under 60 seconds.", icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
  { title: "Smart Report Generation", desc: "Auto-generate structured radiology reports with key findings highlighted. Review and approve in one click.", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { title: "DICOM Viewer", desc: "Full-featured medical image viewer with windowing, annotations, measurements, and multi-planar reconstruction.", icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { title: "Collaboration", desc: "Share scans securely with specialists. Get second opinions without transferring physical films.", icon: "M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" },
];

const stats = [
  { value: "50K+", label: "Scans Analyzed" },
  { value: "98.5%", label: "Accuracy Rate" },
  { value: "< 60s", label: "Analysis Time" },
  { value: "200+", label: "Hospitals" },
];

export default function RayPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 py-20 text-white">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            AI-Powered Radiology
          </div>
          <h1 className="text-4xl font-bold md:text-5xl">
            Ray <span className="text-indigo-300">by OduDoc</span>
          </h1>
          <p className="mt-4 text-lg text-indigo-200">
            AI-assisted radiology platform for faster, more accurate diagnostics.
            Upload. Analyze. Report. In seconds.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/contact" className="rounded-xl bg-white px-8 py-3 text-sm font-semibold text-indigo-700 shadow-lg hover:bg-gray-50">
              Request Early Access
            </Link>
            <Link href="/for-doctors" className="rounded-xl border-2 border-white/30 px-8 py-3 text-sm font-semibold text-white hover:bg-white/10">
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-gray-100 py-10">
        <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-12 px-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-bold text-indigo-600">{s.value}</p>
              <p className="text-sm text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="mb-10 text-center text-2xl font-bold text-gray-900">How Ray Works</h2>
          <div className="grid gap-8 md:grid-cols-2">
            {features.map((f) => (
              <div key={f.title} className="flex gap-4 rounded-2xl border border-gray-100 p-6 transition-shadow hover:shadow-md">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50">
                  <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={f.icon} />
                  </svg>
                </div>
                <div>
                  <h3 className="mb-1 font-bold text-gray-900">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-gray-600">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-indigo-50 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">Ready to Transform Your Radiology Workflow?</h2>
          <p className="mb-6 text-gray-600">Join 200+ hospitals already using Ray by OduDoc for faster, smarter diagnostics.</p>
          <Link href="/contact" className="inline-block rounded-xl bg-indigo-600 px-8 py-3 text-sm font-semibold text-white shadow-lg hover:bg-indigo-700">
            Get Started
          </Link>
        </div>
      </section>
    </div>
  );
}
