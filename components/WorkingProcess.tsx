"use client";

const steps = [
  {
    number: 1,
    title: "Make Appointment",
    description: "Choose your preferred doctor and book at your convenience.",
    gradient: "from-sky-500 to-indigo-600",
    ring: "ring-sky-500/30",
    shadow: "shadow-sky-500/30",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    number: 2,
    title: "Meet Doctor",
    description: "Visit the doctor in person or connect online via video.",
    gradient: "from-emerald-500 to-teal-600",
    ring: "ring-emerald-500/30",
    shadow: "shadow-emerald-500/30",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    number: 3,
    title: "Get Treatment",
    description: "Receive a personalized treatment plan for your needs.",
    gradient: "from-fuchsia-500 to-purple-600",
    ring: "ring-fuchsia-500/30",
    shadow: "shadow-fuchsia-500/30",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    number: 4,
    title: "Recovery",
    description: "Follow up with your doctor and get back to an active life.",
    gradient: "from-amber-500 to-orange-600",
    ring: "ring-amber-500/30",
    shadow: "shadow-orange-500/30",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
];

export default function WorkingProcess() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-sky-50/40 to-white py-20">
      <div className="pointer-events-none absolute -left-32 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-gradient-to-br from-primary-100/40 to-purple-100/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-gradient-to-br from-fuchsia-100/40 to-amber-100/40 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-100 to-teal-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-700">
            Simple Process
          </span>
          <h2 className="mt-4 text-3xl font-bold text-gray-900 dark:text-slate-100 md:text-5xl">
            How It{" "}
            <span className="bg-gradient-to-r from-primary-600 via-teal-500 to-emerald-500 bg-clip-text text-transparent">
              Works
            </span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-gray-500 dark:text-slate-400">
            Getting quality healthcare has never been easier. Follow these simple steps.
          </p>
        </div>

        <div className="relative mt-16">
          {/* Connecting dashed line - desktop */}
          <div className="absolute left-[12%] right-[12%] top-10 hidden h-px border-t-2 border-dashed border-primary-200 lg:block" />

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div
                key={step.number}
                className="group relative flex flex-col items-center rounded-2xl bg-white/70 p-6 text-center shadow-sm backdrop-blur transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                {/* Icon circle */}
                <div className="relative z-10 mb-5">
                  <div
                    className={`flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${step.gradient} text-white shadow-lg ${step.shadow} ring-4 ring-white transition-transform group-hover:scale-110 group-hover:rotate-3`}
                  >
                    {step.icon}
                  </div>
                  <span
                    className={`absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-slate-900 text-sm font-bold shadow-md ring-2 ${step.ring}`}
                  >
                    <span className={`bg-gradient-to-br ${step.gradient} bg-clip-text text-transparent`}>
                      {step.number}
                    </span>
                  </span>
                </div>

                <h3 className="mb-2 text-lg font-bold text-gray-900 dark:text-slate-100">{step.title}</h3>
                <p className="max-w-xs text-sm leading-relaxed text-gray-500 dark:text-slate-400">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
