// Memberships link users to organizations with a per-org role.
// A user can belong to multiple orgs (e.g. a doctor consulting for two
// hospitals). The current "active" org is stored client-side (cookie/
// session) and read by tenant.getCurrentOrg().

import { bindPersistentArray } from "./persistent-array";

export type OrgRole =
  | "owner" // Full control, billing, can delete org
  | "admin" // Manages staff, modules, settings (org-wide)
  | "branch_admin" // Same admin scope but locked to membership.branchId
  | "hr" // HR ops only (careers, applications, staff, employee-health)
  | "doctor" // Clinical role
  | "nurse"
  | "receptionist"
  | "lab_tech"
  | "pharmacist"
  | "accountant"
  | "staff"; // Generic fallback

export interface Membership {
  id: string;
  userId: string;
  organizationId: string;
  role: OrgRole;
  /** Optional branch the member belongs to. null/undefined = org-wide
   *  membership (owner, admin, hr typically). Set for branch_admin
   *  and any branch-pinned staff (a receptionist at the Bandra
   *  clinic). When set, branch-aware data filters scope the user's
   *  reads/writes to that branch. */
  branchId?: string | null;
  title?: string;
  createdAt: string;
}

const memberships: Membership[] = [];
const {
  hydrate,
  reload: reloadMembershipsInternal,
  flush,
  // Same merge-before-save bug as organizations-store: deletes need
  // to mark the id as a tombstone or mergingSave() re-pulls the row.
  tombstone,
} = bindPersistentArray<Membership>(
  "memberships",
  memberships,
  () => []
);
await hydrate();

export async function reloadMemberships() {
  await reloadMembershipsInternal();
}

export function listMemberships(): Membership[] {
  return [...memberships];
}

export function getMembershipsForUser(userId: string): Membership[] {
  return memberships.filter((m) => m.userId === userId);
}

export function getMembershipsForOrg(organizationId: string): Membership[] {
  return memberships.filter((m) => m.organizationId === organizationId);
}

export function getMembership(userId: string, organizationId: string): Membership | null {
  return (
    memberships.find((m) => m.userId === userId && m.organizationId === organizationId) || null
  );
}

export function createMembership(input: {
  userId: string;
  organizationId: string;
  role: OrgRole;
  title?: string;
}): Membership {
  const existing = getMembership(input.userId, input.organizationId);
  if (existing) {
    existing.role = input.role;
    if (input.title !== undefined) existing.title = input.title;
    flush();
    return existing;
  }
  const m: Membership = {
    id: `mem-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    userId: input.userId,
    organizationId: input.organizationId,
    role: input.role,
    title: input.title,
    createdAt: new Date().toISOString(),
  };
  memberships.push(m);
  flush();
  return m;
}

export function updateMembership(
  id: string,
  patch: Partial<Pick<Membership, "role" | "title">>
): Membership | null {
  const m = memberships.find((x) => x.id === id);
  if (!m) return null;
  if (patch.role !== undefined) m.role = patch.role;
  if (patch.title !== undefined) m.title = patch.title;
  flush();
  return m;
}

export function deleteMembership(id: string): boolean {
  const i = memberships.findIndex((m) => m.id === id);
  if (i < 0) return false;
  memberships.splice(i, 1);
  tombstone(id);
  flush();
  return true;
}

export function deleteMembershipsForOrg(organizationId: string): number {
  const removed: string[] = [];
  for (let i = memberships.length - 1; i >= 0; i--) {
    if (memberships[i].organizationId === organizationId) {
      removed.push(memberships[i].id);
      memberships.splice(i, 1);
    }
  }
  for (const id of removed) tombstone(id);
  if (removed.length > 0) flush();
  return removed.length;
}
