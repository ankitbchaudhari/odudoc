// Voice-call appointment bot — provider-agnostic interface.
//
// STATUS: stub. Active only when env vars VOICE_BOT_PROVIDER +
// VOICE_BOT_API_KEY are set. Without them every method returns
// { ok: false, error: "voice_bot_not_configured" } so callers
// can degrade gracefully (web booking fallback).
//
// Provider plug-in shape: implement startCall, transcribeFragment,
// endCall in /lib/voice-bot/providers/<name>.ts and add the name
// to Provider below.

import { bindPersistentArray } from "../persistent-array";

export type Provider = "twilio" | "exotel" | "vonage" | "stub";

export type CallIntent =
  | "book_appointment"
  | "cancel_appointment"
  | "reschedule"
  | "callback_request"
  | "lab_result_question"
  | "rx_refill"
  | "general";

export type CallStatus = "ringing" | "in_progress" | "completed" | "failed" | "voicemail";

export interface CallSession {
  id: string;
  /** External call SID issued by the provider. Empty in stub mode. */
  providerSid: string;
  provider: Provider;
  /** E.164 phone number that initiated the call. */
  fromPhone: string;
  toPhone?: string;
  /** Resolved patient userId — null when phone doesn't match a user. */
  patientUserId?: string;
  intent?: CallIntent;
  status: CallStatus;
  /** Free-text transcript accumulated across IVR prompts + replies. */
  transcript: Array<{ role: "bot" | "patient"; text: string; at: string }>;
  /** Outcome the bot surfaces to the patient + the back office. */
  outcomeJson?: string;
  createdAt: string;
  endedAt?: string;
}

const sessions: CallSession[] = [];
const { hydrate, flush, tombstone } = bindPersistentArray<CallSession>(
  "voice_bot_sessions",
  sessions,
  () => []
);
await hydrate();

export function isConfigured(): boolean {
  return !!(process.env.VOICE_BOT_PROVIDER && process.env.VOICE_BOT_API_KEY);
}

export function activeProvider(): Provider {
  return (process.env.VOICE_BOT_PROVIDER as Provider) || "stub";
}

export interface StartCallInput {
  fromPhone: string;
  toPhone?: string;
  patientUserId?: string;
}

export type StartCallResult =
  | { ok: true; session: CallSession }
  | { ok: false; error: string };

export function startCall(input: StartCallInput): StartCallResult {
  const at = new Date().toISOString();
  const s: CallSession = {
    id: `call-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    providerSid: "",
    provider: activeProvider(),
    fromPhone: input.fromPhone,
    toPhone: input.toPhone,
    patientUserId: input.patientUserId,
    status: "ringing",
    transcript: [],
    createdAt: at,
  };
  sessions.unshift(s);
  flush();
  // Provider call would happen here. In stub mode we just open the
  // session — the front office can then watch transcript events
  // arrive via webhook (also a stub).
  return { ok: true, session: s };
}

export interface AppendFragmentInput {
  callId: string;
  role: "bot" | "patient";
  text: string;
}

export function appendFragment(input: AppendFragmentInput): CallSession | null {
  const s = sessions.find((x) => x.id === input.callId);
  if (!s) return null;
  s.transcript.push({ role: input.role, text: input.text.trim(), at: new Date().toISOString() });
  if (s.status === "ringing") s.status = "in_progress";
  flush();
  return s;
}

export interface EndCallInput {
  callId: string;
  outcome?: object;
  status?: CallStatus;
}

export function endCall(input: EndCallInput): CallSession | null {
  const s = sessions.find((x) => x.id === input.callId);
  if (!s) return null;
  s.endedAt = new Date().toISOString();
  s.status = input.status || "completed";
  if (input.outcome) s.outcomeJson = JSON.stringify(input.outcome);
  flush();
  return s;
}

export function listSessions(opts: { patientUserId?: string; status?: CallStatus; limit?: number } = {}): CallSession[] {
  let list = [...sessions];
  if (opts.patientUserId) list = list.filter((s) => s.patientUserId === opts.patientUserId);
  if (opts.status) list = list.filter((s) => s.status === opts.status);
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (opts.limit) list = list.slice(0, opts.limit);
  return list;
}

export function getCall(id: string): CallSession | null {
  return sessions.find((s) => s.id === id) || null;
}

export function deleteCallsForUser(userId: string): number {
  let n = 0;
  for (let i = sessions.length - 1; i >= 0; i--) {
    if (sessions[i].patientUserId === userId) {
      tombstone(sessions[i].id);
      sessions.splice(i, 1);
      n++;
    }
  }
  if (n) flush();
  return n;
}
