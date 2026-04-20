// Enterprise demo requests captured from /corporate. Admin reviews them,
// reaches out, and optionally converts to an Organization.

import { bindPersistentArray } from "./persistent-array";

export type LeadStatus = "new" | "contacted" | "demoed" | "won" | "lost";

export interface EnterpriseLead {
  id: string;
  organizationName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  country?: string;
  bedsRange?: string; // "<20", "20-50", "50-200", "200+"
  interestedModules: string[];
  currentSystem?: string;
  message?: string;
  status: LeadStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const leads: EnterpriseLead[] = [];
const { hydrate, flush } = bindPersistentArray<EnterpriseLead>(
  "enterprise_leads",
  leads,
  () => []
);
await hydrate();

export function listLeads(): EnterpriseLead[] {
  return [...leads].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getLeadById(id: string): EnterpriseLead | null {
  return leads.find((l) => l.id === id) || null;
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

export function createLead(input: LeadInput): EnterpriseLead {
  const now = new Date().toISOString();
  const lead: EnterpriseLead = {
    id: `lead-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationName: input.organizationName.trim(),
    contactName: input.contactName.trim(),
    contactEmail: input.contactEmail.trim().toLowerCase(),
    contactPhone: input.contactPhone?.trim() || undefined,
    country: input.country?.trim() || undefined,
    bedsRange: input.bedsRange?.trim() || undefined,
    interestedModules: (input.interestedModules || []).map((m) => m.trim()).filter(Boolean),
    currentSystem: input.currentSystem?.trim() || undefined,
    message: input.message?.trim() || undefined,
    status: "new",
    createdAt: now,
    updatedAt: now,
  };
  leads.unshift(lead);
  flush();
  return lead;
}

export function updateLead(
  id: string,
  patch: Partial<Pick<EnterpriseLead, "status" | "notes">>
): EnterpriseLead | null {
  const l = leads.find((x) => x.id === id);
  if (!l) return null;
  if (patch.status !== undefined) l.status = patch.status;
  if (patch.notes !== undefined) l.notes = patch.notes;
  l.updatedAt = new Date().toISOString();
  flush();
  return l;
}

export function deleteLead(id: string): boolean {
  const i = leads.findIndex((l) => l.id === id);
  if (i < 0) return false;
  leads.splice(i, 1);
  flush();
  return true;
}
