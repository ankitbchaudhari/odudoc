// Unified color-grading status widget per Ecosystem Spec §6.
// One component, used across ward / ICU / lab / radiology / pharmacy panels.
// Each color carries a fixed semantic meaning — do NOT improvise colors.

import type { ReactNode } from "react";

export type StatusColor =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "violet"
  | "white"
  | "gray";

export type StatusDomain =
  | "patient"
  | "sample"
  | "scan"
  | "pharmacy"
  | "generic";

interface Tone {
  bg: string;
  text: string;
  ring: string;
  dot: string;
}

const TONES: Record<StatusColor, Tone> = {
  red:    { bg: "bg-red-50",    text: "text-red-700",    ring: "ring-red-200",    dot: "bg-red-500" },
  orange: { bg: "bg-orange-50", text: "text-orange-700", ring: "ring-orange-200", dot: "bg-orange-500" },
  yellow: { bg: "bg-amber-50",  text: "text-amber-800",  ring: "ring-amber-200",  dot: "bg-amber-500" },
  green:  { bg: "bg-emerald-50",text: "text-emerald-700",ring: "ring-emerald-200",dot: "bg-emerald-500" },
  blue:   { bg: "bg-sky-50",    text: "text-sky-700",    ring: "ring-sky-200",    dot: "bg-sky-500" },
  violet: { bg: "bg-violet-50", text: "text-violet-700", ring: "ring-violet-200", dot: "bg-violet-500" },
  white:  { bg: "bg-white",     text: "text-slate-600",  ring: "ring-slate-200",  dot: "bg-slate-300" },
  gray:   { bg: "bg-slate-100", text: "text-slate-700",  ring: "ring-slate-300",  dot: "bg-slate-400" },
};

// Canonical labels per (domain, color) — see spec §6.2–§6.5.
const LABELS: Record<StatusDomain, Partial<Record<StatusColor, string>>> = {
  patient: {
    red: "Critical",
    orange: "Urgent",
    yellow: "Monitoring",
    green: "Stable",
    blue: "Scheduled",
    violet: "Isolation",
    white: "Discharged",
  },
  sample: {
    red: "Critical result",
    orange: "Abnormal",
    yellow: "Processing",
    green: "Normal",
    blue: "In transit",
    violet: "Rejected — resample",
  },
  scan: {
    blue: "Scheduled",
    yellow: "In progress",
    orange: "Awaiting report",
    green: "Report finalised",
    red: "Urgent finding",
  },
  pharmacy: {
    yellow: "Order received",
    blue: "Being dispensed",
    orange: "Out of stock",
    green: "Dispensed",
    red: "Token error",
    gray: "Out for delivery",
  },
  generic: {},
};

export function statusLabel(domain: StatusDomain, color: StatusColor): string {
  return LABELS[domain]?.[color] ?? color.toUpperCase();
}

interface StatusBadgeProps {
  color: StatusColor;
  domain?: StatusDomain;
  label?: ReactNode;
  pulse?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function StatusBadge({
  color,
  domain = "generic",
  label,
  pulse = false,
  size = "md",
  className = "",
}: StatusBadgeProps) {
  const tone = TONES[color];
  const text = label ?? statusLabel(domain, color);
  const sizing =
    size === "sm"
      ? "px-2 py-0.5 text-[10.5px]"
      : "px-2.5 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ${tone.bg} ${tone.text} ${tone.ring} ${sizing} ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${tone.dot} ${
          pulse || color === "red" ? "animate-pulse" : ""
        }`}
      />
      {text}
    </span>
  );
}

// Larger card-style indicator (used on bed cards, lab queue tiles, etc.)
export function StatusDot({ color, className = "" }: { color: StatusColor; className?: string }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${TONES[color].dot} ${
        color === "red" ? "animate-pulse" : ""
      } ${className}`}
      aria-hidden
    />
  );
}
