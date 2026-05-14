// OduDoc Medical ID
//
// 16-digit numeric identity in 3-5-5-3 groups: `NNN-NNNNN-NNNNN-NNN`
// The leading 3 digits encode the year the ID was issued (last 3 of the
// ISO year — e.g. 026 for 2026) which lets us age-sort and spot legacy
// IDs without a DB lookup. The remaining 13 digits are random.
//
// We mask the middle blocks in every UI surface (support chat, public
// profile, doctor-facing patient summaries). The first-3 / last-3 kept
// visible are *stable* so a patient can always be identified by the
// visible fragments without phoning support for a "random today" code.
//
// Design notes:
//   - Pure digits + dashes — no letters, so readable over phone, no
//     I/1 / O/0 ambiguity.
//   - Generator is collision-checked by the caller against the user
//     store; for a 13-digit random space the chance of collision in
//     a realistic patient base (<10M rows) is ~10^-6 even without
//     retries. We still retry up to 5 times to be safe.

export const MEDICAL_ID_REGEX =
  /^\d{3}-\d{5}-\d{5}-\d{3}$/;

/**
 * Generate a new OduDoc Medical ID. Format: `NNN-NNNNN-NNNNN-NNN`.
 * The first 3 digits are the current year's last 3 (e.g. "026" for 2026).
 */
export function generateMedicalId(now: Date = new Date()): string {
  const yearTail = String(now.getFullYear()).slice(-3).padStart(3, "0");
  const rand = (n: number) => {
    let out = "";
    for (let i = 0; i < n; i++) out += Math.floor(Math.random() * 10);
    return out;
  };
  return `${yearTail}-${rand(5)}-${rand(5)}-${rand(3)}`;
}

/**
 * Generate a Medical ID that isn't already in use. Retries up to 5 times
 * before giving up and returning the last candidate (realistically never
 * reached for a 13-random-digit space).
 */
export function generateUniqueMedicalId(
  isTaken: (candidate: string) => boolean,
  now: Date = new Date(),
): string {
  let candidate = generateMedicalId(now);
  for (let i = 0; i < 5 && isTaken(candidate); i++) {
    candidate = generateMedicalId(now);
  }
  return candidate;
}

/**
 * Mask a Medical ID for semi-public display. Shows first-3 + last-3,
 * hides the middle two blocks. Example:
 *   026-12345-67890-999  →  026-•••••-•••••-999
 *
 * If the input doesn't match the expected format we return it unchanged
 * so legacy / manually-typed values aren't silently corrupted.
 */
export function maskMedicalId(id: string | null | undefined): string {
  if (!id) return "";
  if (!MEDICAL_ID_REGEX.test(id)) return id;
  const [a, , , d] = id.split("-");
  return `${a}-•••••-•••••-${d}`;
}

/**
 * Check whether a string looks like a well-formed Medical ID.
 */
export function isValidMedicalId(id: string | null | undefined): boolean {
  return !!id && MEDICAL_ID_REGEX.test(id);
}

// ── Doctor ID ─────────────────────────────────────────────────────
//
// Doctors get a distinct identifier from patients so the role is
// obvious at a glance — on a visiting card, in a support ticket, in
// a database row. Format keeps the same 3-5-5-3 body as the patient
// medical id so both feel like "OduDoc IDs", but is prefixed with
// `DR-` so a glance distinguishes them. Example:
//   patient: 026-12345-67890-999
//   doctor:  DR-026-12345-67890-999
// First 3 digits encode the year of issue, same convention.

export const DOCTOR_ID_REGEX =
  /^DR-\d{3}-\d{5}-\d{5}-\d{3}$/;

/** Generate a new OduDoc Doctor ID. Format: `DR-NNN-NNNNN-NNNNN-NNN`. */
export function generateDoctorId(now: Date = new Date()): string {
  return `DR-${generateMedicalId(now)}`;
}

/** Generate a Doctor ID that isn't already in use. Retries 5 times. */
export function generateUniqueDoctorId(
  isTaken: (candidate: string) => boolean,
  now: Date = new Date(),
): string {
  let candidate = generateDoctorId(now);
  for (let i = 0; i < 5 && isTaken(candidate); i++) {
    candidate = generateDoctorId(now);
  }
  return candidate;
}

/** Mask a Doctor ID for semi-public display, mirroring the patient
 *  pattern. `DR-026-12345-67890-999` → `DR-026-•••••-•••••-999`. */
export function maskDoctorId(id: string | null | undefined): string {
  if (!id) return "";
  if (!DOCTOR_ID_REGEX.test(id)) return id;
  const parts = id.split("-"); // ["DR", "026", "12345", "67890", "999"]
  return `${parts[0]}-${parts[1]}-•••••-•••••-${parts[4]}`;
}

export function isValidDoctorId(id: string | null | undefined): boolean {
  return !!id && DOCTOR_ID_REGEX.test(id);
}
