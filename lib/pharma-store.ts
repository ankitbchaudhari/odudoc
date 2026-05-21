// V7 §3 — Pharmaceutical company workflows.
//
// Five things lives here:
//   1. PharmaCompany — entity registration (V7 §3.2)
//   2. DrugMasterEntry — V7 §3.3 contribution to the universal master
//      with INN + multi-language aliases. The single source of truth
//      every prescription engine reads.
//   3. MedicalRepresentative — V7 §3.5 MR management
//   4. ADR (AdverseDrugReaction) — V7 §3.7 reporting + optional
//      escalation to national pharmacovigilance.
//   5. BatchSerial — V7 §3.6 anti-counterfeit system. Pharma issues a
//      batch with N serial codes; verifier scans the QR/code and
//      confirms (a) the code exists, (b) hasn't been scanned by a
//      consumer before, (c) is within shelf life.
//
// The V12 schema (lib/drizzle/schema-v12.ts) defines the relational
// shape for all of these; this file stays on bindPersistentArray
// until the per-store cutover ship for those tables.

import { bindPersistentArray } from "@/lib/persistent-array";
import { recordEvent } from "@/lib/accountability-store";
import { emit } from "@/lib/cross-connections";

// ── 1. Pharma company ────────────────────────────────────────────

export interface PharmaCompany {
  id: string;
  name: string;
  country: string;
  taxId?: string;
  websiteUrl?: string;
  status: "active" | "suspended";
  /** Number of drugs contributed to drug_master. */
  drugCount: number;
  /** Number of active MRs. */
  mrCount: number;
  createdAt: string;
  updatedAt: string;
}

// ── 2. Drug master entry ─────────────────────────────────────────

export interface DrugAlias {
  /** ISO locale e.g. en-IN | ru-RU | ko-KR | hi-IN */
  locale: string;
  kind: "brand" | "generic";
  localName: string;
  manufacturerId?: string;
}

export interface DrugMasterEntry {
  id: string;
  /** INN — Universal Core (V6 layer 1). One drug = one INN row. */
  inn: string;
  atcCode?: string;
  /** X|H1|G|OTC|NDPS_X regulatory schedule. */
  schedule?: string;
  /** Multi-language brand + generic names (V6 layer 2). */
  aliases: DrugAlias[];
  /** Pharma company that originally contributed this entry. The drug
   *  master is shared — anyone can contribute, but contributions are
   *  attributed for accountability + dispute. */
  contributedByPharmaId: string;
  /** Standard dosages this drug ships with. */
  forms: Array<{ strength: string; form: string }>; // [{strength:"500mg", form:"tablet"}]
  /** Known DDI keywords for the V13 prescription DDI checker. */
  ddiKeywords: string[];
  /** Has Odudoc medical board reviewed this entry? V7 §3.3 — anyone
   *  can contribute but Odudoc Standard entries are reviewed. */
  reviewed: boolean;
  reviewedAt?: string;
  reviewedBy?: string;
  status: "draft" | "published" | "rejected";
  createdAt: string;
  updatedAt: string;
}

// ── 3. Medical representative ────────────────────────────────────

export interface MedicalRep {
  id: string;
  pharmaCompanyId: string;
  name: string;
  email: string;
  phone?: string;
  /** Territory string — "Mumbai West", "Vadodara + Anand". */
  territory?: string;
  /** Linked OduDoc user id if the MR has an account. */
  userId?: string;
  status: "active" | "inactive";
  createdAt: string;
}

// ── 4. ADR (Adverse Drug Reaction) ───────────────────────────────

export interface AdverseDrugReaction {
  id: string;
  /** Optional patient — privacy is intentional, often the reporter is
   *  pharmacist not the patient. */
  patientId?: string;
  drugInn: string;
  /** Suspected manufacturer — used to route to the right pharma. */
  manufacturerPharmaId?: string;
  severity: "mild" | "moderate" | "severe" | "life_threatening" | "fatal";
  reaction: string;
  onsetAt?: string;
  reportedByEmail: string;
  reportedByRole?: string;
  reportedAt: string;
  /** Was this escalated to the national pharmacovigilance database
   *  (CDSCO PvPI in India)? */
  pvSentAt?: string;
  pvReference?: string;
  /** Has the pharma company acknowledged? */
  pharmaAckAt?: string;
  pharmaAckByEmail?: string;
}

