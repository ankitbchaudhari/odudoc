// Storage layer for appointment penalty policies.
//
// Policies live on settings-store under `appointmentPenaltyPolicies`
// — an array of full PenaltyPolicy records keyed by (scope, scopeId).
// Reads merge in the platform default if no row matches a higher
// scope; writes are a list-replace per (scope, scopeId) tuple.
//
// Server-only — settings-store pulls postgres which can't ship in
// client bundles. The admin page reads via API.

import "server-only";
import {
  PLATFORM_DEFAULT_POLICY,
  resolvePolicy,
  type PenaltyPolicy,
  type PenaltyScope,
} from "./appointment-penalty-engine";
import { ensureHydrated, getSettings, updateSettings } from "./settings-store";

function listAll(): PenaltyPolicy[] {
  const settings = getSettings() as unknown as {
    appointmentPenaltyPolicies?: PenaltyPolicy[];
  };
  return settings.appointmentPenaltyPolicies || [];
}

function findOne(
  scope: PenaltyScope,
  scopeId: string | null,
): PenaltyPolicy | null {
  const list = listAll();
  return (
    list.find(
      (p) => p.scope === scope && (p.scopeId || null) === (scopeId || null),
    ) || null
  );
}

export async function listPolicies(): Promise<PenaltyPolicy[]> {
  await ensureHydrated();
  return listAll();
}

export async function getPolicy(
  scope: PenaltyScope,
  scopeId: string | null,
): Promise<PenaltyPolicy | null> {
  await ensureHydrated();
  return findOne(scope, scopeId);
}

/** Returns the live (already-resolved) policy for an appointment
 *  given the owner identifiers the caller has on hand. Any of
 *  doctorId / clinicId / orgId may be omitted; resolvePolicy()
 *  cascades to the next scope. */
export async function resolveForAppointment(opts: {
  doctorId?: string | null;
  clinicId?: string | null;
  organizationId?: string | null;
}): Promise<PenaltyPolicy> {
  await ensureHydrated();
  const doctorPolicy = opts.doctorId ? findOne("doctor", opts.doctorId) : null;
  const clinicPolicy = opts.clinicId ? findOne("clinic", opts.clinicId) : null;
  const orgPolicy = opts.organizationId
    ? findOne("organization", opts.organizationId)
    : null;
  const platformPolicy = findOne("platform", null);
  return resolvePolicy({
    doctorPolicy,
    clinicPolicy,
    orgPolicy,
    platformPolicy,
  });
}

export async function savePolicy(input: PenaltyPolicy): Promise<PenaltyPolicy> {
  await ensureHydrated();
  const next: PenaltyPolicy = {
    ...input,
    updatedAt: new Date().toISOString(),
  };
  const list = listAll();
  const filtered = list.filter(
    (p) =>
      !(
        p.scope === input.scope &&
        (p.scopeId || null) === (input.scopeId || null)
      ),
  );
  updateSettings({
    appointmentPenaltyPolicies: [...filtered, next],
  } as unknown as Parameters<typeof updateSettings>[0]);
  return next;
}

export async function deletePolicy(
  scope: PenaltyScope,
  scopeId: string | null,
): Promise<void> {
  await ensureHydrated();
  const list = listAll();
  const filtered = list.filter(
    (p) =>
      !(p.scope === scope && (p.scopeId || null) === (scopeId || null)),
  );
  updateSettings({
    appointmentPenaltyPolicies: filtered,
  } as unknown as Parameters<typeof updateSettings>[0]);
}

/** Convenience for the admin page: returns the platform default
 *  with overlay if an admin has explicitly set one. */
export async function getPlatformDefault(): Promise<PenaltyPolicy> {
  await ensureHydrated();
  return findOne("platform", null) || PLATFORM_DEFAULT_POLICY;
}
