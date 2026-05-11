// Unified outbound notification dispatcher.
//
// Picks the right transport (SMS, WhatsApp, email) based on what the
// caller asks for and what the platform is configured to deliver. The
// rest of the app calls notify(...) instead of importing sms.ts /
// email.ts / whatsapp/dispatcher.ts directly, so:
//
//   • OTPs, vital alerts, appointment confirms, Rx-ready pings all
//     funnel through one audit point.
//   • Future channel additions (push, in-app, voice) plug in here.
//   • A single "test send" admin button hits one entry point.
//
// Provider configuration is checked at runtime — when Twilio/Resend
// env vars are absent, notify() returns { ok: true, skipped: true }
// so dev/preview flows don't explode.

import { sendSms, sendWhatsApp, isSmsConfigured } from "@/lib/sms";
import { sendEmail, type Sender as EmailSender } from "@/lib/email";

export type NotifyChannel = "sms" | "whatsapp" | "email";

export interface NotifyInput {
  channel: NotifyChannel;
  /** E.164 phone for sms/whatsapp; email address for email. */
  to: string;
  /** Required for email. Ignored for sms/whatsapp. */
  subject?: string;
  /** Text/markdown body. Email also accepts html via `html`. */
  body: string;
  html?: string;
  /** Email sender mailbox. Defaults to "notifications". */
  emailFrom?: EmailSender;
  /** Optional category for audit/logging. */
  category?:
    | "appointment"
    | "reminder"
    | "result"
    | "billing"
    | "marketing"
    | "alert"
    | "discharge"
    | "vaccination"
    | "otp"
    | "generic";
}

export interface NotifyResult {
  ok: boolean;
  channel: NotifyChannel;
  /** Provider-side message ID (Twilio SID or Resend ID). */
  providerId?: string;
  /** True when no provider creds configured — message was a no-op. */
  skipped?: boolean;
  error?: string;
}

export function isChannelConfigured(channel: NotifyChannel): boolean {
  switch (channel) {
    case "sms":
      return isSmsConfigured() && !!process.env.TWILIO_FROM_NUMBER;
    case "whatsapp":
      return isSmsConfigured() && !!process.env.TWILIO_WHATSAPP_FROM;
    case "email":
      return !!process.env.RESEND_API_KEY;
  }
}

export async function notify(input: NotifyInput): Promise<NotifyResult> {
  if (input.channel === "sms") {
    const r = await sendSms(input.to, input.body);
    return {
      ok: r.ok,
      channel: "sms",
      providerId: r.sid,
      skipped: r.skipped,
      error: r.error,
    };
  }

  if (input.channel === "whatsapp") {
    const r = await sendWhatsApp(input.to, input.body);
    return {
      ok: r.ok,
      channel: "whatsapp",
      providerId: r.sid,
      skipped: r.skipped,
      error: r.error,
    };
  }

  // email
  if (!input.subject) {
    return { ok: false, channel: "email", error: "missing_subject" };
  }
  const r = await sendEmail({
    from: input.emailFrom ?? "notifications",
    to: input.to,
    subject: input.subject,
    html: input.html ?? defaultEmailHtml(input.subject, input.body),
    text: input.body,
  });
  return {
    ok: r.ok,
    channel: "email",
    providerId: r.id,
    skipped: r.skipped,
    error: r.error,
  };
}

/** Fan-out helper: try preferred channels in order until one delivers. */
export async function notifyWithFallback(
  channels: NotifyChannel[],
  input: Omit<NotifyInput, "channel">
): Promise<NotifyResult> {
  let lastErr: NotifyResult | undefined;
  for (const ch of channels) {
    if (!isChannelConfigured(ch)) continue;
    const r = await notify({ ...input, channel: ch });
    if (r.ok && !r.skipped) return r;
    lastErr = r;
  }
  return lastErr ?? { ok: false, channel: channels[0], error: "no_channel_configured" };
}

function defaultEmailHtml(subject: string, body: string): string {
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
  return `<!doctype html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
    <h1 style="font-size:18px;font-weight:600;margin:0 0 12px">${subject}</h1>
    <div style="font-size:14px;line-height:1.55;color:#334155">${escaped}</div>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
    <p style="font-size:11px;color:#94a3b8;margin:0">Sent by OduDoc · <a href="https://www.odudoc.com" style="color:#6366f1">www.odudoc.com</a></p>
  </body></html>`;
}