// ── 5. Anti-counterfeit batch + serials ──────────────────────────

export interface DrugBatch {
  id: string;
  pharmaCompanyId: string;
  drugInn: string;
  brandName: string;
  batchNumber: string;
  manufacturedOn: string;
  expiresOn: string;
  unitsIssued: number;
  /** Manufacturing site — printed on the verify page for assurance. */
  manufacturingSite?: string;
  status: "active" | "recalled";
  recallReason?: string;
  recalledAt?: string;
  createdAt: string;
}

export interface BatchSerial {
  /** Composite — the public-facing QR/code includes both. */
  serialCode: string;        // unique, scannable
  batchId: string;
  status: "unscanned" | "scanned" | "duplicate_scan" | "recalled";
  /** First scan timestamp — establishes ownership for the consumer. */
  firstScannedAt?: string;
  firstScannedBy?: string;
  /** Subsequent scans get logged as duplicate_scan attempts (potential
   *  counterfeit being shopped around). */
  scanCount: number;
}

// ── Storage ──────────────────────────────────────────────────────

const companies: PharmaCompany[] = [];
const drugs: DrugMasterEntry[] = [];
const mrs: MedicalRep[] = [];
const adrs: AdverseDrugReaction[] = [];
const batches: DrugBatch[] = [];
const serials: BatchSerial[] = [];

const companiesHandle = bindPersistentArray<PharmaCompany>("pharma_companies", companies, () => SEED_COMPANIES);
const drugsHandle     = bindPersistentArray<DrugMasterEntry>("pharma_drugs", drugs, () => SEED_DRUGS);
const mrsHandle       = bindPersistentArray<MedicalRep>("pharma_mrs", mrs);
const adrsHandle      = bindPersistentArray<AdverseDrugReaction>("pharma_adrs", adrs);
const batchesHandle   = bindPersistentArray<DrugBatch>("pharma_batches", batches);
const serialsHandle   = bindPersistentArray<BatchSerial>("pharma_batch_serials", serials);

