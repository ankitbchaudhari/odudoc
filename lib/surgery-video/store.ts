// Live surgery video — provider-agnostic.
//
// STATUS: stub. Active only when env vars VIDEO_PROVIDER +
// VIDEO_INGEST_URL + VIDEO_API_KEY are set. The store records
// session metadata (who, when, which patient, which OT) and
// stores a hosted-video URL the provider hands back. We never
// proxy video bytes through this app.
//
// Storage shape lets a future provider plug-in implement the
// actual ingest:
//   - Cloudflare Stream → /lib/surgery-video/providers/cloudflare.ts
//   - Mux → /lib/surgery-video/providers/mux.ts
//   - LiveKit/Daily → SFU ingest
// All they need to do is upload + hand back a playback URL +
// recording URL; we record those.

import { bindPersistentArray } from "../persistent-array";
import { recordAuditEvent } from "../audit/store";

export type SessionStatus = "scheduled" | "live" | "completed" | "cancelled" | "failed";

export interface SurgeryVideoSession {
  id: string;
  organizationId: string;
  /** Surgery / OT room id from /lib/hospital/surgery-store etc.
   *  Free-text — we don't enforce FK. */
  surgeryId?: string;
  /** Patient consent record id pointing at /lib/consent-store. */
  consentRecordId: string;
  patientUserId: string;
  /** Lead surgeon email. */
  leadSurgeonEmail: string;
  /** Specialists who may stream + view live. */
  observerEmails: string[];
  /** Provider live-stream URL (HLS or WebRTC). */
  livePlaybackUrl?: string;
  /** Provider recording URL — populated after surgery ends. */
  recordingUrl?: string;
  /** Recording duration in seconds. */
  durationSeconds?: number;
  /** Bytes — informational. */
  bytes?: number;
  status: SessionStatus;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  /** Free-text — case notes attached at completion. */
  notes?: string;
}

const sessions: SurgeryVideoSession[] = [];
const { hydrate, flush, tombstone } = bindPersistentArray<SurgeryVideoSession>(
  "surgery_video_sessions",
  sessions,
  () => []
);
await hydrate();

export function isConfigured(): boolean {
  return !!(process.env.VIDEO_PROVIDER && process.env.VIDEO_INGEST_URL);
}

export function activeProvider(): string {
  return process.env.VIDEO_PROVIDER || "stub";
}

export interface CreateSessionInput {
  organizationId: string;
  surgeryId?: string;
  consentRecordId: string;
  patientUserId: string;
  leadSurgeonEmail: string;
  observerEmails?: string[];
  /** Pre-populated by the provider integration on creation. */
  livePlaybackUrl?: string;
}

export function createSession(input: CreateSessionInput): SurgeryVideoSession {
  const at = new Date().toISOString();
  const s: SurgeryVideoSession = {
    id: `sv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId: input.organizationId,
    surgeryId: input.surgeryId,
    consentRecordId: input.consentRecordId,
    patientUserId: input.patientUserId,
    leadSurgeonEmail: input.leadSurgeonEmail,
    observerEmails: (input.observerEmails || []).map((e) => e.trim()).filter(Boolean),
    livePlaybackUrl: input.livePlaybackUrl,
    status: "scheduled",
    createdAt: at,
  };
  sessions.unshift(s);
  flush();
  return s;
}

export function startSession(id: string, organizationId: string, livePlaybackUrl?: string): SurgeryVideoSession | null {
  const s = sessions.find((x) => x.id === id && x.organizationId === organizationId);
  if (!s) return null;
  s.status = "live";
  s.startedAt = new Date().toISOString();
  if (livePlaybackUrl) s.livePlaybackUrl = livePlaybackUrl;
  flush();
  return s;
}

export function endSession(id: string, organizationId: string, opts: { recordingUrl?: string; durationSeconds?: number; bytes?: number; notes?: string } = {}): SurgeryVideoSession | null {
  const s = sessions.find((x) => x.id === id && x.organizationId === organizationId);
  if (!s) return null;
  s.status = "completed";
  s.endedAt = new Date().toISOString();
  if (opts.recordingUrl) s.recordingUrl = opts.recordingUrl;
  if (opts.durationSeconds !== undefined) s.durationSeconds = opts.durationSeconds;
  if (opts.bytes !== undefined) s.bytes = opts.bytes;
  if (opts.notes !== undefined) s.notes = opts.notes;
  flush();
  return s;
}

export function cancelSession(id: string, organizationId: string): SurgeryVideoSession | null {
  const s = sessions.find((x) => x.id === id && x.organizationId === organizationId);
  if (!s) return null;
  s.status = "cancelled";
  s.endedAt = new Date().toISOString();
  flush();
  return s;
}

export interface ViewInput {
  id: string;
  viewerUserId: string;
  viewerEmail?: string;
  ip?: string;
}

/** Authorize + audit-log a viewer access. Returns the session if
 *  the viewer is the patient, the lead surgeon, or an observer. */
export function authorizeAndLogView(input: ViewInput): SurgeryVideoSession | null {
  const s = sessions.find((x) => x.id === input.id);
  if (!s) return null;
  const allowed =
    s.patientUserId === input.viewerUserId ||
    s.leadSurgeonEmail.toLowerCase() === (input.viewerEmail || "").toLowerCase() ||
    s.observerEmails.some((e) => e.toLowerCase() === (input.viewerEmail || "").toLowerCase());
  if (!allowed) return null;
  recordAuditEvent({
    actorUserId: input.viewerUserId,
    actorEmail: input.viewerEmail,
    actorRole: "doctor",
    subjectUserId: s.patientUserId,
    resource: "consultation",
    resourceId: s.id,
    action: "view",
    ip: input.ip,
    reason: "surgery video access",
    organizationId: s.organizationId,
  });
  return s;
}

export function listForOrg(organizationId: string, opts: { status?: SessionStatus; limit?: number } = {}): SurgeryVideoSession[] {
  let list = sessions.filter((s) => s.organizationId === organizationId);
  if (opts.status) list = list.filter((s) => s.status === opts.status);
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (opts.limit) list = list.slice(0, opts.limit);
  return list;
}

export function listForPatient(userId: string): SurgeryVideoSession[] {
  return sessions
    .filter((s) => s.patientUserId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function deleteVideosForOrg(organizationId: string): number {
  let n = 0;
  for (let i = sessions.length - 1; i >= 0; i--) {
    if (sessions[i].organizationId === organizationId) {
      tombstone(sessions[i].id);
      sessions.splice(i, 1);
      n++;
    }
  }
  if (n) flush();
  return n;
}
