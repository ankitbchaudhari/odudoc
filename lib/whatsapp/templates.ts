// WhatsApp message templates.
//
// In production, every outbound WhatsApp message has to use a Meta-
// approved template (HSM) — Meta enforces this so businesses can't
// spam users with unsolicited messages. We pre-declare the templates
// here both as the source of truth for what the platform will send,
// and as the approval-paperwork artefact (one row per template). When
// we eventually go live with the WhatsApp Cloud API, each template's
// `name` field maps to the registered HSM name and `body` is the
// approved copy.
//
// Until then we send via Twilio's WhatsApp endpoint with the same
// body verbatim, which works in the WhatsApp Sandbox (and in
// production once a Twilio sender is approved).
//
// Each template declares its category — Meta requires labelling
// AUTHENTICATION / TRANSACTIONAL / MARKETING separately — and the
// variables the body references via {{name}} placeholders.

export type TemplateCategory =
  | "transactional" // appointment / Rx / lab updates the user has consented to via service relationship
  | "authentication" // OTP / login codes
  | "marketing"; // explicit opt-in marketing comms

export interface WhatsAppTemplate {
  /** Stable id; matches the registered HSM name when in production. */
  name: string;
  /** Human label for the admin console. */
  label: string;
  category: TemplateCategory;
  /** Variables the body references, in declaration order. */
  variables: string[];
  /** The approved body. {{var}} placeholders match the variables. */
  body: string;
  /** Quick-reply buttons rendered on supported clients. */
  quickReplies?: string[];
}

export const TEMPLATES: Record<string, WhatsAppTemplate> = {
  appointment_reminder: {
    name: "appointment_reminder",
    label: "Appointment reminder (24h before)",
    category: "transactional",
    variables: ["patientName", "doctorName", "dateTime", "clinicName"],
    body:
      "Hi {{patientName}}, this is a reminder for your appointment with {{doctorName}} at {{clinicName}} on {{dateTime}}.\n\n" +
      "Reply CONFIRM to confirm, RESCHEDULE if you need to change the time, or CANCEL to cancel.",
    quickReplies: ["CONFIRM", "RESCHEDULE", "CANCEL"],
  },
  appointment_confirmed: {
    name: "appointment_confirmed",
    label: "Appointment confirmed",
    category: "transactional",
    variables: ["patientName", "doctorName", "dateTime", "addressOrLink"],
    body:
      "✓ Appointment confirmed.\n\n{{patientName}}, you'll see {{doctorName}} on {{dateTime}}.\n\n" +
      "Where: {{addressOrLink}}",
  },
  lab_results_ready: {
    name: "lab_results_ready",
    label: "Lab results ready",
    category: "transactional",
    variables: ["patientName", "testName", "url"],
    body:
      "Hi {{patientName}}, your {{testName}} results are ready.\n\nView them: {{url}}\n\n" +
      "Reply RESULTS for a quick summary, or DOCTOR to discuss with your physician.",
    quickReplies: ["RESULTS", "DOCTOR"],
  },
  prescription_ready: {
    name: "prescription_ready",
    label: "Prescription ready (Rx)",
    category: "transactional",
    variables: ["patientName", "url"],
    body:
      "Your prescription is ready, {{patientName}}.\n\n" +
      "View / download: {{url}}\n\n" +
      "Reply DELIVER to have it dispensed and delivered, or PHARMACIES to find one near you.",
    quickReplies: ["DELIVER", "PHARMACIES"],
  },
  refill_due: {
    name: "refill_due",
    label: "Refill due reminder",
    category: "transactional",
    variables: ["patientName", "drugName", "daysLeft"],
    body:
      "Hi {{patientName}}, your {{drugName}} runs out in {{daysLeft}} days.\n\n" +
      "Reply REFILL to reorder for delivery, or SKIP to dismiss this reminder.",
    quickReplies: ["REFILL", "SKIP"],
  },
  follow_up_after_visit: {
    name: "follow_up_after_visit",
    label: "Post-visit follow-up",
    category: "transactional",
    variables: ["patientName", "doctorName", "summaryUrl"],
    body:
      "{{patientName}}, hope you're feeling better after your visit with {{doctorName}}.\n\n" +
      "Visit summary + Rx: {{summaryUrl}}\n\n" +
      "Reply BETTER, SAME, or WORSE to let us know how you're doing — your doctor may follow up.",
    quickReplies: ["BETTER", "SAME", "WORSE"],
  },
  passport_consent_request: {
    name: "passport_consent_request",
    label: "Health passport consent request",
    category: "transactional",
    variables: ["patientName", "clinicName", "consentUrl"],
    body:
      "Hi {{patientName}}, {{clinicName}} just scanned your health passport and is requesting access to your records.\n\n" +
      "Tap to grant: {{consentUrl}}\n\n" +
      "You stay in control — pick which sections to share and for how long.",
  },
  marketing_health_tip: {
    name: "marketing_health_tip",
    label: "Health tip / newsletter",
    category: "marketing",
    variables: ["patientName", "tipText", "ctaUrl"],
    body:
      "Hi {{patientName}} 👋\n\n{{tipText}}\n\n{{ctaUrl}}\n\n" +
      "Reply STOP to opt out of health tips.",
  },
};

/** Substitute {{var}} placeholders, returning the rendered body. We
 *  HTML-escape nothing — WhatsApp is plain-text and we want emoji /
 *  newlines to flow through. */
export function renderTemplate(
  templateName: string,
  vars: Record<string, string | number | undefined>,
): string {
  const t = TEMPLATES[templateName];
  if (!t) throw new Error(`unknown_template:${templateName}`);
  let body = t.body;
  for (const v of t.variables) {
    const val = vars[v];
    body = body.split(`{{${v}}}`).join(val === undefined || val === null ? "" : String(val));
  }
  return body;
}

export function listTemplates(): WhatsAppTemplate[] {
  return Object.values(TEMPLATES);
}
