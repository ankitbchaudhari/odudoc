"use client";

import { useEffect, useState } from "react";

const schedule = [
  { day: "Monday - Friday", time: "24 Hours" },
  { day: "Saturday", time: "24 Hours" },
  { day: "Sunday", time: "24 Hours" },
];

export default function HeroWithSchedule() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-primary-900 to-gray-900 py-20 md:py-32">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: "linear-gradient(45deg, white 25%, transparent 25%), linear-gradient(-45deg, white 25%, transparent 25%)",
          backgroundSize: "60px 60px",
        }} />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          {/* Left content */}
          <div>
            <span className="inline-block rounded-full bg-primary-500/20 px-4 py-1.5 text-xs font-semibold text-primary-300">
              Welcome to OduDoc
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
              Caring for Your
              <br />
              <span className="text-primary-400">Health & Wellness</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-gray-300">
              Our expert team of physicians provides comprehensive care with the latest
              medical advancements and a warm, patient-centered approach.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="/doctors"
                className="btn-primary"
              >
                Find a Doctor
              </a>
              <a
                href="/about"
                className="rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10"
              >
                About Us
              </a>
            </div>
          </div>

          {/* Floating schedule card */}
          <div className={`transition-all duration-700 ${isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
            <div className="rounded-2xl bg-white p-8 shadow-2xl">
              {/* Doctor info */}
              <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-xl font-bold text-primary-700">
                  SJ
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Dr. Sarah Johnson</h3>
                  <p className="text-sm text-gray-500">Chief Medical Officer</p>
                  <div className="mt-1 flex items-center gap-1 text-yellow-500">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                    <span className="ml-1 text-xs text-gray-400">5.0</span>
                  </div>
                </div>
              </div>

              {/* Schedule */}
              <div className="mt-6 space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400">
                  Clinic Schedule
                </h4>
                {schedule.map((item) => (
                  <div key={item.day} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <svg className="h-4 w-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium text-gray-700">{item.day}</span>
                    </div>
                    <span className="text-sm font-semibold text-primary-600">{item.time}</span>
                  </div>
                ))}
              </div>

              <a
                href="/contact"
                className="btn-primary mt-6 w-full text-center"
              >
                Book Appointment
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
