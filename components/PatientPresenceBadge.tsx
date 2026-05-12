"use client";

import { useEffect, useState } from "react";
import {
  getPatientPresence,
  formatPatientLastSeen,
  type PatientPresence,
} from "@/lib/doctor-presence";

export default function PatientPresenceBadge({
  patientKey,
  size = "sm",
}: {
  patientKey: string;
  size?: "sm" | "md";
}) {
  const [presence, setPresence] = useState<PatientPresence | null>(null);

  useEffect(() => {
    setPresence(getPatientPresence(patientKey));
    const t = setInterval(
      () => setPresence(getPatientPresence(patientKey)),
      30_000
    );
    return () => clearInterval(t);
  }, [patientKey]);

  if (!presence) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-slate-800 px-2 font-medium text-gray-500 dark:text-slate-400 ${
          size === "md" ? "py-1 text-xs" : "py-0.5 text-[11px]"
        }`}
      >
        <span className="inline-block h-2 w-2 rounded-full bg-gray-300" />
        Checking…
      </span>
    );
  }

  const { online, lastSeenMinutesAgo } = presence;
  const label = formatPatientLastSeen(lastSeenMinutesAgo);
  const textSize = size === "md" ? "text-xs py-1" : "text-[11px] py-0.5";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 font-medium ${textSize} ${
        online ? "bg-green-50 text-green-700" : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400"
      }`}
    >
      <span className="relative inline-flex h-2 w-2">
        {online && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${
            online ? "bg-green-500" : "bg-gray-400"
          }`}
        />
      </span>
      {label}
    </span>
  );
}

export function PatientPresenceDot({ patientKey }: { patientKey: string }) {
  const [presence, setPresence] = useState<PatientPresence | null>(null);

  useEffect(() => {
    setPresence(getPatientPresence(patientKey));
    const t = setInterval(
      () => setPresence(getPatientPresence(patientKey)),
      30_000
    );
    return () => clearInterval(t);
  }, [patientKey]);

  if (!presence || !presence.online) return null;

  return (
    <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white dark:bg-slate-900">
      <span className="relative inline-flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white" />
      </span>
    </span>
  );
}
