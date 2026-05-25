// Server-only: merges the static national-health-id catalogue with
// admin overrides stored in site settings. Returns the live list the
// search API + the admin UI should use. Kept separate from
// lib/national-health-ids.ts so client bundles can still import the
// static catalogue without pulling settings-store (which transitively
// pulls postgres).

import "server-only";
import {
  NATIONAL_HEALTH_IDS,
  type NationalHealthId,
} from "./national-health-ids";
import {
  getSettings,
  ensureHydrated,
  type NationalHealthIdOverride,
} from "./settings-store";

function safeRegex(src: string): RegExp | null {
  try {
    return new RegExp(src);
  } catch {
    return null;
  }
}

/** Merge one override onto a base entry, recompiling the regex when
 *  the admin supplied a new pattern string. Returns the original base
 *  unchanged when the override only sets fields we don't have. */
function applyOverride(
  base: NationalHealthId,
  o: NationalHealthIdOverride,
): NationalHealthId {
  const next: NationalHealthId = { ...base };
  if (o.systemName) next.systemName = o.systemName;
  if (o.nativeName !== undefined) next.nativeName = o.nativeName || undefined;
  if (o.agency) next.agency = o.agency;
  if (o.digitalHealthNetwork !== undefined)
    next.digitalHealthNetwork = o.digitalHealthNetwork || undefined;
  if (o.placeholder || o.patternStr || o.helpText !== undefined) {
    next.format = { ...base.format };
    if (o.placeholder) next.format.placeholder = o.placeholder;
    if (o.helpText !== undefined) next.format.helpText = o.helpText || undefined;
    if (o.patternStr) {
      const re = safeRegex(o.patternStr);
      if (re) next.format.pattern = re;
    }
  }
  if (o.learnMoreUrl !== undefined)
    next.learnMoreUrl = o.learnMoreUrl || undefined;
  if (o.coverage) next.coverage = o.coverage;
  return next;
}

/** Build a fresh entry from scratch when the admin added a country/
 *  system that isn't in the base catalogue. Returns null if the
 *  override is missing the minimum required fields. */
function buildNew(o: NationalHealthIdOverride): NationalHealthId | null {
  if (
    !o.country ||
    !o.systemId ||
    !o.systemName ||
    !o.agency ||
    !o.placeholder
  ) {
    return null;
  }
  const re = o.patternStr ? safeRegex(o.patternStr) : null;
  return {
    country: o.country.toUpperCase(),
    countryName: o.country.toUpperCase(),
    systemId: o.systemId,
    systemName: o.systemName,
    nativeName: o.nativeName,
    agency: o.agency,
    digitalHealthNetwork: o.digitalHealthNetwork,
    format: {
      pattern: re ?? /.+/,
      placeholder: o.placeholder,
      helpText: o.helpText,
    },
    learnMoreUrl: o.learnMoreUrl,
    coverage: o.coverage || "voluntary",
  };
}

/** Live national-health-id catalogue: static defaults + admin
 *  overrides applied. Server-side use only — the static defaults
 *  in lib/national-health-ids.ts are what client bundles read. */
export async function getMergedNationalHealthIds(): Promise<NationalHealthId[]> {
  await ensureHydrated();
  const overrides =
    (getSettings().nationalHealthIdsOverrides ||
      []) as NationalHealthIdOverride[];
  if (overrides.length === 0) return NATIONAL_HEALTH_IDS;

  // Index overrides for O(1) lookup by (country, systemId).
  const key = (c: string, s: string) => `${c.toUpperCase()}::${s}`;
  const byKey = new Map<string, NationalHealthIdOverride>();
  for (const o of overrides) byKey.set(key(o.country, o.systemId), o);

  const out: NationalHealthId[] = [];
  // Pass 1: applied / dropped base entries.
  for (const base of NATIONAL_HEALTH_IDS) {
    const ov = byKey.get(key(base.country, base.systemId));
    if (ov?.disabled) continue;
    out.push(ov ? applyOverride(base, ov) : base);
  }
  // Pass 2: brand-new entries the admin added.
  for (const o of overrides) {
    if (o.disabled) continue;
    const exists = NATIONAL_HEALTH_IDS.some(
      (b) =>
        b.country.toUpperCase() === o.country.toUpperCase() &&
        b.systemId === o.systemId,
    );
    if (exists) continue;
    const fresh = buildNew(o);
    if (fresh) out.push(fresh);
  }
  return out;
}
