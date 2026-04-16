"use client";

import AnimatedCounter from "./AnimatedCounter";

const stats = [
  { end: 1000, suffix: "+", label: "Happy Patients" },
  { end: 200, suffix: "+", label: "Expert Doctors" },
  { end: 50, suffix: "+", label: "Departments" },
  { end: 98, suffix: "%", label: "Satisfaction" },
];

export default function FunFactBar() {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-primary-600 to-primary-800 px-6 py-16 sm:px-12">
          {/* Background pattern */}
          <div className="relative">
            <div className="absolute inset-0 opacity-10">
              <svg className="h-full w-full" viewBox="0 0 400 200" fill="none">
                <circle cx="50" cy="50" r="80" stroke="white" strokeWidth="0.5" />
                <circle cx="350" cy="150" r="100" stroke="white" strokeWidth="0.5" />
                <circle cx="200" cy="30" r="60" stroke="white" strokeWidth="0.5" />
              </svg>
            </div>

            <div className="relative grid grid-cols-2 gap-8 md:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-4xl font-bold text-white sm:text-5xl">
                    <AnimatedCounter end={stat.end} suffix={stat.suffix} />
                  </p>
                  <p className="mt-2 text-sm font-medium text-primary-100">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
