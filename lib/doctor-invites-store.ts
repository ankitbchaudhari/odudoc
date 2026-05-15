// Doctor outreach invites — a record of every "we sent this doctor
// an invitation email" event the admin triggers from
// /admin/doctor-invites. Survives Lambda recycles via app_kv so the
// admin sees a real history list instead of a one-shot send.
//
// Linked to the registration flow: when a doctor signs up via
// /api/doctors/register, we look up any pending invite with the
// same email and flip its status to "registered" so the admin can
// see conversion in the same view.

import { bindPersistentArray } from "./persistent-array";

export type DoctorInviteStatus =
  | "sent"
  | "registered"
  | "bounced"
  | "cancelled";

export interface DoctorInvite {
  id: string;
  email: string;
  /** Optional display name — when admin pastes "Dr. Sathish, drsath@…"
   *  we store the name so the email greeting reads naturally. */
  name?: string;
  /** Optional specialty hint to personalise the email body. */
  specialty?: string;
  /** Optional country (ISO alpha-2) to drop India-only language
   *  about the IMC telemedicine rule on the apply form. */
  country?: string;
  /** Optional phone number in international format (with country
   *  code, e.g. +919876543210). When set, the admin UI offers a
   *  "Open WhatsApp" button that fires a wa.me click-to-chat link
   *  with a pre-filled invitation message. The platform never
   *  sends WhatsApp on the admin's behalf — they click Send in
   *  the WhatsApp app/web themselves. Keeps us cleanly outside
   *  Meta's bulk-messaging terms. */
  phone?: string;
  /** True once the admin has clicked the WhatsApp send link from
   *  the invite history. Heuristic — we can't actually verify
   *  Meta delivered the message, only that the admin took the
   *  action of opening the chat with our pre-filled text. */
  whatsappSentAt?: string;
  sentBy: string;
  sentAt: string;
  status: DoctorInviteStatus;
  registeredAt?: string;
  applicationId?: string;
  /** Free-form note the admin attaches at send-time — useful when
   *  outreach is grouped by campaign. */
  note?: string;
}

const invites: DoctorInvite[] = [];
const {
  hydrate: hydrateInvites,
  reload: reloadInvitesInternal,
} = bindPersistentArray<DoctorInvite>("doctor-invites", invites, () => []);

export async function reloadDoctorInvites(): Promise<void> {
  await reloadInvitesInternal();
}

function nowIso(): string {
  return new Date().toISOString();
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36).slice(-4)}`;
}

export interface CreateInviteInput {
  email: string;
  name?: string;
  specialty?: string;
  country?: string;
  phone?: string;
  sentBy: string;
  note?: string;
}

export async function createDoctorInvite(
  input: CreateInviteInput,
): Promise<DoctorInvite> {
  await hydrateInvites();
  const row: DoctorInvite = {
    id: uid("inv"),
    email: input.email.trim().toLowerCase(),
    name: input.name?.trim() || undefined,
    specialty: input.specialty?.trim() || undefined,
    country: input.country?.trim().toUpperCase() || undefined,
    phone: input.phone?.replace(/[^\d+]/g, "") || undefined,
    sentBy: input.sentBy.toLowerCase(),
    sentAt: nowIso(),
    status: "sent",
    note: input.note?.trim() || undefined,
  };
  invites.push(row);
  return row;
}

/** Stamp the WhatsApp-send action against an invite. Called from
 *  the admin UI when the admin clicks "Open WhatsApp". We can't
 *  observe the actual send but we record the moment they
 *  initiated it so the history shows two channels of outreach. */
export async function markInviteWhatsappSent(
  id: string,
): Promise<DoctorInvite | undefined> {
  await hydrateInvites();
  await reloadInvitesInternal();
  const idx = invites.findIndex((i) => i.id === id);
  if (idx === -1) return undefined;
  const next: DoctorInvite = {
    ...invites[idx],
    whatsappSentAt: nowIso(),
  };
  invites.splice(idx, 1, next);
  return next;
}

export async function listDoctorInvites(): Promise<DoctorInvite[]> {
  await hydrateInvites();
  return [...invites].sort((a, b) => b.sentAt.localeCompare(a.sentAt));
}

export async function findInviteByEmail(
  email: string,
): Promise<DoctorInvite | undefined> {
  await hydrateInvites();
  const normalised = email.trim().toLowerCase();
  // Most recent invite for this email — multiple are possible if
  // the admin re-sent.
  return invites
    .filter((i) => i.email === normalised)
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt))[0];
}

/** Called from the doctor registration flow to close the loop —
 *  if an invite was sent to this email, mark it as converted. */
export async function markInviteRegistered(
  email: string,
  applicationId: string,
): Promise<DoctorInvite | undefined> {
  await hydrateInvites();
  // Cross-Lambda freshness — admin issued the invite on Lambda A,
  // doctor's register click usually lands on Lambda B which hasn't
  // seen the invite row yet. Without this reload the conversion-
  // tracking column on /admin/doctor-invites stays "sent" forever.
  await reloadInvitesInternal();
  const normalised = email.trim().toLowerCase();
  const idx = invites
    .map((i, i2) => ({ i, i2 }))
    .filter(({ i }) => i.email === normalised && i.status === "sent")
    .sort((a, b) => b.i.sentAt.localeCompare(a.i.sentAt))[0];
  if (!idx) return undefined;
  const next: DoctorInvite = {
    ...idx.i,
    status: "registered",
    registeredAt: nowIso(),
    applicationId,
  };
  invites.splice(idx.i2, 1, next);
  return next;
}

export async function cancelInvite(id: string): Promise<DoctorInvite | undefined> {
  await hydrateInvites();
  await reloadInvitesInternal();
  const idx = invites.findIndex((i) => i.id === id);
  if (idx === -1) return undefined;
  const next: DoctorInvite = { ...invites[idx], status: "cancelled" };
  invites.splice(idx, 1, next);
  return next;
}

export interface InviteStats {
  total: number;
  sent: number;
  registered: number;
  conversionRate: number;
}

export async function getInviteStats(): Promise<InviteStats> {
  await hydrateInvites();
  const total = invites.length;
  const sent = invites.filter((i) => i.status === "sent").length;
  const registered = invites.filter((i) => i.status === "registered").length;
  const conversionRate = total > 0 ? Math.round((registered / total) * 100) : 0;
  return { total, sent, registered, conversionRate };
}
