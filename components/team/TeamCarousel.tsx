"use client";

import { useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import Link from "next/link";
import { doctors } from "@/lib/data";
import type { Doctor } from "@/lib/data";

import "swiper/css";
import "swiper/css/navigation";

export default function TeamCarousel() {
  const swiperRef = useRef<SwiperType | null>(null);

  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary-600">
              Our Specialists
            </p>
            <h2 className="mt-2 text-4xl font-bold text-gray-900">
              Trusted Healthcare Experts
            </h2>
          </div>
          <div className="hidden gap-3 sm:flex">
            <button
              onClick={() => swiperRef.current?.slidePrev()}
              className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary-600 text-primary-600 transition-all duration-300 hover:bg-primary-600 hover:text-white"
              aria-label="Previous"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              onClick={() => swiperRef.current?.slideNext()}
              className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary-600 text-primary-600 transition-all duration-300 hover:bg-primary-600 hover:text-white"
              aria-label="Next"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>

        <div className="mt-10">
          <Swiper
            modules={[Navigation]}
            onSwiper={(swiper) => { swiperRef.current = swiper; }}
            spaceBetween={24}
            slidesPerView={1}
            breakpoints={{
              640: { slidesPerView: 2 },
              1024: { slidesPerView: 3 },
            }}
          >
            {doctors.slice(0, 8).map((doctor: Doctor) => (
              <SwiperSlide key={doctor.id}>
                <div className="overflow-hidden rounded-2xl bg-white shadow-md transition-all duration-300 hover:shadow-xl">
                  {/* Image area */}
                  <div className={`flex h-72 items-center justify-center bg-gradient-to-br ${doctor.imageColor} to-transparent`}>
                    <span className="text-7xl font-bold text-white/70">{doctor.initials}</span>
                  </div>

                  {/* Info section */}
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900">{doctor.name}</h3>
                    <p className="mt-1 text-sm text-primary-600">{doctor.specialty}</p>
                    <p className="mt-1 text-sm text-gray-400">{doctor.experience} years experience</p>

                    {/* Action buttons */}
                    <div className="mt-4 flex gap-3">
                      <Link
                        href={`/doctors/${doctor.id}`}
                        className="flex-1 rounded-lg bg-primary-600 py-2.5 text-center text-sm font-semibold text-white transition-all duration-300 hover:bg-primary-700"
                      >
                        Book Appointment
                      </Link>
                      <Link
                        href={`/doctors/${doctor.id}`}
                        className="flex-1 rounded-lg border-2 border-gray-200 py-2.5 text-center text-sm font-semibold text-gray-700 transition-all duration-300 hover:border-primary-600 hover:text-primary-600"
                      >
                        View Profile
                      </Link>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </section>
  );
}
