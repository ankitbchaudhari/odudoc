// RFC 6238 TOTP (HMAC-SHA1, 30-second window, 6 digits) for doctor +
// admin 2FA. Compatible with Google Authenticator, Authy, 1Password,
// Microsoft Authenticator — anything that scans an otpauth:// URI.
//
// We never persist the raw plaintext secret in a checked-in seed; it's
// stored on the User row (totpSecret, base32) and only written when the
// user successfully completes setup verification. Disable is a hard
// delete of the field.
//
// Implementation is intentionally hand-rolled (~50 lines) — pulling in
// `otplib` would add a 3rd-party crypto dep for trivial code. Node's
// built-in crypto.createHmac is sufficient.

import crypto from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateSecret(bytes = 20): string {
  const buf = crypto.randomBytes(bytes);
  let bits = "";
  for (const b of buf) bits += b.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    out += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  }
  return out;
}

function base32Decode(s: string): Buffer {
  const clean = s.replace(/=+$/, "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const ch of clean) {
    const v = BASE32_ALPHABET.indexOf(ch);
    if (v < 0) continue;
    bits += v.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function hotp(secretBase32: string, counter: number): string {
  const key = base32Decode(secretBase32);
  const buf = Buffer.alloc(8);
  // Big-endian 64-bit counter.
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = crypto.createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (code % 1_000_000).toString().padStart(6, "0");
}

/** Generate the current 6-digit TOTP code. Used in tests / setup. */
export function generateTotp(secretBase32: string, t = Date.now()): string {
  return hotp(secretBase32, Math.floor(t / 30000));
}

/** Verify a user-supplied code against the secret. Allows ±1 window
 *  to absorb clock skew between server and authenticator app. */
export function verifyTotp(secretBase32: string, code: string): boolean {
  const clean = code.replace(/\D/g, "");
  if (clean.length !== 6) return false;
  const counter = Math.floor(Date.now() / 30000);
  for (const window of [-1, 0, 1]) {
    if (hotp(secretBase32, counter + window) === clean) return true;
  }
  return false;
}

/** Build an otpauth:// URI for QR code generation. The user's
 *  authenticator app will accept this string directly. */
export function totpUri(opts: {
  secret: string;
  accountName: string; // user's email
  issuer?: string;
}): string {
  const issuer = encodeURIComponent(opts.issuer || "OduDoc");
  const account = encodeURIComponent(opts.accountName);
  return `otpauth://totp/${issuer}:${account}?secret=${opts.secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
}
