"use client";

import { useEffect, useState } from "react";

interface TextRotatorProps {
  words: string[];
  interval?: number;
  className?: string;
}

export default function TextRotator({ words, interval = 2500, className = "" }: TextRotatorProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % words.length);
        setIsAnimating(false);
      }, 300);
    }, interval);

    return () => clearInterval(timer);
  }, [words.length, interval]);

  return (
    <span className={`inline-block overflow-hidden ${className}`}>
      <span
        className={`inline-block transition-all duration-300 ${
          isAnimating
            ? "-translate-y-full opacity-0"
            : "translate-y-0 opacity-100"
        }`}
      >
        {words[currentIndex]}
      </span>
    </span>
  );
}
