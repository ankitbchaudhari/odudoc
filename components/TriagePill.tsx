"use client";

// Triage pill — drop-in for any ward board / OPD queue / lab list.
// Pass either a level directly or a context that classifyContext
// can resolve. Size variants for table rows (xs) vs hero cards (md).

import { TRIAGE_PALETTE, TriageContext, TriageLevel, classifyContext } from "@/lib/triage-status/palette";

interface Props {
  level?: TriageLevel;
  context?: TriageContext;
  /** Override the default label (e.g. "ICU bed 4"). */
  label?: string;
  size?: "xs" | "sm" | "md";
  /** Render only the dot — useful in dense lists. */
  dotOnly?: boolean;
  className?: string;
}

export default function TriagePill({ level, context, label, size = "sm", dotOnly = false, className = "" }: Props) {
  const resolved = level ?? (context ? classifyContext(context) : "green");
  const p = TRIAGE_PALETTE[resolved];
  const text = label ?? p.label;

  if (dotOnly) {
    return (
      <span
        aria-label={text}
        className={`inline-block h-2 w-2 rounded-full ${p.dotClass} ${className}`}
        title={text}
      />
    );
  }

  const sizeClass =
    size === "xs" ? "px-1.5 py-0.5 text-[9px]"
    : size === "md" ? "px-3 py-1 text-xs"
    : "px-2 py-0.5 text-[10px]";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wider ring-1 ${p.pillClass} ${sizeClass} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full bg-white/70 ${resolved === "red" ? "animate-pulse" : ""}`} />
      {text}
    </span>
  );
}
