"use client";

import TextRotator from "@/components/TextRotator";
import AnimatedCounter from "@/components/AnimatedCounter";
import Link from "next/link";

const rotatingWords = ["Health", "Wellness", "Care", "Life"];

const quickStats = [
  { end: 500, suffix: "+", label: "Doctors" },
  { end: 50, suffix: "K+", label: "Patients" },
  { end: 98, suffix: "%", label: "Satisfaction" },
];

export default function HeroWithTextSlider() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-white via-primary-50 to-teal-50 py-20 md:py-28">
      {/* Decorative blobs */}
      <div className="absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-primary-100/50 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-teal-100/50 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white px-4 py-1.5 text-xs font-semibold text-primary-700 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
            Welcome to OduDoc Healthcare
          </span>

          <h1 className="mt-8 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl lg:text-7xl">
            Dedicated to Your
            <br />
            <TextRotator
              words={rotatingWords}
              className="text-primary-600"
              interval={2500}
            />
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-500">
            Experience comprehensive healthcare services with cutting-edge technology,
            compassionate care, and a commitment to your well-being.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/contact"
              className="btn-primary !px-8 !py-3.5 shadow-lg shadow-primary-600/20"
            >
              Book Appointment
            </Link>
            <Link
              href="/doctors"
              className="btn-outline !px-8 !py-3.5"
            >
              Our Doctors
            </Link>
          </div>

          {/* Quick stats */}
          <div className="mx-auto mt-14 flex max-w-lg items-center justify-center divide-x divide-gray-200">
            {quickStats.map((stat) => (
              <div key={stat.label} className="px-6 text-center md:px-10">
                <p className="text-2xl font-bold text-gray-900 md:text-3xl">
                  <AnimatedCounter end={stat.end} suffix={stat.suffix} />
                </p>
                <p className="mt-1 text-xs font-medium text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
