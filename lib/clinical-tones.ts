// Centralized color grading for clinical workflows.
//
// Every queue, status pill, admission state, lab result, and waste-bag
// row should reference this file rather than inventing local Tailwind
// classes — that way the visual language stays consistent across the
// admin / reception / nurse / lab / radiology / pharmacy panels.
//
// Each tone returns a coordinated bundle: gradient backgrounds for
// hero cards, ring + bg + text for inline pills, an emoji glyph, and
// a short human label. Pick the tone you need by KEY and apply via
// the helper objects in StatusBadge / Card components.

export type ToneKey =
  // ─── Triage / acuity ─────────────────────────────────────────────
  | "triage_red"        // immediate, life-threatening
  | "triage_yellow"     // urgent, within 15 min
  | "triage_green"      // routine, can wait
  | "triage_black"      // deceased / expectant
  // ─── Admission lifecycle ────────────────────────────────────────
  | "admitted"          // currently inpatient
  | "in_or"             // in operating theatre
  | "post_op"           // recovery
  | "discharged"        // sent home
  | "transferred"       // moved to another facility
  // ─── Appointments / visits ──────────────────────────────────────
  | "scheduled"
  | "checked_in"
  | "in_consult"
  | "completed"
  | "cancelled"
  | "no_show"
  // ─── Lab / imaging / Rx fulfillment ─────────────────────────────
  | "pending"
  | "in_progress"
  | "ready"
  | "delivered"
  | "rejected"
  | "abnormal"          // flagged result
  // ─── Inventory / waste ──────────────────────────────────────────
  | "in_stock"
  | "low_stock"
  | "out_of_stock"
  | "expiring_soon"
  | "expired"
  // BMW-2016 (India) / OSHA / EU bag colour codes
  | "waste_yellow"      // anatomical, soiled, infectious
  | "waste_red"         // contaminated plastics, tubing
  | "waste_blue"        // glass, metal sharps
  | "waste_white"       // sharps (translucent puncture-proof)
  | "waste_black"       // general / municipal
  // ─── Generic ────────────────────────────────────────────────────
  | "info"
  | "neutral";

export interface Tone {
  /** Short user-facing label, e.g. "Admitted" / "Ready". */
  label: string;
  /** One-character emoji glyph for compact UIs. */
  emoji: string;
  /** Inline pill: bg + text + ring (Tailwind). */
  pill: string;
  /** Subtle row tint (Tailwind bg-* / border-*). */
  row: string;
  /** Hero gradient (used on /dashboard/* hero banners). */
  hero: string;
  /** A solid accent color for charts / dots — Tailwind bg-* class. */
  dot: string;
}

const t = (
  label: string,
  emoji: string,
  pill: string,
  row: string,
  hero: string,
  dot: string,
): Tone => ({ label, emoji, pill, row, hero, dot });