let hydrated = false;
async function ensureHydrated() {
  if (hydrated) return;
  await Promise.all([
    companiesHandle.hydrate(), drugsHandle.hydrate(), mrsHandle.hydrate(),
    adrsHandle.hydrate(), batchesHandle.hydrate(), serialsHandle.hydrate(),
  ]);
  hydrated = true;
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// ── Pharma companies ─────────────────────────────────────────────

export async function listPharmaCompanies(): Promise<PharmaCompany[]> {
  await ensureHydrated();
  // Recompute drugCount + mrCount from the source-of-truth arrays so
  // they're never stale even if a delete bypassed the company row.
  return companies.map((c) => ({
    ...c,
    drugCount: drugs.filter((d) => d.contributedByPharmaId === c.id).length,
    mrCount: mrs.filter((m) => m.pharmaCompanyId === c.id && m.status === "active").length,
  }));
}

export async function getPharmaCompany(id: string): Promise<PharmaCompany | null> {
  await ensureHydrated();
  return companies.find((c) => c.id === id) || null;
}

export async function upsertPharmaCompany(input: Omit<PharmaCompany, "id" | "drugCount" | "mrCount" | "createdAt" | "updatedAt"> & { id?: string }): Promise<PharmaCompany> {
  await ensureHydrated();
  const now = new Date().toISOString();
  if (input.id) {
    const existing = companies.find((c) => c.id === input.id);
    if (existing) {
      Object.assign(existing, input, { updatedAt: now });
      companiesHandle.flush();
      return existing;
    }
  }
  const c: PharmaCompany = {
    id: input.id || uid("pharma"),
    name: input.name,
    country: input.country,
    taxId: input.taxId,
    websiteUrl: input.websiteUrl,
    status: input.status || "active",
    drugCount: 0,
    mrCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  companies.push(c);
  companiesHandle.flush();
  return c;
}

// ── Drug master ──────────────────────────────────────────────────

export async function listDrugs(filter: { pharmaCompanyId?: string; status?: DrugMasterEntry["status"]; search?: string } = {}): Promise<DrugMasterEntry[]> {
  await ensureHydrated();
  let rows = [...drugs];
  if (filter.pharmaCompanyId) rows = rows.filter((d) => d.contributedByPharmaId === filter.pharmaCompanyId);
  if (filter.status) rows = rows.filter((d) => d.status === filter.status);
  if (filter.search) {
    const q = filter.search.toLowerCase();
    rows = rows.filter((d) =>
      d.inn.toLowerCase().includes(q) ||
      d.aliases.some((a) => a.localName.toLowerCase().includes(q)),
    );
  }
  return rows.sort((a, b) => a.inn.localeCompare(b.inn));
}

export async function getDrugByInn(inn: string): Promise<DrugMasterEntry | null> {
  await ensureHydrated();
  return drugs.find((d) => d.inn.toLowerCase() === inn.toLowerCase()) || null;
}

export interface DrugContributionInput {
  inn: string;
  atcCode?: string;
  schedule?: string;
  aliases: DrugAlias[];
  contributedByPharmaId: string;
  forms?: DrugMasterEntry["forms"];
  ddiKeywords?: string[];
}

export async function contributeDrug(input: DrugContributionInput): Promise<{ ok: boolean; drug?: DrugMasterEntry; error?: string }> {
  await ensureHydrated();
  // INN uniqueness — if it exists, this is an UPDATE proposal not a
  // new contribution. Owner pharma OR Odudoc review board can merge
  // aliases; anyone else's contribution to an existing INN comes in
  // as status=draft until review.
  const existing = drugs.find((d) => d.inn.toLowerCase() === input.inn.toLowerCase());
  if (existing) {
    if (existing.contributedByPharmaId === input.contributedByPharmaId) {
      // Same pharma updating own entry — merge aliases.
      for (const a of input.aliases) {
        if (!existing.aliases.some((x) => x.locale === a.locale && x.localName === a.localName)) {
          existing.aliases.push(a);
        }
      }
      existing.updatedAt = new Date().toISOString();
      drugsHandle.flush();
      emit("drug_master.updated", { drugInn: existing.inn, contributedByPharmaId: input.contributedByPharmaId });
      return { ok: true, drug: existing };
    }
    return { ok: false, error: "inn_owned_by_other_pharma" };
  }
  const now = new Date().toISOString();
  const d: DrugMasterEntry = {
    id: uid("drug"),
    inn: input.inn,
    atcCode: input.atcCode,
    schedule: input.schedule,
    aliases: input.aliases,
    contributedByPharmaId: input.contributedByPharmaId,
    forms: input.forms || [],
    ddiKeywords: input.ddiKeywords || [],
    reviewed: false,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
  drugs.push(d);
  drugsHandle.flush();
  emit("drug_master.updated", { drugInn: d.inn, contributedByPharmaId: d.contributedByPharmaId });
  return { ok: true, drug: d };
}

export async function reviewDrug(id: string, decision: "published" | "rejected", reviewer: { email: string }): Promise<DrugMasterEntry | null> {
  await ensureHydrated();
  const d = drugs.find((x) => x.id === id);
  if (!d) return null;
  d.status = decision;
  d.reviewed = true;
  d.reviewedAt = new Date().toISOString();
  d.reviewedBy = reviewer.email;
  d.updatedAt = d.reviewedAt;
  drugsHandle.flush();
  await recordEvent({
    category: "admin",
    action: `drug_master.${decision}`,
    actorEmail: reviewer.email,
    actorRole: "admin",
    subjectKind: "drug_master_entry",
    subjectId: d.id,
    summary: `Drug ${d.inn} ${decision} by Odudoc medical board.`,
  }).catch(() => {});
  return d;
}

// ── Medical Representatives ──────────────────────────────────────

export async function listMrs(pharmaCompanyId?: string): Promise<MedicalRep[]> {
  await ensureHydrated();
  return mrs
    .filter((m) => !pharmaCompanyId || m.pharmaCompanyId === pharmaCompanyId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function upsertMr(input: Omit<MedicalRep, "id" | "createdAt"> & { id?: string }): Promise<MedicalRep> {
  await ensureHydrated();
  if (input.id) {
    const existing = mrs.find((m) => m.id === input.id);
    if (existing) {
      Object.assign(existing, input);
      mrsHandle.flush();
      return existing;
    }
  }
  const m: MedicalRep = {
    id: input.id || uid("mr"),
    pharmaCompanyId: input.pharmaCompanyId,
    name: input.name,
    email: input.email,
    phone: input.phone,
    territory: input.territory,
    userId: input.userId,
    status: input.status || "active",
    createdAt: new Date().toISOString(),
  };
  mrs.push(m);
  mrsHandle.flush();
  return m;
}

// ── ADR ──────────────────────────────────────────────────────────

export interface ReportAdrInput {
  patientId?: string;
  drugInn: string;
  manufacturerPharmaId?: string;
  severity: AdverseDrugReaction["severity"];
  reaction: string;
  onsetAt?: string;
  reportedByEmail: string;
  reportedByRole?: string;
}

export async function reportAdr(input: ReportAdrInput): Promise<AdverseDrugReaction> {
  await ensureHydrated();
  const r: AdverseDrugReaction = {
    id: uid("adr"),
    patientId: input.patientId,
    drugInn: input.drugInn,
    manufacturerPharmaId: input.manufacturerPharmaId,
    severity: input.severity,
    reaction: input.reaction,
    onsetAt: input.onsetAt,
    reportedByEmail: input.reportedByEmail,
    reportedByRole: input.reportedByRole,
    reportedAt: new Date().toISOString(),
  };
  adrs.push(r);
  adrsHandle.flush();
  // V13: serious / life-threatening / fatal ADRs are critical events.
  const accountabilitySeverity: "info" | "high" | "critical" =
    r.severity === "life_threatening" || r.severity === "fatal" ? "critical"
    : r.severity === "severe" ? "high"
    : "info";
  await recordEvent({
    category: "clinical",
    action: "adr.reported",
    actorEmail: r.reportedByEmail,
    actorRole: r.reportedByRole,
    severity: accountabilitySeverity,
    subjectKind: "adr",
    subjectId: r.id,
    summary: `${r.severity.toUpperCase()} ADR — ${r.drugInn}: ${r.reaction}`,
    after: { drugInn: r.drugInn, severity: r.severity },
  }).catch(() => {});
  return r;
}

export async function listAdrs(filter: { drugInn?: string; manufacturerPharmaId?: string; severity?: AdverseDrugReaction["severity"]; pvSentOnly?: boolean } = {}): Promise<AdverseDrugReaction[]> {
  await ensureHydrated();
  let rows = [...adrs];
  if (filter.drugInn) rows = rows.filter((r) => r.drugInn.toLowerCase() === filter.drugInn!.toLowerCase());
  if (filter.manufacturerPharmaId) rows = rows.filter((r) => r.manufacturerPharmaId === filter.manufacturerPharmaId);
  if (filter.severity) rows = rows.filter((r) => r.severity === filter.severity);
  if (filter.pvSentOnly) rows = rows.filter((r) => Boolean(r.pvSentAt));
  return rows.sort((a, b) => b.reportedAt.localeCompare(a.reportedAt));
}

export async function escalateAdrToPv(id: string, pvReference: string): Promise<AdverseDrugReaction | null> {
  await ensureHydrated();
  const r = adrs.find((x) => x.id === id);
  if (!r) return null;
  r.pvSentAt = new Date().toISOString();
  r.pvReference = pvReference;
  adrsHandle.flush();
  return r;
}

export async function pharmaAcknowledgeAdr(id: string, by: { email: string }): Promise<AdverseDrugReaction | null> {
  await ensureHydrated();
  const r = adrs.find((x) => x.id === id);
  if (!r) return null;
  r.pharmaAckAt = new Date().toISOString();
  r.pharmaAckByEmail = by.email;
  adrsHandle.flush();
  return r;
}

// ── Anti-counterfeit batches + serials ───────────────────────────

export interface IssueBatchInput {
  pharmaCompanyId: string;
  drugInn: string;
  brandName: string;
  batchNumber: string;
  manufacturedOn: string;
  expiresOn: string;
  unitsIssued: number;
  manufacturingSite?: string;
}

export async function issueBatch(input: IssueBatchInput): Promise<{ batch: DrugBatch; sampleSerials: string[] }> {
  await ensureHydrated();
  const batch: DrugBatch = {
    id: uid("batch"),
    pharmaCompanyId: input.pharmaCompanyId,
    drugInn: input.drugInn,
    brandName: input.brandName,
    batchNumber: input.batchNumber,
    manufacturedOn: input.manufacturedOn,
    expiresOn: input.expiresOn,
    unitsIssued: input.unitsIssued,
    manufacturingSite: input.manufacturingSite,
    status: "active",
    createdAt: new Date().toISOString(),
  };
  batches.push(batch);

  // Generate the requested number of serial codes. Each is a short
  // alphanumeric (10 chars, base32-ish, no I/O/0/1) so the printed
  // QR is small + scan-friendly.
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const newSerials: BatchSerial[] = [];
  for (let i = 0; i < input.unitsIssued; i++) {
    let code = "";
    for (let j = 0; j < 10; j++) code += charset[Math.floor(Math.random() * charset.length)];
    newSerials.push({
      serialCode: `${batch.batchNumber}-${code}`,
      batchId: batch.id,
      status: "unscanned",
      scanCount: 0,
    });
  }
  serials.push(...newSerials);

  batchesHandle.flush();
  serialsHandle.flush();

  await recordEvent({
    category: "admin",
    action: "anti_counterfeit.batch_issued",
    actorEmail: "pharma_admin",
    actorRole: "pharma",
    subjectKind: "drug_batch",
    subjectId: batch.id,
    summary: `Batch ${batch.batchNumber} of ${batch.brandName} (${batch.drugInn}) issued · ${input.unitsIssued} units · expires ${batch.expiresOn}`,
  }).catch(() => {});

  // Return only a sample of serials (first 8) — the printer + label
  // pipeline does the bulk export separately so we don't ship 100k
  // strings back through HTTP.
  return { batch, sampleSerials: newSerials.slice(0, 8).map((s) => s.serialCode) };
}

export async function listBatches(pharmaCompanyId?: string): Promise<DrugBatch[]> {
  await ensureHydrated();
  return batches
    .filter((b) => !pharmaCompanyId || b.pharmaCompanyId === pharmaCompanyId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function recallBatch(batchId: string, reason: string): Promise<DrugBatch | null> {
  await ensureHydrated();
  const b = batches.find((x) => x.id === batchId);
  if (!b) return null;
  b.status = "recalled";
  b.recallReason = reason;
  b.recalledAt = new Date().toISOString();
  // Mark every serial in the batch as recalled so future scans return
  // a clear warning.
  for (const s of serials) {
    if (s.batchId === batchId) s.status = "recalled";
  }
  batchesHandle.flush();
  serialsHandle.flush();
  await recordEvent({
    category: "clinical",
    action: "anti_counterfeit.batch_recalled",
    actorEmail: "pharma_admin",
    actorRole: "pharma",
    severity: "high",
    subjectKind: "drug_batch",
    subjectId: b.id,
    summary: `Batch ${b.batchNumber} of ${b.brandName} RECALLED · ${reason}`,
  }).catch(() => {});
  return b;
}

// ── Public verification (called from /verify-medicine) ───────────

export interface VerifyResult {
  status: "authentic" | "duplicate_scan" | "recalled" | "expired" | "not_found";
  message: string;
  /** Populated when status is authentic / duplicate / recalled / expired. */
  drug?: { brandName: string; drugInn: string; manufacturedOn: string; expiresOn: string; manufacturingSite?: string };
  /** First-scan timestamp when status is duplicate_scan. */
  firstScannedAt?: string;
}

export async function verifySerial(serialCode: string, scannedByEmail?: string): Promise<VerifyResult> {
  await ensureHydrated();
  const s = serials.find((x) => x.serialCode.toUpperCase() === serialCode.toUpperCase());
  if (!s) {
    return { status: "not_found", message: "This code is not in the OduDoc anti-counterfeit registry. The medicine may be counterfeit." };
  }
  const batch = batches.find((b) => b.id === s.batchId);
  if (!batch) {
    return { status: "not_found", message: "Batch not found — anomaly. Treat as suspicious." };
  }
  const drugInfo = {
    brandName: batch.brandName,
    drugInn: batch.drugInn,
    manufacturedOn: batch.manufacturedOn,
    expiresOn: batch.expiresOn,
    manufacturingSite: batch.manufacturingSite,
  };

  // Recalled wins over everything else.
  if (batch.status === "recalled" || s.status === "recalled") {
    return { status: "recalled", message: `This batch has been recalled by the manufacturer. Reason: ${batch.recallReason || "see pharma notice"}. Do not consume.`, drug: drugInfo };
  }
  // Expired check.
  if (new Date(batch.expiresOn) < new Date()) {
    return { status: "expired", message: `This batch expired on ${batch.expiresOn}. Do not consume.`, drug: drugInfo };
  }
  // Duplicate-scan check.
  if (s.status === "scanned") {
    s.scanCount++;
    s.status = "duplicate_scan";
    serialsHandle.flush();
    return {
      status: "duplicate_scan",
      message: `WARNING — this code was first scanned ${s.firstScannedAt ? new Date(s.firstScannedAt).toLocaleString() : "earlier"}. If you have not scanned this pack before, the medicine may be counterfeit.`,
      drug: drugInfo,
      firstScannedAt: s.firstScannedAt,
    };
  }
  if (s.status === "duplicate_scan") {
    s.scanCount++;
    serialsHandle.flush();
    return {
      status: "duplicate_scan",
      message: `WARNING — this code has been scanned ${s.scanCount + 1} times. First scan: ${s.firstScannedAt ? new Date(s.firstScannedAt).toLocaleString() : "earlier"}. Likely counterfeit.`,
      drug: drugInfo,
      firstScannedAt: s.firstScannedAt,
    };
  }
  // First-time scan — mark + return authentic.
  s.status = "scanned";
  s.firstScannedAt = new Date().toISOString();
  s.firstScannedBy = scannedByEmail;
  s.scanCount = 1;
  serialsHandle.flush();
  return {
    status: "authentic",
    message: `Authentic. Manufactured ${batch.manufacturedOn}. Use before ${batch.expiresOn}.`,
    drug: drugInfo,
  };
}

// ── Seeds ────────────────────────────────────────────────────────

const SEED_COMPANIES: PharmaCompany[] = [
  {
    id: "demo-pharma-cipla",
    name: "Cipla Limited",
    country: "IN",
    taxId: "27AAACC1206D1Z2",
    websiteUrl: "https://cipla.com",
    status: "active",
    drugCount: 0,
    mrCount: 0,
    createdAt: "2026-05-21T00:00:00.000Z",
    updatedAt: "2026-05-21T00:00:00.000Z",
  },
];

const SEED_DRUGS: DrugMasterEntry[] = [
  {
    id: "drug_paracetamol",
    inn: "Paracetamol",
    atcCode: "N02BE01",
    schedule: "OTC",
    aliases: [
      { locale: "en-IN", kind: "generic", localName: "Paracetamol" },
      { locale: "en-IN", kind: "brand",   localName: "Crocin", manufacturerId: "demo-pharma-gsk" },
      { locale: "en-US", kind: "brand",   localName: "Tylenol", manufacturerId: "demo-pharma-jnj" },
      { locale: "hi-IN", kind: "generic", localName: "पेरासिटामोल" },
      { locale: "ru-RU", kind: "generic", localName: "Парацетамол" },
    ],
    contributedByPharmaId: "demo-pharma-cipla",
    forms: [{ strength: "500mg", form: "tablet" }, { strength: "650mg", form: "tablet" }, { strength: "120mg/5ml", form: "syrup" }],
    ddiKeywords: ["warfarin", "carbamazepine"],
    reviewed: true,
    reviewedAt: "2026-05-21T00:00:00.000Z",
    reviewedBy: "medical-board@odudoc.com",
    status: "published",
    createdAt: "2026-05-21T00:00:00.000Z",
    updatedAt: "2026-05-21T00:00:00.000Z",
  },
];
