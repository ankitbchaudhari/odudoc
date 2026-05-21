// HaveIBeenPwned k-anonymity check for password reuse.
//
// We send only the first 5 hex chars of SHA-1(password) to the HIBP
// Pwned Passwords API. The response is a list of hash suffixes + breach
// counts for every leaked password that shares those 5 prefix chars
// (≈400-500 candidates). We scan locally for our full hash. The
// plaintext password NEVER leaves this server.
//
// Used as a soft gate on signup and password change for doctor + admin
// + corporate accounts. Patient OTP-only accounts have no password to
// check. Threshold and behaviour:
//   - count > 0   → warn  (UI may suggest a stronger password)
//   - count > 100 → reject (force the user to pick something not yet
//                   confirmed-leaked)
//
// Failures (network down, HIBP rate-limit, timeout) fail OPEN — we
// don't block a legitimate signup because a third-party API is
// unreachable. The check is logged so we can see opt-out rates.

import crypto from "node:crypto";

const HIBP_URL = "https://api.pwnedpasswords.com/range";

export interface PwnedResult {
  /** Number of times the password appears in known breaches. 0 = clean. */
  count: number;
  /** True when we could not reach HIBP. count is 0 in this case. */
  errored: boolean;
}

export async function checkPasswordPwned(plain: string): Promise<PwnedResult> {
  if (!plain || plain.length < 1) return { count: 0, errored: false };

  if (process.env.DISABLE_HIBP === "1") {
    return { count: 0, errored: false };
  }

  const sha1 = crypto.createHash("sha1").update(plain).digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2000);
    const res = await fetch(`${HIBP_URL}/${prefix}`, {
      headers: { "Add-Padding": "true" },
      signal: ctrl.signal,
      cache: "no-store",
    });
    clearTimeout(t);
    if (!res.ok) return { count: 0, errored: true };

    const text = await res.text();
    for (const line of text.split("\n")) {
      const [hashSuffix, countStr] = line.trim().split(":");
      if (hashSuffix === suffix) {
        return { count: Number(countStr || 0), errored: false };
      }
    }
    return { count: 0, errored: false };
  } catch {
    return { count: 0, errored: true };
  }
}

/** Convenience: returns a tuple of (allowed, message). Reject above
 *  100 hits — that's the threshold suggested by OWASP for "do not use
 *  this password ever". Below 100 we still let it through. */
export async function assertPasswordNotPwned(plain: string): Promise<{ ok: boolean; reason?: string; count: number }> {
  const r = await checkPasswordPwned(plain);
  if (r.errored) return { ok: true, count: 0 }; // fail open
  if (r.count > 100) {
    return {
      ok: false,
      count: r.count,
      reason: `This password has appeared in ${r.count.toLocaleString()} known data breaches. Pick something unique.`,
    };
  }
  return { ok: true, count: r.count };
}
