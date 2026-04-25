// Firebase Cloud Messaging sender.
//
// Reuses the existing Firebase Admin app (originally set up for phone-auth
// ID-token verification — see lib/firebase-admin.ts). The same service-
// account credentials work for FCM as long as Cloud Messaging API is
// enabled in the GCP project.
//
// Two surfaces exposed:
//
//   sendToUser(userId, payload)
//     Fan-out — looks up every device token for the user and emits one
//     multicast send. Dead tokens are pruned automatically.
//
//   sendDataMessage(token, data)
//     Direct send for cases where the caller already has a single token.
//
// All sends are best-effort: failures are logged but don't propagate so
// callers in business logic (booking, order) aren't blocked on FCM
// availability.

import { getMessaging, type Messaging } from "firebase-admin/messaging";
import { getAdminApp, isAdminConfigured } from "./firebase-admin";
import {
  dropTokens,
  getTokensForUser,
  getTokensForEmail,
} from "./device-tokens-store";
import { log } from "./log";

let messaging: Messaging | null = null;

function getMessagingClient(): Messaging | null {
  if (!isAdminConfigured()) return null;
  if (messaging) return messaging;
  messaging = getMessaging(getAdminApp());
  return messaging;
}

export interface PushPayload {
  /** Notification title shown in the system tray. */
  title: string;
  /** Notification body. */
  body: string;
  /**
   * Deep-link path the app should open when the user taps. Convention:
   *   consult/{bookingId}
   *   order/{orderId}
   *   rx/{prescriptionId}
   * The Android service prepends "odudoc://" before launching the intent.
   */
  deepLink?: string;
  /** Free-form metadata — kept under FCM's 4KB data-payload limit. */
  data?: Record<string, string>;
  /** Channel on Android (must match a channel created in OduDocMessagingService). */
  channel?: "appointments" | "consults" | "orders" | "general";
}

function buildMulticast(tokens: string[], payload: PushPayload) {
  const data: Record<string, string> = {
    title: payload.title,
    body: payload.body,
    ...(payload.deepLink ? { deepLink: payload.deepLink } : {}),
    ...(payload.channel ? { channel: payload.channel } : {}),
    ...(payload.data || {}),
  };
  return {
    tokens,
    notification: { title: payload.title, body: payload.body },
    android: {
      priority: "high" as const,
      notification: {
        channelId: payload.channel || "general",
      },
    },
    data,
  };
}

export interface SendResult {
  attempted: number;
  succeeded: number;
  removedDeadTokens: number;
  skipped?: boolean;
}

export async function sendToUser(
  userId: string,
  payload: PushPayload
): Promise<SendResult> {
  const m = getMessagingClient();
  if (!m) {
    log.warn("fcm.skipped_admin_not_configured", { userId });
    return { attempted: 0, succeeded: 0, removedDeadTokens: 0, skipped: true };
  }
  const devices = await getTokensForUser(userId);
  if (devices.length === 0) return { attempted: 0, succeeded: 0, removedDeadTokens: 0 };

  return await dispatchMulticast(m, devices.map((d) => d.token), payload);
}

export async function sendToEmail(
  email: string,
  payload: PushPayload
): Promise<SendResult> {
  const m = getMessagingClient();
  if (!m) return { attempted: 0, succeeded: 0, removedDeadTokens: 0, skipped: true };
  const devices = await getTokensForEmail(email);
  if (devices.length === 0) return { attempted: 0, succeeded: 0, removedDeadTokens: 0 };
  return await dispatchMulticast(m, devices.map((d) => d.token), payload);
}

async function dispatchMulticast(
  m: Messaging,
  tokens: string[],
  payload: PushPayload
): Promise<SendResult> {
  try {
    const response = await m.sendEachForMulticast(buildMulticast(tokens, payload));
    const dead: string[] = [];
    response.responses.forEach((r, idx) => {
      if (r.success) return;
      const code = (r.error as { code?: string } | undefined)?.code;
      // FCM has stable error codes for permanent failures — only those
      // warrant pruning. Transient failures stay in the store.
      if (
        code === "messaging/registration-token-not-registered" ||
        code === "messaging/invalid-registration-token" ||
        code === "messaging/invalid-argument"
      ) {
        dead.push(tokens[idx]);
      } else {
        log.warn("fcm.partial_failure", { code });
      }
    });
    const removed = dead.length ? await dropTokens(dead) : 0;
    return {
      attempted: response.responses.length,
      succeeded: response.successCount,
      removedDeadTokens: removed,
    };
  } catch (err) {
    log.error("fcm.send_threw", err);
    return { attempted: tokens.length, succeeded: 0, removedDeadTokens: 0 };
  }
}
