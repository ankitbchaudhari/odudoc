// AI Voice — clinical voice dictations & transcriptions. Tenant-scoped.
//
// A VoiceNote captures an audio dictation (or a pasted transcript) that can be
// attached to a patient / encounter / admission / surgery / radiology order.
// The AI pipeline flows:
//   recording → transcribing → transcribed → summarizing → summarized
//   (failed at any point)
//
// The transcript is the raw speech-to-text; the summary is a structured
// SOAP-style or operative-note rendering generated from the transcript.
// We store audio as a URL reference only (no binary blobs in the store).

import { bindPersistentArray } from "../persistent-array";

export type VoiceStatus =
  | "recording"
  | "transcribing"
  | "transcribed"
  | "summarizing"
  | "summarized"
  | "failed";

export type VoiceKind =
  | "soap"
  | "operative"
  | "radiology"
  | "discharge"
  | "handoff"
  | "progress"
  | "consult"
  | "other";

export type VoiceEntityType =
  | "encounter"
  | "admission"
  | "surgery"
  | "radiology"
  | "general";

export interface VoiceNote {
  id: string;
  organizationId: string;
  patientId?: string;
  entityType: VoiceEntityType;
  entityId?: string; // encounterId / admissionId / surgeryId / radiologyId
  kind: VoiceKind;
  title?: string;
  speaker?: string; // doctor / provider name
  language: string; // "en", "en-IN", "hi", etc.
  durationSec?: number;
  audioUrl?: string;
  transcript?: string;
  summary?: string;
  tags: string[];
  status: VoiceStatus;
  errorMessage?: string;
  recordedAt: string;
  createdAt: string;
  updatedAt: string;
}

const notes: VoiceNote[] = [];
const { hydrate, flush } = bindPersistentArray<VoiceNote>(
  "hospital-voice-notes",
  notes,
  () => []
);
await hydrate();

export function getNoteById(
  id: string,
  organizationId: string
): VoiceNote | null {
  const n = notes.find((x) => x.id === id);
  if (!n || n.organizationId !== organizationId) return null;
  return n;
}

export function listNotes(opts: {
  organizationId: string;
  patientId?: string;
  entityType?: VoiceEntityType;
  entityId?: string;
  kind?: VoiceKind;
  status?: VoiceStatus;
  search?: string;
}): VoiceNote[] {
  let list = notes.filter((n) => n.organizationId === opts.organizationId);
  if (opts.patientId) list = list.filter((n) => n.patientId === opts.patientId);
  if (opts.entityType) list = list.filter((n) => n.entityType === opts.entityType);
  if (opts.entityId) list = list.filter((n) => n.entityId === opts.entityId);
  if (opts.kind) list = list.filter((n) => n.kind === opts.kind);
  if (opts.status) list = list.filter((n) => n.status === opts.status);
  if (opts.search) {
    const q = opts.search.toLowerCase();
    list = list.filter(
      (n) =>
        (n.title || "").toLowerCase().includes(q) ||
        (n.speaker || "").toLowerCase().includes(q) ||
        (n.transcript || "").toLowerCase().includes(q) ||
        (n.summary || "").toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q))
    );
  }
  return list.sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
  );
}

export interface VoiceInput {
  patientId?: string;
  entityType?: VoiceEntityType;
  entityId?: string;
  kind?: VoiceKind;
  title?: string;
  speaker?: string;
  language?: string;
  durationSec?: number;
  audioUrl?: string;
  transcript?: string;
  summary?: string;
  tags?: string[];
  status?: VoiceStatus;
  recordedAt?: string;
}

