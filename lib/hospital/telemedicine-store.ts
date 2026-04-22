// Telemedicine — video / phone / chat consults. Tenant-scoped.
// Single-entity TeleConsult. Lifecycle: scheduled -> in_progress -> completed / no_show / cancelled.
// Detach-only cascade (clinical encounter record).

import { bindPersistentArray } from "../persistent-array";

export type ConsultMode = "video" | "audio" | "chat" | "async";
export type ConsultStatus = "scheduled" | "in_progress" | "completed" | "no_show" | "cancelled" | "tech_failed";
export type ConnectivityQuality = "excellent" | "good" | "fair" | "poor";

export interface Prescription {
  medication: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
}

export interface TeleConsult {
  id: string;                         // TELE-{suffix}-{seq}
  organizationId: string;
  patientId: string;
  patientName: string;
  providerName: string;
  providerId?: string;
  specialty?: string;
  mode: ConsultMode;
  status: ConsultStatus;
  scheduledAt: string;
  startedAt?: string;
  endedAt?: string;
  durationMin?: number;
  platform?: string;                   // "Jitsi", "Zoom", "WhatsApp"
  meetingUrl?: string;
  meetingId?: string;
  chiefComplaint?: string;
  historyNote?: string;
  examNote?: string;
  assessment?: string;
  plan?: string;
  prescriptions?: Prescription[];
  followUpDate?: string;
  referralNote?: string;
  connectivityQuality?: ConnectivityQuality;
  consentRecorded: boolean;
  patientLocation?: string;
  identityVerified?: boolean;
  feeAmount?: number;
  feePaid?: boolean;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}

const consults: TeleConsult[] = [];
const hydrate = bindPersistentArray<TeleConsult>("telemed-consults", consults, () => []);
await hydrate;

export const MODE_LABEL: Record<ConsultMode, string> = {
  video: "Video", audio: "Audio", chat: "Chat", async: "Async",
};
export const STATUS_LABEL: Record<ConsultStatus, string> = {
  scheduled: "Scheduled", in_progress: "In progress", completed: "Completed",
  no_show: "No show", cancelled: "Cancelled", tech_failed: "Tech failed",
};

function suf(o: string) { return o.slice(0, 4).toUpperCase(); }
function nextId(o: string) {
  const p = `TELE-${suf(o)}-`;
  const m = consults.filter((c) => c.id.startsWith(p)).reduce((mx, c) => Math.max(mx, Number(c.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}

export function listConsults(opts: { organizationId: string; status?: ConsultStatus; mode?: ConsultMode; patientId?: string; providerId?: string; from?: string; to?: string }): TeleConsult[] {
  return consults.filter((c) => c.organizationId === opts.organizationId)
    .filter((c) => (opts.status ? c.status === opts.status : true))
    .filter((c) => (opts.mode ? c.mode === opts.mode : true))
    .filter((c) => (opts.patientId ? c.patientId === opts.patientId : true))
    .filter((c) => (opts.providerId ? c.providerId === opts.providerId : true))
    .filter((c) => (opts.from ? c.scheduledAt >= opts.from : true))
    .filter((c) => (opts.to ? c.scheduledAt <= opts.to : true))
    .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
}

export function createConsult(orgId: string, input: Partial<TeleConsult>): { ok: true; consult: TeleConsult } | { ok: false; error: string } {
  if (!input.patientId || !input.patientName || !input.providerName || !input.scheduledAt) return { ok: false, error: "missing_required" };
  const now = new Date().toISOString();
  const c: TeleConsult = {
    id: nextId(orgId), organizationId: orgId,
    patientId: input.patientId, patientName: input.patientName,
    providerName: input.providerName, providerId: input.providerId, specialty: input.specialty,
    mode: (input.mode || "video") as ConsultMode,
    status: "scheduled",
    scheduledAt: input.scheduledAt,
    platform: input.platform, meetingUrl: input.meetingUrl, meetingId: input.meetingId,
    chiefComplaint: input.chiefComplaint,
    consentRecorded: !!input.consentRecorded,
    patientLocation: input.patientLocation,
    feeAmount: input.feeAmount, feePaid: !!input.feePaid,
    prescriptions: input.prescriptions || [],
    createdAt: now, updatedAt: now,
  };
  consults.push(c);
  return { ok: true, consult: c };
}

export function updateConsult(id: string, orgId: string, patch: Partial<TeleConsult>): TeleConsult | null {
  const i = consults.findIndex((c) => c.id === id && c.organizationId === orgId);
  if (i < 0) return null;
  const prev = consults[i];
  const now = new Date().toISOString();
  const next: TeleConsult = { ...prev, ...patch, id: prev.id, organizationId: prev.organizationId, updatedAt: now };
  if (next.status === "in_progress" && prev.status !== "in_progress" && !next.startedAt) next.startedAt = now;
  if (next.status === "completed" && prev.status !== "completed" && !next.endedAt) {
    next.endedAt = now;
    if (next.startedAt) next.durationMin = Math.round((new Date(next.endedAt).getTime() - new Date(next.startedAt).getTime()) / 60000);
  }
  consults[i] = next;
  return next;
}

export function deleteConsult(id: string, orgId: string): boolean {
  const i = consults.findIndex((c) => c.id === id && c.organizationId === orgId);
  if (i < 0) return false;
  consults.splice(i, 1);
  return true;
}

export function computeStats(orgId: string) {
  const my = consults.filter((c) => c.organizationId === orgId);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const scheduledToday = my.filter((c) => c.status === "scheduled" && c.scheduledAt >= todayStart && c.scheduledAt < todayEnd).length;
  const inProgress = my.filter((c) => c.status === "in_progress").length;
  const completedMonth = my.filter((c) => c.status === "completed" && c.scheduledAt >= monthStart).length;
  const noShowMonth = my.filter((c) => c.status === "no_show" && c.scheduledAt >= monthStart).length;
  const cancelledMonth = my.filter((c) => c.status === "cancelled" && c.scheduledAt >= monthStart).length;
  const techFailedMonth = my.filter((c) => c.status === "tech_failed" && c.scheduledAt >= monthStart).length;
  const completedPool = my.filter((c) => c.status === "completed" && c.scheduledAt >= monthStart && c.durationMin != null);
  const avgDurationMin = completedPool.length ? Math.round(completedPool.reduce((s, c) => s + (c.durationMin || 0), 0) / completedPool.length) : 0;
  const revenue = my.filter((c) => c.feePaid && c.scheduledAt >= monthStart).reduce((s, c) => s + (c.feeAmount || 0), 0);
  const total = completedMonth + noShowMonth + cancelledMonth + techFailedMonth;
  const noShowRate = total > 0 ? Math.round((noShowMonth / total) * 100) : 0;
  return { scheduledToday, inProgress, completedMonth, noShowMonth, cancelledMonth, techFailedMonth, avgDurationMin, revenue, noShowRate };
}

export function unlinkTelemedForPatient(patientId: string, orgId: string): void {
  for (const c of consults) {
    if (c.organizationId === orgId && c.patientId === patientId) {
      c.patientId = "";
      c.patientName = `[removed] ${c.patientName}`;
      c.updatedAt = new Date().toISOString();
    }
  }
  // flush:auto-unlink
  consults.splice(consults.length, 0);
}
