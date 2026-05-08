// Drop-in pill that renders any clinical/operational status with the
// canonical tone from lib/clinical-tones.ts. Keeps every dashboard
// row visually consistent so a "Ready" badge looks the same on the
// reception queue, lab queue, pharmacy queue, and patient dashboard.

import { tone, toneForStatus, type ToneKey } from "@/lib/clinical-tones";

interface StatusBadgeProps {
  /** Either a known ToneKey or a free-form status string we'll
   *  coerce via toneForStatus(). */
  status: ToneKey | string;
  /** Override the rendered label (defaults to the tone's label). */
  label?: string;
  /** Hide the emoji glyph (useful in dense table cells). */
  noEmoji?: boolean;
  className?: string;
}

export default function StatusBadge({
  status,
  label,
  noEmoji,
  className = "",
}: StatusBadgeProps) {
  const isKey = typeof status === "string" && status in TONE_KEYS;
  const T = isKey ? tone(status as ToneKey) : toneForStatus(status);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${T.pill} ${className}`}
    >
      {!noEmoji && <span aria-hidden="true">{T.emoji}</span>}
      {label || T.label}
    </span>
  );
}

// Lightweight key check that survives TS narrowing.
const TONE_KEYS: Record<string, true> = {
  triage_red: true, triage_yellow: true, triage_green: true, triage_black: true,
  admitted: true, in_or: true, post_op: true, discharged: true, transferred: true,
  scheduled: true, checked_in: true, in_consult: true, completed: true,
  cancelled: true, no_show: true,
  pending: true, in_progress: true, ready: true, delivered: true,
  rejected: true, abnormal: true,
  in_stock: true, low_stock: true, out_of_stock: true, expiring_soon: true, expired: true,
  waste_yellow: true, waste_red: true, waste_blue: true, waste_white: true, waste_black: true,
  info: true, neutral: true,
};
