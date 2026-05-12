"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface BeforeAfterSliderProps {
  beforeColor: string;
  afterColor: string;
  beforeLabel?: string;
  afterLabel?: string;
  treatmentName: string;
}

export default function BeforeAfterSlider({
  beforeColor,
  afterColor,
  beforeLabel = "Before",
  afterLabel = "After",
  treatmentName,
}: BeforeAfterSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosition(pct);
  }, []);

  const handleMouseDown = useCallback(() => setIsDragging(true), []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      updatePosition(e.clientX);
    };
    const handleMouseUp = () => setIsDragging(false);

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      updatePosition(e.touches[0].clientX);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging, updatePosition]);

  return (
    <div>
      <div
        ref={containerRef}
        className="relative h-64 cursor-col-resize select-none overflow-hidden rounded-xl"
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
      >
        {/* After (full background) */}
        <div className={`absolute inset-0 ${afterColor} flex items-center justify-center`}>
          <span className="text-lg font-bold text-white/70">{afterLabel}</span>
        </div>

        {/* Before (clipped) */}
        <div
          className={`absolute inset-0 ${beforeColor} flex items-center justify-center`}
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <span className="text-lg font-bold text-white/70">{beforeLabel}</span>
        </div>

        {/* Divider */}
        <div
          className="absolute top-0 bottom-0 z-10 w-1 bg-white dark:bg-slate-900 shadow-lg"
          style={{ left: `${position}%`, transform: "translateX(-50%)" }}
        >
          <div className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white dark:bg-slate-900 shadow-lg">
            <svg className="h-5 w-5 text-gray-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
            </svg>
          </div>
        </div>

        {/* Labels */}
        <span className="absolute left-3 top-3 rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white">
          {beforeLabel}
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white">
          {afterLabel}
        </span>
      </div>
      <p className="mt-3 text-center text-sm font-semibold text-gray-900 dark:text-slate-100">{treatmentName}</p>
    </div>
  );
}