export const TONES: Record<ToneKey, Tone> = {
  // Triage — bright and immediately recognisable.
  triage_red:    t("Immediate",   "🟥", "bg-rose-50 text-rose-800 ring-rose-300",       "border-rose-300 bg-rose-50/40",     "from-rose-600 via-red-600 to-orange-600",       "bg-rose-500"),
  triage_yellow: t("Urgent",      "🟨", "bg-amber-50 text-amber-800 ring-amber-300",    "border-amber-300 bg-amber-50/40",   "from-amber-500 via-orange-500 to-yellow-500",   "bg-amber-500"),
  triage_green:  t("Routine",     "🟩", "bg-emerald-50 text-emerald-800 ring-emerald-300","border-emerald-300 bg-emerald-50/40","from-emerald-500 via-teal-500 to-green-500",  "bg-emerald-500"),
  triage_black:  t("Expectant",   "⬛", "bg-slate-200 text-slate-900 ring-slate-400",   "border-slate-400 bg-slate-100",     "from-slate-700 via-slate-800 to-slate-900",     "bg-slate-700"),

  // Admission lifecycle.
  admitted:    t("Admitted",     "🛏️", "bg-sky-50 text-sky-800 ring-sky-200",          "border-sky-200 bg-sky-50/40",       "from-sky-600 via-blue-600 to-indigo-600",       "bg-sky-500"),
  in_or:       t("In OR",        "🔪", "bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-200","border-fuchsia-200 bg-fuchsia-50/40","from-fuchsia-600 via-violet-600 to-purple-600","bg-fuchsia-500"),
  post_op:     t("Post-op",      "💊", "bg-violet-50 text-violet-800 ring-violet-200", "border-violet-200 bg-violet-50/40", "from-violet-500 via-indigo-500 to-blue-500",    "bg-violet-500"),
  discharged:  t("Discharged",   "✅", "bg-emerald-50 text-emerald-800 ring-emerald-200","border-emerald-200 bg-emerald-50/40","from-emerald-500 via-teal-500 to-cyan-500",   "bg-emerald-500"),
  transferred: t("Transferred",  "🔁", "bg-indigo-50 text-indigo-800 ring-indigo-200", "border-indigo-200 bg-indigo-50/40", "from-indigo-500 via-blue-500 to-cyan-500",      "bg-indigo-500"),

  // Appointments.
  scheduled:   t("Scheduled",    "📅", "bg-slate-50 text-slate-700 ring-slate-200",    "border-slate-200 bg-slate-50/40",   "from-slate-500 via-slate-600 to-slate-700",     "bg-slate-500"),
  checked_in:  t("Checked in",   "📥", "bg-cyan-50 text-cyan-800 ring-cyan-200",       "border-cyan-200 bg-cyan-50/40",     "from-cyan-500 via-sky-500 to-blue-500",         "bg-cyan-500"),
  in_consult:  t("In consult",   "🩺", "bg-blue-50 text-blue-800 ring-blue-200",       "border-blue-200 bg-blue-50/40",     "from-blue-600 via-indigo-600 to-violet-600",    "bg-blue-500"),
  completed:   t("Completed",    "✓",  "bg-emerald-50 text-emerald-800 ring-emerald-200","border-emerald-200 bg-emerald-50/40","from-emerald-500 via-teal-500 to-cyan-500",   "bg-emerald-500"),
  cancelled:   t("Cancelled",    "⊘",  "bg-rose-50 text-rose-700 ring-rose-200",       "border-rose-200 bg-rose-50/40",     "from-rose-500 via-red-500 to-pink-500",         "bg-rose-500"),
  no_show:     t("No-show",      "—",  "bg-zinc-100 text-zinc-700 ring-zinc-300",      "border-zinc-300 bg-zinc-50",        "from-zinc-500 via-slate-500 to-stone-500",      "bg-zinc-500"),

  // Lab / imaging / Rx fulfillment.
  pending:     t("Pending",      "⏳", "bg-amber-50 text-amber-800 ring-amber-200",    "border-amber-200 bg-amber-50/40",   "from-amber-500 via-orange-500 to-rose-500",     "bg-amber-500"),
  in_progress: t("In progress",  "⚙️", "bg-sky-50 text-sky-800 ring-sky-200",          "border-sky-200 bg-sky-50/40",       "from-sky-500 via-blue-500 to-indigo-500",       "bg-sky-500"),
  ready:       t("Ready",        "✓",  "bg-emerald-50 text-emerald-800 ring-emerald-200","border-emerald-200 bg-emerald-50/40","from-emerald-500 via-green-500 to-teal-500",  "bg-emerald-500"),
  delivered:   t("Delivered",    "📦", "bg-teal-50 text-teal-800 ring-teal-200",       "border-teal-200 bg-teal-50/40",     "from-teal-500 via-cyan-500 to-sky-500",         "bg-teal-500"),
  rejected:    t("Rejected",     "✕",  "bg-rose-50 text-rose-800 ring-rose-200",       "border-rose-200 bg-rose-50/40",     "from-rose-600 via-red-600 to-pink-600",         "bg-rose-500"),
  abnormal:    t("Abnormal",     "⚠️", "bg-orange-50 text-orange-800 ring-orange-300", "border-orange-300 bg-orange-50/40", "from-orange-600 via-amber-600 to-red-600",      "bg-orange-500"),

  // Inventory / expiry.
  in_stock:      t("In stock",     "✓",  "bg-emerald-50 text-emerald-800 ring-emerald-200","border-emerald-200 bg-emerald-50/40","from-emerald-500 via-teal-500 to-green-500",  "bg-emerald-500"),
  low_stock:     t("Low stock",    "⚠️", "bg-amber-50 text-amber-800 ring-amber-300",    "border-amber-300 bg-amber-50/40",   "from-amber-500 via-orange-500 to-yellow-500",  "bg-amber-500"),
  out_of_stock:  t("Out of stock", "✕",  "bg-rose-50 text-rose-800 ring-rose-300",       "border-rose-300 bg-rose-50/40",     "from-rose-600 via-red-600 to-pink-600",         "bg-rose-500"),
  expiring_soon: t("Expiring soon","⏱️", "bg-amber-50 text-amber-800 ring-amber-300",    "border-amber-300 bg-amber-50/40",   "from-amber-500 via-orange-500 to-rose-500",     "bg-amber-500"),
  expired:       t("Expired",      "✕",  "bg-rose-100 text-rose-900 ring-rose-400",      "border-rose-400 bg-rose-100",       "from-rose-700 via-red-700 to-rose-800",         "bg-rose-600"),

  // BMW-2016 colour codes (India). Same colours apply broadly elsewhere.
  waste_yellow: t("Yellow bag", "🟡", "bg-yellow-50 text-yellow-900 ring-yellow-300",  "border-yellow-300 bg-yellow-50/40", "from-yellow-500 via-amber-500 to-orange-500",   "bg-yellow-500"),
  waste_red:    t("Red bag",    "🔴", "bg-red-50 text-red-900 ring-red-300",           "border-red-300 bg-red-50/40",       "from-red-600 via-rose-600 to-pink-600",         "bg-red-600"),
  waste_blue:   t("Blue bag",   "🔵", "bg-blue-50 text-blue-900 ring-blue-300",        "border-blue-300 bg-blue-50/40",     "from-blue-600 via-sky-600 to-cyan-600",         "bg-blue-600"),
  waste_white:  t("White (sharps)", "⚪", "bg-zinc-50 text-zinc-900 ring-zinc-300",     "border-zinc-300 bg-zinc-50",        "from-zinc-400 via-slate-400 to-stone-400",      "bg-zinc-300"),
  waste_black:  t("Black (general)","⚫", "bg-stone-100 text-stone-900 ring-stone-400", "border-stone-400 bg-stone-50",      "from-stone-700 via-stone-800 to-zinc-800",      "bg-stone-700"),

  // Generic fallbacks.
  info:    t("Info",   "ℹ️", "bg-sky-50 text-sky-800 ring-sky-200",         "border-sky-200 bg-sky-50/40",      "from-sky-500 via-blue-500 to-indigo-500", "bg-sky-500"),
  neutral: t("—",      "·",  "bg-slate-50 text-slate-700 ring-slate-200",   "border-slate-200 bg-slate-50/40",  "from-slate-500 via-slate-600 to-slate-700","bg-slate-400"),
};

export function tone(key: ToneKey): Tone {
  return TONES[key] || TONES.neutral;
}

/** Map an arbitrary text status (e.g. from a DB column) to a tone.
 *  Falls back to "neutral" so unknown values don't break the UI. */
export function toneForStatus(status: string | null | undefined): Tone {
  if (!status) return TONES.neutral;
  const k = status.toLowerCase().replace(/[\s-]+/g, "_") as ToneKey;
  return TONES[k] || TONES.neutral;
}
