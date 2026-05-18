// Notification dispatch queue with escalation. Persistent so a
// pending escalation survives Lambda recycles.
//
// Each dispatch row is one (recipient, channel, attempt). The
// scheduler / cron walks the queue every minute, fires anything
// due, and inserts the next escalation rung if the window expired
// without acknowledgement.
//
// Real fan-out (Twilio / FCM / Resend) happens in lib/sms.ts,
// lib/email.ts, lib/fcm.ts — this module is the policy layer.

import { bindPersistentArray } from "../persistent-array";
import { defaultLevelFor, profileFor, type EscalationLevel } from "./escalation";

export type DispatchChannel = "in_app" | "push" | "sms" | "whatsapp" | "voice" | "email";
export type DispatchState = "queued" | "delivering" | "delivered" | "acknowledged" | "escalated" | "failed";

export interface NotificationDispatch {
  id: string;
  /** Tenant scope (for cross-tenant audit + filtering). */
  organizationId?: string;
  /** Logical "event" id — shared across the rungs of an escalation
   *  so we can mark all sibling dispatches acknowledged when one
   *  recipient picks up. */
  eventKey: string;
  /** Why the system is paging. Drives the default level if none
   *  was supplied. */
  reason: string;
  level: EscalationLevel;
  /** Recipient — email or phone or user id, channel-dependent. */
  recipient: string;
  channel: DispatchChannel;
  /** Free-text payload. SMS = body. Email = body. Voice = TTS text. */
  body: string;
  /** When this rung was queued. */
  queuedAt: string;
  /** When it actually fired (or null if still pending). */
  firedAt?: string;
  /** When the recipient acknowledged. */
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  state: DispatchState;
  /** Escalation rung — 0 is the initial dispatch, 1+ are escalations. */
  rung: number;
  /** When the next escalation fires if no ack. */
  escalateAt?: string;
}

const queue: NotificationDispatch[] = [];
const { hydrate, flush } = bindPersistentArray<NotificationDispatch>(
  "notification_dispatches",
  queue,
  () => [],
);
await hydrate();

function id(p: string): string {
  return `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Queue an event for dispatch. Multiple rows get created — one per
 *  configured channel for the level. Returns the eventKey so the
 *  publisher can later acknowledge / cancel the whole escalation. */
export function publishEvent(input: {
  organizationId?: string;
  reason: string;
  level?: EscalationLevel;
  recipients: Array<{ recipient: string; channel: DispatchChannel }>;
  body: string;
  /** Optional eventKey if the caller wants to dedupe; auto-generated
   *  if absent. */
  eventKey?: string;
}): string {
  const eventKey = input.eventKey || id("evt");
  const level = input.level ?? (defaultLevelFor(input.reason) as EscalationLevel);
  const profile = profileFor(level);
  const queuedAt = new Date().toISOString();
  const escalateAt = profile.windowMinutes > 0
    ? new Date(Date.now() + profile.windowMinutes * 60_000).toISOString()
    : undefined;

  for (const r of input.recipients) {
    queue.push({
      id: id("disp"),
      organizationId: input.organizationId,
      eventKey,
      reason: input.reason,
      level,
      recipient: r.recipient,
      channel: r.channel,
      body: input.body,
      queuedAt,
      state: "queued",
      rung: 0,
      escalateAt,
    });
  }
  flush();
  return eventKey;
}

/** Mark this event acknowledged — clears all sibling rows in the
 *  same eventKey so escalations stop firing. */
export function acknowledgeEvent(eventKey: string, by: string): NotificationDispatch[] {
  const at = new Date().toISOString();
  const touched: NotificationDispatch[] = [];
  for (const d of queue) {
    if (d.eventKey === eventKey && d.state !== "acknowledged" && d.state !== "delivered") {
      d.state = "acknowledged";
      d.acknowledgedAt = at;
      d.acknowledgedBy = by;
      touched.push(d);
    }
  }
  flush();
  return touched;
}

/** Cron entrypoint — process all due dispatches. Returns counts. */
export function tick(now: number = Date.now()): { fired: number; escalated: number } {
  let fired = 0;
  let escalated = 0;
  const due = queue.filter(
    (d) => d.state === "queued" && new Date(d.queuedAt).getTime() <= now,
  );
  for (const d of due) {
    // Real fan-out would call lib/sms etc here. For MVP we just
    // mark delivered so the state machine progresses; the channel
    // adapters live in lib/notifications/notify.ts and already
    // accept this dispatch shape.
    d.state = "delivered";
    d.firedAt = new Date(now).toISOString();
    fired++;
  }
  // Escalation: any unack'd rung whose escalateAt has passed.
  const overdue = queue.filter(
    (d) =>
      d.state === "delivered" &&
      d.escalateAt &&
      new Date(d.escalateAt).getTime() <= now &&
      d.rung < 4,
  );
  for (const d of overdue) {
    const newLevel = Math.min(4, d.level + 1) as EscalationLevel;
    const profile = profileFor(newLevel);
    d.state = "escalated";
    queue.push({
      id: id("disp"),
      organizationId: d.organizationId,
      eventKey: d.eventKey,
      reason: d.reason,
      level: newLevel,
      recipient: d.recipient,
      channel: d.channel,
      body: `[ESCALATED] ${d.body}`,
      queuedAt: new Date(now).toISOString(),
      state: "queued",
      rung: d.rung + 1,
      escalateAt: profile.windowMinutes > 0
        ? new Date(now + profile.windowMinutes * 60_000).toISOString()
        : undefined,
    });
    escalated++;
  }
  if (fired || escalated) flush();
  return { fired, escalated };
}

export function listPending(eventKey?: string): NotificationDispatch[] {
  return queue.filter((d) =>
    (eventKey ? d.eventKey === eventKey : true) &&
    d.state !== "acknowledged" &&
    d.state !== "failed",
  );
}
