// Tamper-evident audit envelope. Spec v6.2 §53 layer 8.
//
// Append-only chain of SHA-256 hashes. Each new entry hashes
// (previous_hash + canonical_json(entry)). If an attacker rewrites
// any historical entry, every subsequent hash diverges from the
// recomputed chain, surfacing the tamper at the next integrity
// audit (cron walks the chain monthly).
//
// This is NOT a public blockchain — it's a Merkle-style envelope
// internal to OduDoc. Public anchoring (Ethereum tx for the daily
// root hash) is a separate add-on we can wire later for regulator
// disclosure.
//
// Storage uses the existing persistent-array binding so the chain
// survives Lambda recycles; a corrupt chain is detectable on
// reload via verifyChain().

import crypto from "crypto";
import { bindPersistentArray } from "./persistent-array";

export interface AuditEnvelope {
  /** Sequence number — strictly increasing. */
  seq: number;
  /** When this envelope was sealed. */
  at: string;
  /** Hash of the previous envelope (hex). "GENESIS" for seq 0. */
  prevHash: string;
  /** Hash of (prevHash + canonical_json(entry)). */
  hash: string;
  /** What it covered — actor, action, target. Plain object,
   *  serialised stably for hashing. Free-form is fine because the
   *  hash binds to the exact bytes we hashed. */
  entry: Record<string, unknown>;
}

const chain: AuditEnvelope[] = [];
const { hydrate, flush } = bindPersistentArray<AuditEnvelope>(
  "audit_envelope_chain",
  chain,
  () => [],
);
await hydrate();

function canonicalJSON(obj: Record<string, unknown>): string {
  // Stable key order so two semantically equal entries hash the
  // same regardless of how they were typed.
  const keys = Object.keys(obj).sort();
  const out: Record<string, unknown> = {};
  for (const k of keys) out[k] = obj[k];
  return JSON.stringify(out);
}

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

/** Append a new entry to the chain, computing its envelope hash
 *  from the previous one. Returns the sealed envelope. */
export function appendEnvelope(entry: Record<string, unknown>): AuditEnvelope {
  const prev = chain.length === 0 ? null : chain[chain.length - 1];
  const prevHash = prev ? prev.hash : "GENESIS";
  const seq = prev ? prev.seq + 1 : 0;
  const at = new Date().toISOString();
  const payload = canonicalJSON({ seq, at, prevHash, entry });
  const hash = sha256(payload);
  const env: AuditEnvelope = { seq, at, prevHash, hash, entry };
  chain.push(env);
  flush();
  return env;
}

/** Walk the chain and verify every envelope's hash matches what we'd
 *  compute from its predecessor + entry bytes. Returns the seq of
 *  the first divergent envelope, or null if the whole chain is
 *  consistent. Run from a monthly cron. */
export function verifyChain(): { ok: true } | { ok: false; failedAtSeq: number; expected: string; actual: string } {
  let prevHash = "GENESIS";
  for (const env of chain) {
    const payload = canonicalJSON({ seq: env.seq, at: env.at, prevHash, entry: env.entry });
    const expected = sha256(payload);
    if (expected !== env.hash) {
      return { ok: false, failedAtSeq: env.seq, expected, actual: env.hash };
    }
    prevHash = env.hash;
  }
  return { ok: true };
}

/** Latest envelope or null on empty chain. Useful for showing the
 *  current chain head + length in the admin audit page. */
export function chainHead(): { seq: number; hash: string; length: number } | null {
  if (chain.length === 0) return null;
  const last = chain[chain.length - 1];
  return { seq: last.seq, hash: last.hash, length: chain.length };
}

/** Range query — used by the regulator-disclosure flow to extract
 *  a subset of the chain along with the proof envelope hashes
 *  surrounding the range. */
export function rangeWithProof(fromSeq: number, toSeq: number): AuditEnvelope[] {
  return chain.filter((e) => e.seq >= fromSeq && e.seq <= toSeq);
}
