"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function LoadingBar() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Start loading
    setVisible(true);
    setProgress(0);

    // Animate to 90%
    const t1 = setTimeout(() => setProgress(30), 50);
    const t2 = setTimeout(() => setProgress(60), 200);
    const t3 = setTimeout(() => setProgress(90), 400);

    // Complete
    const t4 = setTimeout(() => {
      setProgress(100);
    }, 500);

    // Hide
    const t5 = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [pathname]);

  if (!visible && progress === 0) return null;

  return (
    <div className="fixed left-0 right-0 top-0 z-[70] h-1">
      <div
        className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transition: "width 0.3s ease-out, opacity 0.3s ease-out 0.2s",
        }}
      />
    </div>
  );
}