export function createNote(organizationId: string, input: VoiceInput): VoiceNote {
  const now = new Date().toISOString();
  const initialStatus: VoiceStatus =
    input.status ||
    (input.summary?.trim()
      ? "summarized"
      : input.transcript?.trim()
      ? "transcribed"
      : input.audioUrl?.trim()
      ? "transcribing"
      : "recording");
  const n: VoiceNote = {
    id: `vn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    patientId: input.patientId || undefined,
    entityType: input.entityType || "general",
    entityId: input.entityId || undefined,
    kind: input.kind || "other",
    title: input.title?.trim() || undefined,
    speaker: input.speaker?.trim() || undefined,
    language: (input.language || "en").trim(),
    durationSec:
      typeof input.durationSec === "number" && input.durationSec >= 0
        ? Math.round(input.durationSec)
        : undefined,
    audioUrl: input.audioUrl?.trim() || undefined,
    transcript: input.transcript?.trim() || undefined,
    summary: input.summary?.trim() || undefined,
    tags: (input.tags || []).map((t) => t.trim()).filter(Boolean),
    status: initialStatus,
    recordedAt: input.recordedAt || now,
    createdAt: now,
    updatedAt: now,
  };
  notes.unshift(n);
  flush();
  return n;
}

export interface VoicePatch {
  patientId?: string | null;
  entityType?: VoiceEntityType;
  entityId?: string | null;
  kind?: VoiceKind;
  title?: string;
  speaker?: string;
  language?: string;
  durationSec?: number;
  audioUrl?: string;
  transcript?: string;
  summary?: string;
  tags?: string[];
  status?: VoiceStatus;
  errorMessage?: string;
}

export function updateNote(
  id: string,
  organizationId: string,
  patch: VoicePatch
): VoiceNote | null {
  const n = notes.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!n) return null;
  const now = new Date().toISOString();

  if (patch.patientId !== undefined) n.patientId = patch.patientId || undefined;
  if (patch.entityType !== undefined) n.entityType = patch.entityType;
  if (patch.entityId !== undefined) n.entityId = patch.entityId || undefined;
  if (patch.kind !== undefined) n.kind = patch.kind;
  if (patch.title !== undefined) n.title = patch.title?.trim() || undefined;
  if (patch.speaker !== undefined) n.speaker = patch.speaker?.trim() || undefined;
  if (patch.language !== undefined) n.language = patch.language.trim() || "en";
  if (patch.durationSec !== undefined)
    n.durationSec =
      typeof patch.durationSec === "number" && patch.durationSec >= 0
        ? Math.round(patch.durationSec)
        : undefined;
  if (patch.audioUrl !== undefined)
    n.audioUrl = patch.audioUrl?.trim() || undefined;
  if (patch.transcript !== undefined) n.transcript = patch.transcript;
  if (patch.summary !== undefined) n.summary = patch.summary;
  if (patch.tags !== undefined)
    n.tags = patch.tags.map((t) => t.trim()).filter(Boolean);
  if (patch.errorMessage !== undefined) n.errorMessage = patch.errorMessage;
  if (patch.status !== undefined) n.status = patch.status;

  // Auto-advance: populating transcript / summary bumps status.
  if (n.status !== "failed") {
    if (n.summary && n.summary.trim().length > 0) {
      n.status = "summarized";
    } else if (n.transcript && n.transcript.trim().length > 0) {
      if (n.status === "recording" || n.status === "transcribing") {
        n.status = "transcribed";
      }
    }
  }

  n.updatedAt = now;
  flush();
  return n;
}

export function deleteNote(id: string, organizationId: string): boolean {
  const i = notes.findIndex(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (i < 0) return false;
  notes.splice(i, 1);
  flush();
  return true;
}

export function deleteNotesForPatient(
  patientId: string,
  organizationId: string
): number {
  let removed = 0;
  for (let i = notes.length - 1; i >= 0; i--) {
    const n = notes[i];
    if (n.patientId === patientId && n.organizationId === organizationId) {
      notes.splice(i, 1);
      removed++;
    }
  }
  if (removed) flush();
  return removed;
}

// --- Lightweight local "AI" summarizer ---------------------------------------
// In production this would call an LLM; here we synthesize a SOAP-ish summary
// from the transcript using keyword heuristics. Deterministic, no network.
export function synthesizeSummary(
  transcript: string,
  kind: VoiceKind
): string {
  const t = transcript.trim();
  if (!t) return "";
  const lines = t
    .split(/[\n\r]+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const joined = lines.join(" ");

  function pick(re: RegExp): string | null {
    const m = joined.match(re);
    return m ? m[1].trim().replace(/[.;]+$/, "") : null;
  }

  const cc = pick(/(?:chief complaint|cc|complains? of)[:\s]+([^.]+)\./i);
  const hpi = pick(/(?:history|hpi)[:\s]+([^.]+\.[^.]*\.)/i);
  const exam = pick(/(?:exam|on examination|o\/e)[:\s]+([^.]+\.)/i);
  const assess = pick(/(?:assessment|impression|dx)[:\s]+([^.]+\.)/i);
  const plan = pick(/(?:plan|rx|advise[d]?)[:\s]+([^.]+\.?[^.]*\.?)/i);

  if (kind === "operative") {
    const proc = pick(/(?:procedure|operation)[:\s]+([^.]+\.)/i);
    const find = pick(/(?:findings?)[:\s]+([^.]+\.)/i);
    const parts: string[] = [];
    if (proc) parts.push(`Procedure: ${proc}.`);
    if (find) parts.push(`Findings: ${find}.`);
    if (plan) parts.push(`Post-op plan: ${plan}.`);
    return parts.join("\n") || t.slice(0, 400);
  }

  if (kind === "radiology") {
    const tech = pick(/(?:technique)[:\s]+([^.]+\.)/i);
    const find = pick(/(?:findings?)[:\s]+([^.]+\.)/i);
    const imp = pick(/(?:impression)[:\s]+([^.]+\.)/i);
    const parts: string[] = [];
    if (tech) parts.push(`Technique: ${tech}.`);
    if (find) parts.push(`Findings: ${find}.`);
    if (imp) parts.push(`Impression: ${imp}.`);
    return parts.join("\n") || t.slice(0, 400);
  }

  const parts: string[] = [];
  if (cc) parts.push(`S (Subjective): ${cc}.`);
  if (hpi) parts.push(`HPI: ${hpi}`);
  if (exam) parts.push(`O (Objective): ${exam}`);
  if (assess) parts.push(`A (Assessment): ${assess}`);
  if (plan) parts.push(`P (Plan): ${plan}`);
  if (parts.length === 0) {
    // Fallback: first sentence + bulletize any remaining clauses
    const first = joined.split(/\.(?:\s|$)/)[0];
    return first ? `${first}.` : t.slice(0, 400);
  }
  return parts.join("\n");
}
