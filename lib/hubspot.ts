// HubSpot CRM integration — env-gated.
//
// One outbound shape: `pushLeadToHubspot(lead)` upserts a HubSpot
// Contact and writes the OduDoc lead-form fields into HubSpot custom
// properties. Wired to `/api/enterprise-leads` POST so every demo
// request lands in the sales inbox automatically.
//
// Setup (one-time):
//   1. Create a HubSpot Private App (Settings → Integrations →
//      Private Apps). Scope: crm.objects.contacts.read +
//      crm.objects.contacts.write
//   2. Copy the access token; set HUBSPOT_PRIVATE_APP_TOKEN in Vercel
//   3. (Optional) Create the custom contact properties below in
//      HubSpot. If you skip this, HubSpot drops them silently — the
//      core fields (firstname/email/phone/country) still land:
//        - odudoc_organization_name (single-line text)
//        - odudoc_beds_range        (single-line text)
//        - odudoc_modules           (multi-line text)
//        - odudoc_current_system    (single-line text)
//        - odudoc_lead_source       (single-line text — fixed: "OduDoc /contact")
//        - odudoc_message           (multi-line text)
//
// Failure modes are silent — a HubSpot 500 must never reject the
// applicant's lead submission. The local lead store is the source of
// truth; HubSpot is a downstream sync.

import { log } from "./log";

const TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN?.trim();

export function isHubspotConfigured(): boolean {
  return Boolean(TOKEN);
}

export interface LeadInput {
  organizationName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  country?: string;
  bedsRange?: string;
  interestedModules?: string[];
  currentSystem?: string;
  message?: string;
}

interface HubspotContactSearchResponse {
  results?: Array<{ id: string }>;
}

interface HubspotContactPayload {
  properties: Record<string, string>;
}

function splitName(full: string): { firstname: string; lastname: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { firstname: parts[0]!, lastname: "" };
  return {
    firstname: parts[0]!,
    lastname: parts.slice(1).join(" "),
  };
}

function buildProperties(lead: LeadInput): Record<string, string> {
  const { firstname, lastname } = splitName(lead.contactName);
  return {
    email: lead.contactEmail.trim().toLowerCase(),
    firstname,
    lastname,
    phone: lead.contactPhone || "",
    country: lead.country || "",
    company: lead.organizationName,
    odudoc_organization_name: lead.organizationName,
    odudoc_beds_range: lead.bedsRange || "",
    odudoc_modules: (lead.interestedModules || []).join(", "),
    odudoc_current_system: lead.currentSystem || "",
    odudoc_lead_source: "OduDoc /contact",
    odudoc_message: lead.message || "",
  };
}

async function hubspotCall(path: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${TOKEN}`);
  headers.set("Content-Type", "application/json");
  return fetch(`https://api.hubapi.com${path}`, { ...init, headers });
}

async function findContactIdByEmail(email: string): Promise<string | null> {
  const r = await hubspotCall("/crm/v3/objects/contacts/search", {
    method: "POST",
    body: JSON.stringify({
      filterGroups: [
        {
          filters: [{ propertyName: "email", operator: "EQ", value: email }],
        },
      ],
      properties: ["email"],
      limit: 1,
    }),
  });
  if (!r.ok) {
    log.warn("hubspot.search_failed", { status: r.status });
    return null;
  }
  const json = (await r.json()) as HubspotContactSearchResponse;
  return json.results?.[0]?.id ?? null;
}

/** Upsert a HubSpot Contact for the given lead. Returns the contact
 *  id when the call succeeded, null on any failure (logged + swallowed). */
export async function pushLeadToHubspot(lead: LeadInput): Promise<string | null> {
  if (!TOKEN) return null;
  try {
    const email = lead.contactEmail.trim().toLowerCase();
    const properties = buildProperties(lead);
    const existingId = await findContactIdByEmail(email);
    let res: Response;
    if (existingId) {
      res = await hubspotCall(`/crm/v3/objects/contacts/${existingId}`, {
        method: "PATCH",
        body: JSON.stringify({ properties } satisfies HubspotContactPayload),
      });
    } else {
      res = await hubspotCall(`/crm/v3/objects/contacts`, {
        method: "POST",
        body: JSON.stringify({ properties } satisfies HubspotContactPayload),
      });
    }
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      log.warn("hubspot.upsert_failed", { status: res.status, body: txt.slice(0, 200) });
      return null;
    }
    const json = (await res.json()) as { id?: string };
    return json.id ?? null;
  } catch (err) {
    log.error("hubspot.upsert_threw", err);
    return null;
  }
}
