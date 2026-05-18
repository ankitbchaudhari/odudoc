// Multi-sitting procedures. Spec v6.0 §27.
//
// Procedures that span multiple visits over weeks or months —
// dental (RCT spread across 3-4 sittings), oncology (chemo cycles),
// orthodontic (monthly adjustments), physiotherapy programs.
//
// Data model:
//   ProcedurePlan   — root record. Patient + doctor + total sittings
//                     + price (package) + status.
//   ProcedureSitting — one row per scheduled sitting. Each rolls into
//                     the plan's progress.
//
// Billing pattern: a package price is collected at plan creation; each
// completed sitting decrements progress. Cancellation refunds the
// proportional balance.

import { bindPersistentArray } from "./persistent-array";

export type ProcedureCategory =
  | "dental_rct"
  | "dental_orthodontic"
  | "dental_implant"
  | "oncology_chemo"
  | "oncology_radio"
  | "physio_rehab"
  | "skin_laser"
  | "fertility_ivf"
  | "psychiatry_therapy"
  | "other";

export type PlanStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "paused";

export type SittingStatus =
  | "planned"
  | "done"
  | "missed"
  | "rescheduled"
  | "cancelled";

export interface ProcedurePlan {
  id: string;
  organizationId: string;
  patientEmail: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  category: ProcedureCategory;
  /** Display name — "RCT 14 (upper right molar)" / "Chemo regimen FOLFOX". */
  title: string;
  /** Number of sittings agreed at plan creation. */
  plannedSittings: number;
  /** Package fee in USD. */
  packageFeeUsd: number;
  /** Per-sitting if not packaged. */
  perSittingFeeUsd?: number;
  status: PlanStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProcedureSitting {
  id: string;
  planId: string;
  sequence: number; // 1, 2, 3...
  scheduledFor: string;
  /** Filled when the doctor completes the sitting. */
  doneAt?: string;
  /** Doctor's note for this specific sitting. */
  note?: string;
  status: SittingStatus;
}

const plans: ProcedurePlan[] = [];
const sittings: ProcedureSitting[] = [];

const pHy = bindPersistentArray<ProcedurePlan>("procedure_plans", plans, () => []);
const sHy = bindPersistentArray<ProcedureSitting>("procedure_sittings", sittings, () => []);
await pHy.hydrate();
await sHy.hydrate();

function id(p: string): string {
  return `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function createPlan(input: Omit<ProcedurePlan, "id" | "status" | "createdAt" | "updatedAt"> & { initialSittings?: Array<{ scheduledFor: string }> }): { plan: ProcedurePlan; sittings: ProcedureSitting[] } {
  const at = new Date().toISOString();
  const plan: ProcedurePlan = {
    id: id("plan"),
    status: "scheduled",
    createdAt: at,
    updatedAt: at,
    ...input,
  };
  plans.unshift(plan);
  pHy.flush();

  // Initial sittings, if the caller provided them.
  const created: ProcedureSitting[] = [];
  if (input.initialSittings && input.initialSittings.length) {
    input.initialSittings.forEach((s, i) => {
      const sit: ProcedureSitting = {
        id: id("sit"),
        planId: plan.id,
        sequence: i + 1,
        scheduledFor: s.scheduledFor,
        status: "planned",
      };
      sittings.push(sit);
      created.push(sit);
    });
    sHy.flush();
  }
  return { plan, sittings: created };
}

export function completeSitting(sittingId: string, note?: string): { sitting: ProcedureSitting; plan: ProcedurePlan } | null {
  const sit = sittings.find((s) => s.id === sittingId);
  if (!sit) return null;
  sit.status = "done";
  sit.doneAt = new Date().toISOString();
  if (note) sit.note = note;
  sHy.flush();

  const plan = plans.find((p) => p.id === sit.planId);
  if (!plan) return null;
  // Roll up plan status — if all sittings done, mark plan complete.
  const planSittings = sittings.filter((s) => s.planId === plan.id);
  const doneCount = planSittings.filter((s) => s.status === "done").length;
  if (doneCount >= plan.plannedSittings) plan.status = "completed";
  else if (plan.status === "scheduled") plan.status = "in_progress";
  plan.updatedAt = new Date().toISOString();
  pHy.flush();
  return { sitting: sit, plan };
}

export function listPlans(filter: { patientEmail?: string; doctorId?: string } = {}): Array<ProcedurePlan & { progress: { done: number; planned: number } }> {
  let list = [...plans];
  if (filter.patientEmail) list = list.filter((p) => p.patientEmail.toLowerCase() === filter.patientEmail!.toLowerCase());
  if (filter.doctorId) list = list.filter((p) => p.doctorId === filter.doctorId);
  return list.map((p) => {
    const planSittings = sittings.filter((s) => s.planId === p.id);
    return {
      ...p,
      progress: {
        done: planSittings.filter((s) => s.status === "done").length,
        planned: p.plannedSittings,
      },
    };
  });
}

export function listSittingsForPlan(planId: string): ProcedureSitting[] {
  return sittings
    .filter((s) => s.planId === planId)
    .sort((a, b) => a.sequence - b.sequence);
}
