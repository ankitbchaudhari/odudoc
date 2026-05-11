// Payroll configuration & calculation — Ecosystem Spec §15.
//
// Stores per-staff salary configuration (model + parameters) and computes
// the monthly payroll run against existing encounter / attendance data.
//
// v1 caveats:
//   • No bank transfer integration — outputs the payslip line items only.
//   • Revenue-share is approximated as encounters × per-patient rate
//     when no invoice link is configured.
//   • Tax/TDS handled as a flat percentage configurable per row.

import { bindPersistentArray } from "./persistent-array";

export type SalaryModel =
  | "monthly_fixed"
  | "per_patient"
  | "per_visit"
  | "hybrid"
  | "revenue_share";

export interface SalaryConfig {
  id: string;
  organizationId: string;
  /** Refers to a memberships-store entry. */
  membershipId: string;
  staffName: string;
  role: string;
  model: SalaryModel;
  /** monthly_fixed, hybrid base. */
  baseMonthly?: number;
  /** per_patient, hybrid bonus. */
  perPatientRate?: number;
  /** Hybrid: bonus applies only above this patient count. */
  hybridThreshold?: number;
  /** per_visit. */
  perVisitRate?: number;
  /** revenue_share: 0–100. */
  sharePercent?: number;
  /** Optional flat TDS / income-tax percent (0–100). */
  taxPercent?: number;
  currency: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const configs: SalaryConfig[] = [];
const { hydrate, flush } = bindPersistentArray<SalaryConfig>(
  "payroll-configs",
  configs,
  () => []
);
await hydrate();

export function listSalaryConfigs(organizationId: string): SalaryConfig[] {
  return configs
    .filter((c) => c.organizationId === organizationId)
    .sort((a, b) => a.staffName.localeCompare(b.staffName));
}

export function getSalaryConfig(id: string): SalaryConfig | undefined {
  return configs.find((c) => c.id === id);
}

export interface SalaryConfigInput {
  organizationId: string;
  membershipId: string;
  staffName: string;
  role: string;
  model: SalaryModel;
  baseMonthly?: number;
  perPatientRate?: number;
  hybridThreshold?: number;
  perVisitRate?: number;
  sharePercent?: number;
  taxPercent?: number;
  currency?: string;
  active?: boolean;
}

export async function upsertSalaryConfig(input: SalaryConfigInput): Promise<SalaryConfig> {
  const now = new Date().toISOString();
  const existing = configs.find(
    (c) => c.organizationId === input.organizationId && c.membershipId === input.membershipId
  );
  if (existing) {
    Object.assign(existing, {
      staffName: input.staffName,
      role: input.role,
      model: input.model,
      baseMonthly: input.baseMonthly,
      perPatientRate: input.perPatientRate,
      hybridThreshold: input.hybridThreshold,
      perVisitRate: input.perVisitRate,
      sharePercent: input.sharePercent,
      taxPercent: input.taxPercent,
      currency: input.currency ?? existing.currency,
      active: input.active ?? existing.active,
      updatedAt: now,
    });
    await flush();
    return existing;
  }
  const c: SalaryConfig = {
    id: `sal_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    organizationId: input.organizationId,
    membershipId: input.membershipId,
    staffName: input.staffName,
    role: input.role,
    model: input.model,
    baseMonthly: input.baseMonthly,
    perPatientRate: input.perPatientRate,
    hybridThreshold: input.hybridThreshold,
    perVisitRate: input.perVisitRate,
    sharePercent: input.sharePercent,
    taxPercent: input.taxPercent,
    currency: input.currency ?? "USD",
    active: input.active ?? true,
    createdAt: now,
    updatedAt: now,
  };
  configs.push(c);
  await flush();
  return c;
}

export async function deleteSalaryConfig(id: string, organizationId: string): Promise<boolean> {
  const idx = configs.findIndex((c) => c.id === id && c.organizationId === organizationId);
  if (idx < 0) return false;
  configs.splice(idx, 1);
  await flush();
  return true;
}

// ---------------------------------------------------------------------------
// Monthly calculation
// ---------------------------------------------------------------------------

export interface PayslipLine {
  configId: string;
  staffName: string;
  role: string;
  model: SalaryModel;
  inputs: {
    patientCount?: number;
    visitCount?: number;
    baseMonthly?: number;
    rate?: number;
    threshold?: number;
    sharePercent?: number;
  };
  gross: number;
  tax: number;
  net: number;
  currency: string;
}

export interface CalcContext {
  /** Map of membershipId → number of patients seen this month. */
  patientCountByMembership: Map<string, number>;
  /** Map of membershipId → number of recorded sessions/visits. */
  visitCountByMembership: Map<string, number>;
}

export function calculatePayslip(c: SalaryConfig, ctx: CalcContext): PayslipLine {
  const patients = ctx.patientCountByMembership.get(c.membershipId) ?? 0;
  const visits = ctx.visitCountByMembership.get(c.membershipId) ?? 0;
  let gross = 0;
  const inputs: PayslipLine["inputs"] = {};
  switch (c.model) {
    case "monthly_fixed":
      gross = c.baseMonthly ?? 0;
      inputs.baseMonthly = c.baseMonthly;
      break;
    case "per_patient":
      gross = (c.perPatientRate ?? 0) * patients;
      inputs.patientCount = patients;
      inputs.rate = c.perPatientRate;
      break;
    case "per_visit":
      gross = (c.perVisitRate ?? 0) * visits;
      inputs.visitCount = visits;
      inputs.rate = c.perVisitRate;
      break;
    case "hybrid": {
      const base = c.baseMonthly ?? 0;
      const threshold = c.hybridThreshold ?? 0;
      const above = Math.max(0, patients - threshold);
      const bonus = (c.perPatientRate ?? 0) * above;
      gross = base + bonus;
      inputs.baseMonthly = base;
      inputs.patientCount = patients;
      inputs.rate = c.perPatientRate;
      inputs.threshold = threshold;
      break;
    }
    case "revenue_share": {
      // v1 approximation: revenue ≈ patientCount × perPatientRate (acts as
      // a per-encounter average billing). Replace with real invoice sum
      // once the billing pipeline links encounters → invoices.
      const approxRevenue = (c.perPatientRate ?? 0) * patients;
      gross = (approxRevenue * (c.sharePercent ?? 0)) / 100;
      inputs.patientCount = patients;
      inputs.rate = c.perPatientRate;
      inputs.sharePercent = c.sharePercent;
      break;
    }
  }
  const tax = c.taxPercent ? Math.round((gross * c.taxPercent) / 100) : 0;
  return {
    configId: c.id,
    staffName: c.staffName,
    role: c.role,
    model: c.model,
    inputs,
    gross: Math.round(gross),
    tax,
    net: Math.round(gross) - tax,
    currency: c.currency,
  };
}
