// WhatsApp click-to-chat link builder.
//
// Generates a `wa.me/<digits>?text=<encoded message>` URL that opens
// WhatsApp on the admin's device with a pre-composed invitation
// message. The admin still has to click Send in the WhatsApp app —
// we never send on anyone's behalf. Keeps us cleanly outside Meta's
// bulk-messaging policy: the message is sent from the admin's own
// number, person-to-person, like any normal personal WhatsApp.
//
// For high-volume / automated sending, see docs/whatsapp-cloud-api-roadmap.md
// for the proper Meta Cloud API path.

export interface WhatsappInviteInput {
  /** Phone in any reasonable format — we strip non-digits and
   *  validate length. Must include country code (10 digits alone
   *  is rejected because we'd guess wrong on the country). */
  phone: string;
  /** Optional name — drops the "Dear Doctor" generic greeting in
   *  favour of "Dear Dr. Sathish". */
  name?: string;
  /** Optional specialty for a one-line context tag. */
  specialty?: string;
  /** Apply URL — caller passes the canonical site URL so we don't
   *  hardcode the domain. */
  applyUrl?: string;
}

/** Strip everything except digits + leading +. Returns empty string
 *  if the result doesn't look like a valid international number
 *  (10–15 digits, mandatory country code). */
export function normaliseInternationalPhone(raw: string): string {
  const trimmed = (raw || "").replace(/[^\d+]/g, "");
  // Drop the +; wa.me wants pure digits with country code.
  const digits = trimmed.replace(/^\+/, "");
  // Reject if the user pasted a 10-digit local number. We can't
  // safely guess India vs US for a bare 10-digit string and a
  // wrong country prefix sends to a stranger.
  if (digits.length < 11 || digits.length > 15) return "";
  return digits;
}

export function buildInviteMessage(input: {
  name?: string;
  specialty?: string;
  applyUrl: string;
}): string {
  const greeting = input.name
    ? `Hi Dr. ${input.name.replace(/^Dr\.?\s+/i, "").trim()}`
    : "Hi Doctor";
  const specialtyLine = input.specialty
    ? `\n\nWe came across your profile in ${input.specialty} and wanted to introduce you to OduDoc — a telemedicine + free clinic EMR platform built for doctors who want a clean way to consult online and run their own practice without monthly software fees.`
    : `\n\nWe wanted to introduce you to OduDoc — a telemedicine + free clinic EMR platform built for doctors who want a clean way to consult online and run their own practice without monthly software fees.`;
  return `${greeting},${specialtyLine}

Free clinic EMR (50 patients/month free), AI prescription assistant, voice dictation in 90+ languages, 70% commission on every paid consultation, and one-click FHIR/HL7 export — no platform lock-in.

Apply in 10 minutes (license + ID, verified within 48h):
${input.applyUrl}

Reply here with any questions — happy to help.

— OduDoc`;
}

export function buildWhatsappLink(input: WhatsappInviteInput): string | null {
  const digits = normaliseInternationalPhone(input.phone);
  if (!digits) return null;
  const apply =
    input.applyUrl ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") + "/for-doctors" ||
    "https://www.odudoc.com/for-doctors";
  const text = buildInviteMessage({
    name: input.name,
    specialty: input.specialty,
    applyUrl: apply,
  });
  // wa.me expects the URL-encoded text after ?text=. Use
  // encodeURIComponent so the line breaks survive (\n becomes %0A).
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
