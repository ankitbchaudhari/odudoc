// Reusable pill that renders a drug's schedule classification.
// Drop into prescription cards, pharmacy line items, verify-medicine
// results — anywhere a drug appears, this badge makes the
// dispense-rules implications visible at a glance.

import { getScheduleInfo, type DrugSchedule } from "@/lib/drug-schedules";

interface Props {
  /** Schedule code from the catalogue (OTC / H / H1 / X / G / K). */
  schedule: string | undefined | null;
  /** Compact "OTC" pill vs the longer "Schedule H · Rx required". */
  size?: "compact" | "full";
  /** Optional click handler — if provided, the badge becomes a button
   *  that surfaces the dispense rule (used in pharmacy dispense UIs). */
  onClick?: () => void;
}

export default function DrugScheduleBadge({ schedule, size = "compact", onClick }: Props) {
  const info = getScheduleInfo(schedule);
  if (!info) return null;
  const cls = `inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${info.badge.bg} ${info.badge.text} ${info.badge.ring}`;
  const body = (
    <>
      <span>{info.label}</span>
      {size === "full" && info.requiresPrescription && <span aria-hidden>· Rx</span>}
      {size === "full" && info.coldChain && <span aria-hidden>· 2–8 °C</span>}
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${cls} cursor-pointer hover:opacity-90`} title={info.dispenseRule}>
        {body}
      </button>
    );
  }
  return (
    <span className={cls} title={info.dispenseRule}>
      {body}
    </span>
  );
}

export type { DrugSchedule };
