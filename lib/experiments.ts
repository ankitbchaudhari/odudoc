// Lightweight in-house A/B testing.
//
// Goal: zero external dependency, zero added page weight, deterministic
// assignment per visitor (so a returning user stays in the same arm),
// and a single helper site-wide for both server- and client-side
// reads.
//
// Architecture:
//
//   - Each experiment is declared once in EXPERIMENTS below with an
//     ID, a list of weighted variants, and a default. We don't load
//     this from a database — A/B configs change rarely and config-as-
//     code keeps the change history in git.
//
//   - Assignment is deterministic: variant = hash(visitorId + experimentId)
//     bucketed by cumulative variant weights. Returning visitors land
//     in the same arm without us having to remember anything server-
//     side.
//
//   - visitorId is read from the `odudoc_vid` cookie. The provider
//     mounted in app/layout.tsx (ExperimentBootstrap, see below) sets
//     it on first paint if missing. Server-rendered routes can pull
//     it from request cookies; client components can read it from
//     document.cookie.
//
// To track conversion, fire a regular analytics event with the
// experiment id + assigned variant attached. The library doesn't
// integrate with any specific analytics provider on purpose — wire it
// to whatever you adopt (PostHog, Plausible, GA, etc.) at the call
// site.

export const EXPERIMENT_COOKIE = "odudoc_vid";

export interface ExperimentVariant {
  id: string;
  /** Relative weight; auto-normalised across variants in the same experiment. */
  weight: number;
  /** Optional human description used in admin tooling. */
  label?: string;
}

export interface Experiment {
  id: string;
  description: string;
  variants: ExperimentVariant[];
  /** Variant id returned when the experiment is paused or unknown. */
  defaultVariant: string;
  /** Set false to force everyone to defaultVariant without removing the entry. */
  enabled: boolean;
}

// Active experiment registry. Add entries here; remove them after the
// winner is shipped. Variant ids must match downstream `if (variant === ...)`
// checks, so think of them as part of the public API of the experiment.
export const EXPERIMENTS: Experiment[] = [
  // Example — uncomment when you actually want to run it.
  // {
  //   id: "consult-cta-v2",
  //   description: "Hero CTA copy on /consult — 'Book a Doctor' vs 'Talk to a Doctor Now'",
  //   variants: [
  //     { id: "control", weight: 1, label: "Book a Doctor" },
  //     { id: "urgent",  weight: 1, label: "Talk to a Doctor Now" },
  //   ],
  //   defaultVariant: "control",
  //   enabled: true,
  // },
];

// FNV-1a — fast non-crypto string hash. Good enough for bucketing;
// stay-the-same property is what matters here.
function hash32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0; // unsigned
}

/** Pick a variant deterministically given a visitor id + experiment. */
export function assignVariant(visitorId: string, exp: Experiment): string {
  if (!exp.enabled) return exp.defaultVariant;
  if (exp.variants.length === 0) return exp.defaultVariant;
  const total = exp.variants.reduce((n, v) => n + Math.max(0, v.weight), 0);
  if (total <= 0) return exp.defaultVariant;
  // Bucket into [0, total) deterministically per (visitor, experiment).
  const point = (hash32(`${visitorId}:${exp.id}`) % 1_000_000) / 1_000_000 * total;
  let cum = 0;
  for (const v of exp.variants) {
    cum += Math.max(0, v.weight);
    if (point < cum) return v.id;
  }
  return exp.variants[exp.variants.length - 1]!.id;
}

/** Look up an experiment by id. */
export function getExperiment(id: string): Experiment | null {
  return EXPERIMENTS.find((e) => e.id === id) ?? null;
}

/**
 * Resolve a visitor's variant for a given experiment id. Returns the
 * default variant if the experiment is missing or disabled.
 */
export function variantFor(visitorId: string, experimentId: string): string {
  const exp = getExperiment(experimentId);
  if (!exp) return "control";
  return assignVariant(visitorId, exp);
}

/** Generate a short, URL-safe random visitor id (16 chars). */
export function newVisitorId(): string {
  const buf = new Uint8Array(12);
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < buf.length; i++) buf[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(buf, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 16);
}

/** Server-side cookie reader (use in route handlers / server components). */
export function visitorIdFromCookies(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;
  const m = cookieHeader.match(new RegExp(`(?:^|;\\s*)${EXPERIMENT_COOKIE}=([^;]+)`));
  return m ? decodeURIComponent(m[1]!) : null;
}

/** Client-side reader/setter combo. Generates + persists a new id when missing. */
export function ensureVisitorIdClient(): string {
  if (typeof document === "undefined") return "anon";
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${EXPERIMENT_COOKIE}=([^;]+)`));
  if (m) return decodeURIComponent(m[1]!);
  const id = newVisitorId();
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${EXPERIMENT_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=${oneYear}; samesite=lax`;
  return id;
}
