"use client";

import { useEffect, useState } from "react";
import { getDoctorPresence, formatLastSeen, type DoctorPresence } from "@/lib/doctor-presence";

export default function DoctorPresenceBadge({
  doctorId,
  size = "sm",
}: {
  doctorId: string;
  size?: "sm" | "md";
}) {
  const [presence, setPresence] = useState<DoctorPresence | null>(null);

  useEffect(() => {
    setPresence(getDoctorPresence(doctorId));
    const t = setInterval(() => setPresence(getDoctorPresence(doctorId)), 30_000);
    return () => clearInterval(t);
  }, [doctorId]);

  if (!presence) {
    // SSR-safe placeholder so the chip doesn't pop in awkwardly
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2 ${size === "md" ? "py-1 text-xs" : "py-0.5 text-[11px]"} font-medium text-gray-500`}>
        <span className="inline-block h-2 w-2 rounded-full bg-gray-300" />
        Checking…
      </span>
    );
  }

  const { online, lastSeenMinutesAgo, inCall } = presence;
  const label = inCall
    ? "In consultation"
    : online
    ? "Online now"
    : formatLastSeen(lastSeenMinutesAgo);

  const style = inCall
    ? "bg-amber-50 text-amber-700"
    : online
    ? "bg-green-50 text-green-700"
    : "bg-gray-100 text-gray-500";

  const dotColor = inCall ? "bg-amber-500" : online ? "bg-green-500" : "bg-gray-400";
  const textSize = size === "md" ? "text-xs py-1" : "text-[11px] py-0.5";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 ${textSize} font-medium ${style}`}>
      <span className="relative inline-flex h-2 w-2">
        {online && !inCall && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${dotColor}`} />
      </span>
      {label}
    </span>
  );
}

/**
 * Tiny green dot to overlay on an avatar. Use when there's no space
 * for the full badge but you still want to signal online state.
 */
export function PresenceDot({ doctorId }: { doctorId: string }) {
  const [presence, setPresence] = useState<DoctorPresence | null>(null);

  useEffect(() => {
    setPresence(getDoctorPresence(doctorId));
    const t = setInterval(() => setPresence(getDoctorPresence(doctorId)), 30_000);
    return () => clearInterval(t);
  }, [doctorId]);

  if (!presence || !presence.online) return null;

  return (
    <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white">
      <span className="relative inline-flex h-3 w-3">
        {!presence.inCall && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        )}
        <span
          className={`relative inline-flex h-3 w-3 rounded-full ring-2 ring-white ${
            presence.inCall ? "bg-amber-500" : "bg-green-500"
          }`}
        />
      </span>
    </span>
  );
}
