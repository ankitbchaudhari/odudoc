"use client";

import { ReactNode } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

interface SwiperCarouselProps {
  children: ReactNode[];
  slidesPerView?: number;
  spaceBetween?: number;
  navigation?: boolean;
  pagination?: boolean;
  autoplay?: boolean;
  loop?: boolean;
  breakpoints?: Record<number, { slidesPerView: number; spaceBetween?: number }>;
  className?: string;
}

export default function SwiperCarousel({
  children,
  slidesPerView = 1,
  spaceBetween = 24,
  navigation = true,
  pagination = true,
  autoplay = false,
  loop = true,
  breakpoints,
  className = "",
}: SwiperCarouselProps) {
  const defaultBreakpoints = breakpoints || {
    640: { slidesPerView: 2, spaceBetween: 20 },
    1024: { slidesPerView: 3, spaceBetween: 24 },
    1280: { slidesPerView: slidesPerView, spaceBetween: spaceBetween },
  };

  return (
    <div className={`swiper-container-custom ${className}`}>
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        slidesPerView={1}
        spaceBetween={spaceBetween}
        navigation={navigation}
        pagination={pagination ? { clickable: true } : false}
        autoplay={autoplay ? { delay: 4000, disableOnInteraction: false } : false}
        loop={loop}
        breakpoints={defaultBreakpoints}
        className="!pb-12"
      >
        {children.map((child, index) => (
          <SwiperSlide key={index}>{child}</SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
