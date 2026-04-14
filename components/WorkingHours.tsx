"use client";

import { useState, useEffect } from "react";

const schedule = [
  { day: "Monday", hours: "8:00 AM - 8:00 PM", open: 8, close: 20 },
  { day: "Tuesday", hours: "8:00 AM - 8:00 PM", open: 8, close: 20 },
  { day: "Wednesday", hours: "8:00 AM - 8:00 PM", open: 8, close: 20 },
  { day: "Thursday", hours: "8:00 AM - 8:00 PM", open: 8, close: 20 },
  { day: "Friday", hours: "8:00 AM - 8:00 PM", open: 8, close: 20 },
  { day: "Saturday", hours: "9:00 AM - 5:00 PM", open: 9, close: 17 },
  { day: "Sunday", hours: "Emergency Only", open: -1, close: -1 },
];

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function WorkingHours() {
  const [currentDay, setCurrentDay] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const now = new Date();
    const dayName = dayNames[now.getDay()];
    setCurrentDay(dayName);

    const currentHour = now.getHours();
    const todaySchedule = schedule.find((s) => s.day === dayName);
    if (todaySchedule && todaySchedule.open !== -1) {
      setIsOpen(currentHour >= todaySchedule.open && currentHour < todaySchedule.close);
    } else {
      setIsOpen(false);
    }
  }, []);

  return (
    <div className="rounded-xl bg-white p-6 shadow-md">
      <h3 className="mb-1 text-lg font-bold text-gray-900">Working Hours</h3>
      <div className="mb-4 flex items-center gap-2">
        <span
          className={`inline-block h-2.5 w-2.5 rounded-full ${
            isOpen ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" : "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]"
          }`}
        />
        <span className={`text-sm font-semibold ${isOpen ? "text-green-600" : "text-red-600"}`}>
          {isOpen ? "Open Now" : "Closed Now"}
        </span>
      </div>

      <ul className="space-y-2">
        {schedule.map((s) => (
          <li
            key={s.day}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
              s.day === currentDay
                ? "bg-primary-50 font-semibold text-primary-700"
                : "text-gray-600"
            }`}
          >
            <span>{s.day}</span>
            <span>{s.hours}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 rounded-lg bg-red-50 p-3 text-center">
        <p className="text-xs font-semibold text-red-700">
          Emergency Contact: <a href="tel:1-800-638-8362" className="underline">1-800-ODUDOC</a>
        </p>
      </div>
    </div>
  );
}
