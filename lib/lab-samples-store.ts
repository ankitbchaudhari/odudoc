// Lab sample tracking with chain-of-custody. Spec v6.0 §14.
//
// Sample lifecycle: collected → received → processing → verified →
// reported. Each transition is a custody hop with actor + timestamp +
// signature; the chain is immutable in append-only audit storage.
//
// Critical-value escalation: if the test class has
// criticalValueEscalation = true and the result falls outside the
// critical band, the lab tech sets `critical: true` on the result
// row; the API surfaces it to the ordering doctor via WhatsApp + SMS
// + in-app push (notify pipeline) on submission.

import { bindPersistentArray } from "./persistent-array";
import type { LabTestClass } from "./lab-test-classes";

export type SampleStatus =
  | "collected"
  | "received"
  | "processing"
  | "verified"
  | "reported";

export interface SampleCustodyHop {
  at: string;
  actor: string;
  status: SampleStatus;
  /** "Picked up at home", "Received at lab Mumbai", etc. */
  location?: string;
  /** Optional digital signature for chain-of-custody. */
  signature?: string;
}

export interface LabSample {
  id: string;
  /** Optional accession # printed on the barcode. */
  accession?: string;
  organizationId: string;
  patientEmail: string;
  patientName: string;
  /** Which lab class this falls under (drives compliance rules). */
  testClass: LabTestClass;
  /** Specific test names ordered on this sample (LOINC codes
   *  added when we ship the LOINC reference table). */
  tests: string[];
  /** Chain of custody — append-only. */
  custody: SampleCustodyHop[];
  /** True only when the class's chainOfCustody flag is set
   *  (drug testing, paternity, blood bank). Forces every hop to
   *  capture an actor + signature. */
  custodyEnforced: boolean;
  /** Computed status from the latest custody hop. */
  status: SampleStatus;
  /** Result text or structured payload once verified. */
  result?: string;
  critical?: boolean;
  reportedAt?: string;
  createdAt: string;
}

const samples: LabSample[] = [];
const hy = bindPersistentArray<LabSample>("lab_samples", samples, () => []);
await hy.hydrate();

function id(p: string): string {
  return `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function createSample(input: {
  organizationId: string;
  patientEmail: string;
  patientName: string;
  testClass: LabTestClass;
  tests: string[];
  custodyEnforced: boolean;
  collectedBy: string;
  location?: string;
}): LabSample {
  const at = new Date().toISOString();
  const s: LabSample = {
    id: id("ls"),
    accession: id("acc").toUpperCase(),
    organizationId: input.organizationId,
    patientEmail: input.patientEmail,
    patientName: input.patientName,
    testClass: input.testClass,
    tests: input.tests,
    custody: [{ at, actor: input.collectedBy, status: "collected", location: input.location }],
    custodyEnforced: input.custodyEnforced,
    status: "collected",
    createdAt: at,
  };
  samples.unshift(s);
  hy.flush();
  return s;
}

export function advanceCustody(sampleId: string, hop: Omit<SampleCustodyHop, "at">): LabSample | null {
  const s = samples.find((x) => x.id === sampleId);
  if (!s) return null;
  if (s.custodyEnforced && !hop.signature) {
    // Caller didn't supply a signature on a chain-of-custody sample.
    // Reject — production would 422 with a clear reason.
    return null;
  }
  const at = new Date().toISOString();
  s.custody.push({ at, ...hop });
  s.status = hop.status;
  hy.flush();
  return s;
}

export function recordResult(sampleId: string, result: string, critical: boolean, signedBy: string): LabSample | null {
  const s = samples.find((x) => x.id === sampleId);
  if (!s) return null;
  s.result = result;
  s.critical = critical;
  s.reportedAt = new Date().toISOString();
  s.status = "reported";
  s.custody.push({
    at: s.reportedAt,
    actor: signedBy,
    status: "reported",
    location: "Lab",
  });
  hy.flush();
  return s;
}

export function listSamples(filter: { patientEmail?: string; organizationId?: string } = {}): LabSample[] {
  let list = [...samples];
  if (filter.patientEmail) list = list.filter((s) => s.patientEmail.toLowerCase() === filter.patientEmail!.toLowerCase());
  if (filter.organizationId) list = list.filter((s) => s.organizationId === filter.organizationId);
  return list;
}

export function getSample(sampleId: string): LabSample | null {
  return samples.find((s) => s.id === sampleId) || null;
}
