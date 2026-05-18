// Family permission levels. Spec v6.0 Patient Dashboard §7 / spec
// "Family · 3 permission levels (Primary / Caregiver / Observer)".
//
// The owner of a family account can invite additional adults to
// collaborate on a dependent's care (typically the other parent, a
// grandparent, or a hired care manager). Each collaborator gets one
// of three permission levels:
//
//   PRIMARY    — full edit on the dependent's record. Can book, can
//                fill medical history, can grant consent to providers,
//                can add other collaborators, can remove the
//                dependent. Co-primary handles shared custody.
//   CAREGIVER  — view full record + book appointments + add vitals,
//                but cannot grant consent, cannot add/remove
//                collaborators, cannot delete records.
//   OBSERVER   — read-only. Can see appointments, prescriptions,
//                lab reports. Cannot book, cannot grant consent.
//
// Every action that would be blocked by the level surfaces the
// reason on the UI so the collaborator knows to ask the owner.

import { bindPersistentArray } from "./persistent-array";

export type FamilyPermission = "primary" | "caregiver" | "observer";

export interface FamilyAccess {
  id: string;
  /** Account owner whose family is being shared. */
  ownerEmail: string;
  /** Dependent the access is scoped to (a specific child / parent
   *  / spouse). Use the dependent id from lib/family-store. */
  dependentId: string;
  /** Collaborator's email (must match a User on sign-in). */
  collaboratorEmail: string;
  /** Optional human label set by the owner. */
  collaboratorLabel?: string;
  level: FamilyPermission;
  /** Invite acceptance flow. */
  invitedAt: string;
  invitedBy: string;
  acceptedAt?: string;
  revokedAt?: string;
  revokedBy?: string;
}

const accesses: FamilyAccess[] = [];
const { hydrate, flush } = bindPersistentArray<FamilyAccess>(
  "family_access_grants",
  accesses,
  () => [],
);
await hydrate();

function id(p: string): string {
  return `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function inviteCollaborator(input: {
  ownerEmail: string;
  dependentId: string;
  collaboratorEmail: string;
  collaboratorLabel?: string;
  level: FamilyPermission;
}): FamilyAccess {
  const at = new Date().toISOString();
  const access: FamilyAccess = {
    id: id("fac"),
    ownerEmail: input.ownerEmail.toLowerCase().trim(),
    dependentId: input.dependentId,
    collaboratorEmail: input.collaboratorEmail.toLowerCase().trim(),
    collaboratorLabel: input.collaboratorLabel,
    level: input.level,
    invitedAt: at,
    invitedBy: input.ownerEmail.toLowerCase().trim(),
  };
  accesses.unshift(access);
  flush();
  return access;
}

export function acceptInvite(accessId: string, collaboratorEmail: string): FamilyAccess | null {
  const a = accesses.find((x) => x.id === accessId);
  if (!a || a.acceptedAt || a.revokedAt) return null;
  if (a.collaboratorEmail !== collaboratorEmail.toLowerCase().trim()) return null;
  a.acceptedAt = new Date().toISOString();
  flush();
  return a;
}

export function revokeAccess(accessId: string, revokedBy: string): FamilyAccess | null {
  const a = accesses.find((x) => x.id === accessId);
  if (!a || a.revokedAt) return null;
  a.revokedAt = new Date().toISOString();
  a.revokedBy = revokedBy;
  flush();
  return a;
}

/** Look up effective permission for a user on a specific dependent.
 *  Returns null if no relationship; "primary" if owner; or the
 *  granted level if a collaborator. */
export function getEffectivePermission(input: {
  /** Email of the actor making the request. */
  actorEmail: string;
  /** Owner of the dependent. */
  ownerEmail: string;
  /** Dependent in scope. */
  dependentId: string;
}): FamilyPermission | null {
  const actor = input.actorEmail.toLowerCase().trim();
  const owner = input.ownerEmail.toLowerCase().trim();
  if (actor === owner) return "primary";
  const a = accesses.find(
    (x) =>
      x.ownerEmail === owner &&
      x.dependentId === input.dependentId &&
      x.collaboratorEmail === actor &&
      x.acceptedAt &&
      !x.revokedAt,
  );
  return a?.level || null;
}

/** Action gate — returns true if the level permits this action.
 *  Used by every dependent-mutation endpoint. */
export type FamilyAction =
  | "view"
  | "book_appointment"
  | "add_vital"
  | "edit_history"
  | "grant_consent"
  | "add_collaborator"
  | "remove_dependent";

const POLICY: Record<FamilyAction, FamilyPermission[]> = {
  view:                ["primary", "caregiver", "observer"],
  book_appointment:    ["primary", "caregiver"],
  add_vital:           ["primary", "caregiver"],
  edit_history:        ["primary"],
  grant_consent:       ["primary"],
  add_collaborator:    ["primary"],
  remove_dependent:    ["primary"],
};

export function isActionAllowed(level: FamilyPermission | null, action: FamilyAction): boolean {
  if (!level) return false;
  return POLICY[action].includes(level);
}

export function listAccessesForDependent(ownerEmail: string, dependentId: string): FamilyAccess[] {
  return accesses.filter(
    (a) => a.ownerEmail === ownerEmail.toLowerCase().trim() && a.dependentId === dependentId && !a.revokedAt,
  );
}

export function listInvitesForCollaborator(collaboratorEmail: string): FamilyAccess[] {
  return accesses.filter(
    (a) =>
      a.collaboratorEmail === collaboratorEmail.toLowerCase().trim() &&
      !a.revokedAt &&
      !a.acceptedAt,
  );
}
