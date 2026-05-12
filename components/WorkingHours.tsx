"use client";

import { useState, useEffect } from "react";

const schedule = [
  { day: "Monday", hours: "24 Hours" },
  { day: "Tuesday", hours: "24 Hours" },
  { day: "Wednesday", hours: "24 Hours" },
  { day: "Thursday", hours: "24 Hours" },
  { day: "Friday", hours: "24 Hours" },
  { day: "Saturday", hours: "24 Hours" },
  { day: "Sunday", hours: "24 Hours" },
];

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function WorkingHours() {
  const [currentDay, setCurrentDay] = useState("");

  useEffect(() => {
    const now = new Date();
    setCurrentDay(dayNames[now.getDay()]);
  }, []);

  return (
    <div className="rounded-xl bg-white dark:bg-slate-900 p-6 shadow-md">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">Working Hours</h3>
        <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-green-700">
          24/7
        </span>
      </div>
      <div className="mb-4 flex items-center gap-2">
        <span className="relative inline-flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
        </span>
        <span className="text-sm font-semibold text-green-600">Open Now · Always</span>
      </div>

      <ul className="space-y-2">
        {schedule.map((s) => (
          <li
            key={s.day}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
              s.day === currentDay
                ? "bg-primary-50 font-semibold text-primary-700"
                : "text-gray-600 dark:text-slate-300"
            }`}
          >
            <span>{s.day}</span>
            <span className="font-medium">{s.hours}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 rounded-lg bg-green-50 p-3 text-center">
        <p className="text-xs font-semibold text-green-800">
          Available 24/7 — including holidays
        </p>
        <p className="mt-1 text-xs text-green-700">
          Emergency: <a href="tel:+13028992625" className="underline">+1 (302) 899-2625</a>
        </p>
      </div>
    </div>
  );
}
