"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Doctor } from "@/lib/data";

const socialIcons = [
  { name: "Facebook", path: "M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" },
  { name: "Twitter", path: "M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" },
  { name: "LinkedIn", path: "M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 2a2 2 0 110 4 2 2 0 010-4z" },
];

interface TeamGridProps {
  limit?: number;
}

export default function TeamGrid({ limit = 6 }: TeamGridProps) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  useEffect(() => {
    fetch("/api/doctors", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && Array.isArray(d.doctors)) setDoctors(d.doctors);
      })
      .catch(() => {});
  }, []);

  const teamMembers = doctors.slice(0, limit);

  if (teamMembers.length === 0) return null;

  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary-600">
            Our Team
          </p>
          <h2 className="mt-2 text-4xl font-bold text-gray-900">Meet Our Expert Doctors</h2>
          <p className="mx-auto mt-3 max-w-2xl text-gray-500">
            Our team of experienced professionals is dedicated to providing you with the best healthcare services.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {teamMembers.map((doctor: Doctor) => (
            <div
              key={doctor.id}
              className="group overflow-hidden rounded-2xl bg-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              {/* Image placeholder */}
              <div className={`flex h-64 items-center justify-center bg-gradient-to-br ${doctor.imageColor} to-transparent`}>
                <span className="text-6xl font-bold text-white/80">{doctor.initials}</span>
              </div>

              {/* Meta */}
              <div className="p-6">
                <Link href={`/doctors/${doctor.id}`}>
                  <h3 className="text-xl font-semibold text-gray-900 transition-colors hover:text-primary-600">
                    {doctor.name}
                  </h3>
                </Link>
                <p className="mt-1 text-sm font-medium text-primary-600">{doctor.specialty}</p>
                <p className="mt-2 line-clamp-2 text-sm text-gray-500">{doctor.about}</p>

                {/* Social Links */}
                <div className="mt-4 flex gap-3 border-t border-gray-100 pt-4">
                  {socialIcons.map((icon) => (
                    <button
                      key={icon.name}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-all duration-300 hover:bg-primary-600 hover:text-white"
                      aria-label={icon.name}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={icon.path} />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link href="/doctors" className="btn-outline">
            View All Doctors
          </Link>
        </div>
      </div>
    </section>
  );
}
