"use client";

const steps = [
  {
    number: 1,
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: "Make Appointment",
    description: "Choose your preferred doctor and book an appointment at your convenience.",
  },
  {
    number: 2,
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    title: "Meet Doctor",
    description: "Visit the doctor in person or connect online via video consultation.",
  },
  {
    number: 3,
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: "Get Treatment",
    description: "Receive a personalized treatment plan tailored to your health needs.",
  },
  {
    number: 4,
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    title: "Recovery",
    description: "Follow up with your doctor and get back to your healthy, active life.",
  },
];

export default function WorkingProcess() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle mx-auto max-w-2xl">
            Getting quality healthcare has never been easier. Follow these simple steps.
          </p>
        </div>

        <div className="relative mt-16">
          {/* Connecting line - desktop */}
          <div className="absolute left-0 right-0 top-16 hidden h-0.5 bg-gradient-to-r from-transparent via-primary-200 to-transparent lg:block" />

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div key={step.number} className="relative flex flex-col items-center text-center">
                {/* Number circle */}
                <div className="relative z-10 mb-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg shadow-primary-600/30">
                    {step.icon}
                  </div>
                  <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-primary-600 shadow">
                    {step.number}
                  </span>
                </div>

                {/* Content */}
                <h3 className="mb-2 text-lg font-bold text-gray-900">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed max-w-xs">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
