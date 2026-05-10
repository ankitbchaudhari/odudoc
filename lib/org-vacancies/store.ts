// Org-scoped vacancies — hospitals, labs, diagnostic centers,
// pharma, insurers, education partners post their own openings
// here. Aggregated alongside the platform's own /lib/careers-store
// roles on /careers and the new /jobs feed.
//
// Internships are first-class — they share the same model with
// kind="internship" so the UI can filter cleanly.

import { bindPersistentArray } from "../persistent-array";

export type VacancyKind =
  | "full_time"
  | "part_time"
  | "locum"
  | "contract"
  | "internship"
  | "fellowship"
  | "residency"
  | "volunteer";

export type VacancyStatus = "open" | "filled" | "closed" | "draft";

export interface OrgVacancy {
  id: string;
  organizationId: string;
  /** "hospital" | "lab" | "diagnostic" | "pharmacy" | "pharma" |
   *  "insurer" | "education" — used for the public feed filter. */
  orgKind?: string;
  title: string;
  department?: string;
  /** Specialty / focus area — useful for doctor / nurse roles. */
  specialty?: string;
  kind: VacancyKind;
  location: string;
  remoteOk?: boolean;
  countryIso2?: string;
  /** Free-text salary band — operators format their own. */
  salary?: string;
  /** Internal currency for sortable filters when set. */
  salaryMinRupees?: number;
  salaryMaxRupees?: number;
  description: string;
  responsibilities: string[];
  requirements: string[];
  /** When the role was posted. */
  postedAt: string;
  /** Optional close date — UI hides past this point. */
  closesAt?: string;
  /** Hiring contact. */
  contactEmail?: string;
  /** Click-through to apply on the org's own ATS, if any. */
  applyUrl?: string;
  status: VacancyStatus;
  createdAt: string;
  updatedAt: string;
}

const vacancies: OrgVacancy[] = [];
const { hydrate, flush, tombstone } = bindPersistentArray<OrgVacancy>(
  "org_vacancies",
  vacancies,
  () => []
);
await hydrate();

export interface CreateVacancyInput {
  organizationId: string;
  orgKind?: string;
  title: string;
  department?: string;
  specialty?: string;
  kind: VacancyKind;
  location: string;
  remoteOk?: boolean;
  countryIso2?: string;
  salary?: string;
  salaryMinRupees?: number;
  salaryMaxRupees?: number;
  description: string;
  responsibilities?: string[];
  requirements?: string[];
  closesAt?: string;
  contactEmail?: string;
  applyUrl?: string;
}

export function createVacancy(input: CreateVacancyInput): OrgVacancy {
  const at = new Date().toISOString();
  const v: OrgVacancy = {
    id: `vac-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId: input.organizationId,
    orgKind: input.orgKind,
    title: input.title.trim(),
    department: input.department?.trim() || undefined,
    specialty: input.specialty?.trim() || undefined,
    kind: input.kind,
    location: input.location.trim(),
    remoteOk: input.remoteOk,
    countryIso2: input.countryIso2?.toUpperCase(),
    salary: input.salary?.trim() || undefined,
    salaryMinRupees: input.salaryMinRupees,
    salaryMaxRupees: input.salaryMaxRupees,
    description: input.description.trim(),
    responsibilities: (input.responsibilities || []).map((r) => r.trim()).filter(Boolean),
    requirements: (input.requirements || []).map((r) => r.trim()).filter(Boolean),
    postedAt: at,
    closesAt: input.closesAt,
    contactEmail: input.contactEmail?.trim() || undefined,
    applyUrl: input.applyUrl?.trim() || undefined,
    status: "open",
    createdAt: at, updatedAt: at,
  };
  vacancies.unshift(v);
  flush();
  return v;
}

export function listVacancies(opts: {
  organizationId?: string;
  kind?: VacancyKind;
  orgKind?: string;
  city?: string;
  specialty?: string;
  query?: string;
  openOnly?: boolean;
} = {}): OrgVacancy[] {
  let list = [...vacancies];
  if (opts.organizationId) list = list.filter((v) => v.organizationId === opts.organizationId);
  if (opts.kind) list = list.filter((v) => v.kind === opts.kind);
  if (opts.orgKind) list = list.filter((v) => v.orgKind === opts.orgKind);
  if (opts.city) list = list.filter((v) => v.location.toLowerCase().includes(opts.city!.toLowerCase()));
  if (opts.specialty) list = list.filter((v) => v.specialty?.toLowerCase() === opts.specialty!.toLowerCase());
  if (opts.openOnly) {
    const now = Date.now();
    list = list.filter((v) =>
      v.status === "open" &&
      (!v.closesAt || new Date(v.closesAt).getTime() >= now)
    );
  }
  if (opts.query) {
    const q = opts.query.toLowerCase();
    list = list.filter((v) =>
      v.title.toLowerCase().includes(q) ||
      v.description.toLowerCase().includes(q) ||
      v.department?.toLowerCase().includes(q)
    );
  }
  return list.sort((a, b) => b.postedAt.localeCompare(a.postedAt));
}

export function getVacancy(id: string): OrgVacancy | null {
  return vacancies.find((v) => v.id === id) || null;
}

export function updateVacancy(id: string, organizationId: string, patch: Partial<OrgVacancy>): OrgVacancy | null {
  const v = vacancies.find((x) => x.id === id && x.organizationId === organizationId);
  if (!v) return null;
  Object.assign(v, patch);
  v.updatedAt = new Date().toISOString();
  flush();
  return v;
}

export function setStatus(id: string, organizationId: string, status: VacancyStatus): OrgVacancy | null {
  return updateVacancy(id, organizationId, { status });
}

export function deleteVacancy(id: string, organizationId: string): boolean {
  const i = vacancies.findIndex((v) => v.id === id && v.organizationId === organizationId);
  if (i < 0) return false;
  tombstone(vacancies[i].id);
  vacancies.splice(i, 1);
  flush();
  return true;
}

export function deleteVacanciesForOrg(organizationId: string): number {
  let n = 0;
  for (let i = vacancies.length - 1; i >= 0; i--) {
    if (vacancies[i].organizationId === organizationId) {
      tombstone(vacancies[i].id);
      vacancies.splice(i, 1);
      n++;
    }
  }
  if (n) flush();
  return n;
}
