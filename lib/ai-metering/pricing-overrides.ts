// Per-org AI pricing overrides.
//
// Canonical pricing lives in /lib/ai-metering/store.ts AI_PRICING —
// every feature has a default rupee cost per unit. Org admins
// override those numbers here when they want their hospital /
// clinic to charge clinicians at a different rate (subsidising
// AI scribe usage to drive adoption, charging more on image
// analysis to recover GPU costs, etc.).
//
// Lookup: getEffectiveRupeesPerUnit(ownerKind, ownerId, feature)
// returns the override if any, else the default. quoteCost in
// the meter store consults this lazily so the override applies to
// every debit.

import { bindPersistentArray } from "../persistent-array";
import type { AiFeature } from "./store";

export interface PricingOverride {
  /** id == ownerKind:ownerId:feature. */
  id: string;
  ownerKind: "user" | "org";
  ownerId: string;
  feature: AiFeature;
  perUnitRupees: number;
  /** Why was this override set — audit trail for ops review. */
  reason?: string;
  setBy?: string;
  updatedAt: string;
  createdAt: string;
}

const overrides: PricingOverride[] = [];
const { hydrate, flush, tombstone } = bindPersistentArray<PricingOverride>(
  "ai_pricing_overrides",
  overrides,
  () => []
);
await hydrate();

function key(ownerKind: "user" | "org", ownerId: string, feature: AiFeature): string {
  return `${ownerKind}:${ownerId}:${feature}`;
}

export function listOverrides(ownerKind: "user" | "org", ownerId: string): PricingOverride[] {
  return overrides.filter((o) => o.ownerKind === ownerKind && o.ownerId === ownerId)
    .sort((a, b) => a.feature.localeCompare(b.feature));
}

export function getOverride(ownerKind: "user" | "org", ownerId: string, feature: AiFeature): PricingOverride | null {
  return overrides.find((o) => o.id === key(ownerKind, ownerId, feature)) || null;
}

export interface UpsertInput {
  ownerKind: "user" | "org";
  ownerId: string;
  feature: AiFeature;
  perUnitRupees: number;
  reason?: string;
  setBy?: string;
}

export function upsertOverride(input: UpsertInput): PricingOverride {
  const at = new Date().toISOString();
  let o = overrides.find((x) => x.id === key(input.ownerKind, input.ownerId, input.feature));
  if (o) {
    o.perUnitRupees = Math.max(0, input.perUnitRupees);
    o.reason = input.reason?.trim() || o.reason;
    o.setBy = input.setBy || o.setBy;
    o.updatedAt = at;
  } else {
    o = {
      id: key(input.ownerKind, input.ownerId, input.feature),
      ownerKind: input.ownerKind,
      ownerId: input.ownerId,
      feature: input.feature,
      perUnitRupees: Math.max(0, input.perUnitRupees),
      reason: input.reason?.trim() || undefined,
      setBy: input.setBy,
      updatedAt: at, createdAt: at,
    };
    overrides.push(o);
  }
  flush();
  return o;
}

export function clearOverride(ownerKind: "user" | "org", ownerId: string, feature: AiFeature): boolean {
  const i = overrides.findIndex((o) => o.id === key(ownerKind, ownerId, feature));
  if (i < 0) return false;
  tombstone(overrides[i].id);
  overrides.splice(i, 1);
  flush();
  return true;
}

export function deleteOverridesForOwner(ownerKind: "user" | "org", ownerId: string): number {
  let n = 0;
  for (let i = overrides.length - 1; i >= 0; i--) {
    if (overrides[i].ownerKind === ownerKind && overrides[i].ownerId === ownerId) {
      tombstone(overrides[i].id);
      overrides.splice(i, 1);
      n++;
    }
  }
  if (n) flush();
  return n;
}
