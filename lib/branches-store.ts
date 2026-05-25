// Branches: a hospital / lab / pharmacy organisation can have many
// physical locations. Memberships carry an optional branchId so a
// "branch_admin" sees only their location's data while the org-level
// "owner" / "admin" / "hr" see across all branches.
//
// V1: store + CRUD. Wiring every per-org admin page to honor the
// branchId scope is incremental — each module adds its own filter as
// it adopts branch-aware data.

import { bindPersistentArray } from "./persistent-array";

export type BranchStatus = "active" | "inactive";

export interface Branch {
  id: string;
  organizationId: string;
  /** Short, admin-defined display name — "Andheri West", "Bandra HQ". */
  name: string;
  /** Optional short code admin can use when assigning staff or
   *  encoding into receipts. Free text. */
  code?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  status: BranchStatus;
  createdAt: string;
  updatedAt: string;
}

const branches: Branch[] = [];
const { hydrate, flush } = bindPersistentArray<Branch>(
  "branches",
  branches,
  () => []
);
await hydrate();

export function listBranches(opts: {
  organizationId: string;
  status?: BranchStatus;
}): Branch[] {
  let list = branches.filter((b) => b.organizationId === opts.organizationId);
  if (opts.status) list = list.filter((b) => b.status === opts.status);
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

export function getBranchById(
  id: string,
  organizationId: string,
): Branch | null {
  const b = branches.find((x) => x.id === id);
  if (!b || b.organizationId !== organizationId) return null;
  return b;
}

export interface BranchInput {
  name: string;
  code?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  status?: BranchStatus;
}

export function createBranch(
  organizationId: string,
  input: BranchInput,
): Branch {
  const now = new Date().toISOString();
  const b: Branch = {
    id: `br-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    name: input.name.trim(),
    code: input.code?.trim() || undefined,
    address: input.address?.trim() || undefined,
    city: input.city?.trim() || undefined,
    state: input.state?.trim() || undefined,
    country: input.country?.trim() || undefined,
    postalCode: input.postalCode?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    status: input.status || "active",
    createdAt: now,
    updatedAt: now,
  };
  branches.unshift(b);
  flush();
  return b;
}

export function updateBranch(
  id: string,
  organizationId: string,
  patch: Partial<BranchInput>,
): Branch | null {
  const b = branches.find(
    (x) => x.id === id && x.organizationId === organizationId,
  );
  if (!b) return null;
  if (patch.name !== undefined) b.name = patch.name.trim();
  if (patch.code !== undefined) b.code = patch.code?.trim() || undefined;
  if (patch.address !== undefined) b.address = patch.address?.trim() || undefined;
  if (patch.city !== undefined) b.city = patch.city?.trim() || undefined;
  if (patch.state !== undefined) b.state = patch.state?.trim() || undefined;
  if (patch.country !== undefined) b.country = patch.country?.trim() || undefined;
  if (patch.postalCode !== undefined)
    b.postalCode = patch.postalCode?.trim() || undefined;
  if (patch.phone !== undefined) b.phone = patch.phone?.trim() || undefined;
  if (patch.status !== undefined) b.status = patch.status;
  b.updatedAt = new Date().toISOString();
  flush();
  return b;
}

export function deleteBranch(id: string, organizationId: string): boolean {
  const i = branches.findIndex(
    (x) => x.id === id && x.organizationId === organizationId,
  );
  if (i < 0) return false;
  branches.splice(i, 1);
  flush();
  return true;
}
