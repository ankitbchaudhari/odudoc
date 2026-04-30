// Push-notification sender.
//
// Routes by token prefix:
//   - ExponentPushToken[*]  → Expo push (https://exp.host/--/api/v2/push/send)
//   - anything else         → assumed FCM, sent via FCM HTTP v1 if configured
//
// Most installs use Expo's free push service — it works on dev clients
// and Expo Go without any extra setup. FCM is a fallback for fully-
// ejected native builds; if FCM_SERVER_KEY isn't set we just skip
// non-Expo tokens with a warning.

import { getActiveTokens } from "./push-tokens-store";
import { log } from "./log";

export interface PushPayload {
  /** User to notify, by email. We resolve to active device tokens. */
  toEmail: string;
  /** Restrict to one app's devices ("doctor" / "patient"). */
  app?: "doctor" | "patient";
  /** Notification title (the bold first line). */
  title: string;
  /** Body text. */
  body: string;
  /** Arbitrary key-value data. Mobile receives it in the notification
   *  response and can deep-link. We always include `type` here. */
  data?: Record<string, string>;
  /** Override default sound. */
  sound?: "default" | null;
}

interface ExpoTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

interface ExpoResponse {
  data?: ExpoTicket | ExpoTicket[];
  errors?: Array<{ message?: string }>;
}

/** Send a push notification to every active device of the user. Best
 *  effort — failures are logged but never thrown to the caller. */
export async function sendPush(p: PushPayload): Promise<{ sent: number; skipped: number }> {
  const tokens = getActiveTokens(p.toEmail, p.app);
  if (tokens.length === 0) {
    return { sent: 0, skipped: 0 };
  }

  let sent = 0;
  let skipped = 0;

  // Bucket by transport
  const expoTokens = tokens.filter((t) => t.token.startsWith("ExponentPushToken["));
  const fcmTokens = tokens.filter((t) => !t.token.startsWith("ExponentPushToken["));

  if (expoTokens.length > 0) {
    try {
      const messages = expoTokens.map((t) => ({
        to: t.token,
        title: p.title,
        body: p.body,
        sound: p.sound === undefined ? "default" : p.sound,
        data: p.data || {},
        priority: "high",
      }));
      const r = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(messages),
      });
      if (!r.ok) {
        const text = await r.text().catch(() => "");
        log.warn("push.expo_http_error", { status: r.status, body: text.slice(0, 200) });
      } else {
        const json = (await r.json()) as ExpoResponse;
        const tickets = Array.isArray(json.data) ? json.data : json.data ? [json.data] : [];
        sent += tickets.filter((t) => t.status === "ok").length;
        const errs = tickets.filter((t) => t.status !== "ok");
        if (errs.length) log.warn("push.expo_some_failed", { errors: errs.slice(0, 3) });
      }
    } catch (err) {
      log.error("push.expo_threw", err);
    }
  }

  if (fcmTokens.length > 0) {
    const fcmKey = process.env.FCM_SERVER_KEY?.trim();
    if (!fcmKey) {
      log.warn("push.fcm_skipped_no_key", { count: fcmTokens.length });
      skipped += fcmTokens.length;
    } else {
      // Legacy FCM HTTP API. Fine for now; switch to HTTP v1 when this
      // gets real volume.
      for (const t of fcmTokens) {
        try {
          const r = await fetch("https://fcm.googleapis.com/fcm/send", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              authorization: `key=${fcmKey}`,
            },
            body: JSON.stringify({
              to: t.token,
              notification: { title: p.title, body: p.body, sound: "default" },
              data: p.data || {},
              priority: "high",
            }),
          });
          if (r.ok) sent += 1;
          else {
            const text = await r.text().catch(() => "");
            log.warn("push.fcm_http_error", { status: r.status, body: text.slice(0, 200) });
          }
        } catch (err) {
          log.error("push.fcm_threw", err);
        }
      }
    }
  }

  return { sent, skipped };
}
