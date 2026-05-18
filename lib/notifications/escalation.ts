// 5-level notification escalation. Spec v6.0 §32.
//
// Every clinical event has a priority level driving where it fans
// out and how long the system waits before escalating to the next
// rung. The 5 levels:
//
//   L0 — info             (chart entry, vitals recorded)
//   L1 — routine          (lab result ready, Rx ready)
//   L2 — actionable       (BP high, follow-up due)
//   L3 — urgent           (critical lab value, deterioration)
//   L4 — emergency        (Code Blue, anaphylaxis, suicide risk)
//
// Channel preference per level — informational stays in-app, urgent
// fans out to SMS + push, emergency adds voice call + WhatsApp +
// supervisor SMS.
//
// Escalation chain: if no acknowledgement within the window, the
// next person on the rung gets paged. Levels 3-4 escalate
// automatically; 0-2 expire silently.

export type EscalationLevel = 0 | 1 | 2 | 3 | 4;

export interface EscalationProfile {
  level: EscalationLevel;
  label: string;
  tone: string;
  /** Channels fired immediately. */
  channels: Array<"in_app" | "push" | "sms" | "whatsapp" | "voice" | "email">;
  /** Minutes before escalating to the next rung. 0 = no escalation. */
  windowMinutes: number;
  /** Where it climbs to on timeout. Pager order is consumer-defined;
   *  these labels are advisory. */
  escalateTo?: "shift_lead" | "department_head" | "duty_consultant" | "code_team";
}

export const ESCALATION_PROFILES: Record<EscalationLevel, EscalationProfile> = {
  0: {
    level: 0,
    label: "Info",
    tone: "bg-slate-100 text-slate-700",
    channels: ["in_app"],
    windowMinutes: 0,
  },
  1: {
    level: 1,
    label: "Routine",
    tone: "bg-sky-100 text-sky-800",
    channels: ["in_app", "push"],
    windowMinutes: 0,
  },
  2: {
    level: 2,
    label: "Actionable",
    tone: "bg-amber-100 text-amber-900",
    channels: ["in_app", "push", "email"],
    windowMinutes: 60,
    escalateTo: "shift_lead",
  },
  3: {
    level: 3,
    label: "Urgent",
    tone: "bg-orange-100 text-orange-900",
    channels: ["in_app", "push", "sms", "whatsapp"],
    windowMinutes: 15,
    escalateTo: "duty_consultant",
  },
  4: {
    level: 4,
    label: "Emergency",
    tone: "bg-rose-100 text-rose-900",
    channels: ["in_app", "push", "sms", "whatsapp", "voice"],
    windowMinutes: 5,
    escalateTo: "code_team",
  },
};

export function profileFor(level: EscalationLevel): EscalationProfile {
  return ESCALATION_PROFILES[level];
}

/** Map a clinical event reason to its default level. Callers can
 *  override per-event but this is the safe default the dispatcher
 *  uses if the event publisher didn't set one. */
export function defaultLevelFor(reason: string): EscalationLevel {
  // L4 emergency
  if (/code_blue|code_pink|anaphylaxis|cardiac_arrest|suicide_risk/.test(reason)) return 4;
  // L3 urgent
  if (/critical_value|deterioration|sepsis|hypoglycaemia|stat_lab/.test(reason)) return 3;
  // L2 actionable
  if (/bp_high|follow_up_due|missed_dose|consultation_request/.test(reason)) return 2;
  // L1 routine
  if (/lab_result|rx_ready|invoice|booking_confirmation/.test(reason)) return 1;
  return 0;
}
