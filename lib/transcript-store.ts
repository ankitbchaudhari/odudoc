// In-memory transcript store — same pattern as the presence store.
//
// Each room collects a list of captioned fragments. Each fragment is a
// short utterance (~5-15 words) produced by one side's Web Speech API
// recognition and POSTed to /api/rooms/[roomId]/transcript. The other
// side polls the same endpoint and renders the merged, role-labeled
// log in a side panel.
//
// Why not write to Postgres? Transcripts are transient (we surface
// them during the call + let the doctor copy/download them before the
// room ends). The live-call data doesn't need to persist beyond ~30min,
// and avoiding DB churn keeps the per-fragment latency tight. When we
// productise transcript retention we'll mirror the final log into the
// consultations table at call-end time.

import { randomUUID } from "crypto";

export type TranscriptRole = "doctor" | "patient";

export interface TranscriptFragment {
  id: string;
  role: TranscriptRole;
  speaker: string;
  text: string;
  // Epoch ms. Lets clients merge their own local fragments with the
  // server's authoritative ordering.
  ts: number;
}

interface RoomLog {
  fragments: TranscriptFragment[];
  updatedAt: number;
}

// roomId -> log. TTL eviction happens lazily on read/write.
const LOGS: Map<string, RoomLog> = new Map();
const ROOM_TTL_MS = 2 * 60 * 60_000; // 2h — far longer than any real call
const MAX_FRAGMENTS_PER_ROOM = 2000;

function gc() {
  const now = Date.now();
  for (const [k, v] of LOGS.entries()) {
    if (now - v.updatedAt > ROOM_TTL_MS) LOGS.delete(k);
  }
}

export function appendFragment(
  roomId: string,
  input: { role: TranscriptRole; speaker: string; text: string; ts?: number },
): TranscriptFragment {
  gc();
  let log = LOGS.get(roomId);
  if (!log) {
    log = { fragments: [], updatedAt: Date.now() };
    LOGS.set(roomId, log);
  }
  const frag: TranscriptFragment = {
    id: randomUUID(),
    role: input.role,
    speaker: input.speaker,
    text: input.text.trim(),
    ts: input.ts ?? Date.now(),
  };
  log.fragments.push(frag);
  // Cap runaway growth — drop oldest if we blow past the ceiling.
  if (log.fragments.length > MAX_FRAGMENTS_PER_ROOM) {
    log.fragments.splice(0, log.fragments.length - MAX_FRAGMENTS_PER_ROOM);
  }
  log.updatedAt = Date.now();
  return frag;
}

export function getFragments(roomId: string, sinceTs?: number): TranscriptFragment[] {
  gc();
  const log = LOGS.get(roomId);
  if (!log) return [];
  if (sinceTs == null) return [...log.fragments];
  return log.fragments.filter((f) => f.ts > sinceTs);
}

export function clearRoom(roomId: string): void {
  LOGS.delete(roomId);
}

export function getFullTranscriptText(roomId: string): string {
  const log = LOGS.get(roomId);
  if (!log) return "";
  return log.fragments
    .map((f) => `${f.speaker}: ${f.text}`)
    .join("\n");
}
