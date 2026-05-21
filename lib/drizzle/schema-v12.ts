// V12 of the Master Spec — 47 missing tables added, cross-connection
// gaps fixed, naming inconsistencies resolved.
//
// This file is the relational source-of-truth for everything the V4-V13
// surfaces touch beyond the Phase 1-6 tables already in schema.ts.
// Every existing lib/*-store.ts that uses bindPersistentArray maps 1:1
// onto a table below, so the eventual blob → relational cutover is
// a straight backfill (one row per JSON record, same id, same field
// names where possible).
//
// Conventions inherited from schema.ts:
//   - IDs are TEXT (matches the existing "wal_xxx", "ppme_xxx" style)
//   - Timestamps with timezone, defaultNow()
//   - Status fields are text with CHECK-via-enum in app code (no pg enum
//     because ALTER TYPE on a live DB requires superuser)
//   - Every FK column gets its own index
//   - Every column used in WHERE / ORDER BY gets an index
//   - Composite indexes for the V12 §6.2 hottest query patterns
//   - Soft-delete (deletedAt) only on user-visible resources
//   - No CASCADE — we want the FK error, not silent loss
//
// V12 §5.1 RLS policies + V12 §6.1 TimescaleDB hypertable creation +
// V12 §6.2 composite-index additions that drizzle-kit can't express
// live in scripts/v12-postgres-policies.sql (run after `db:migrate`).

import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { users, doctors } from "./schema";

// ═══════════════════════════════════════════════════════════════════
// SECTION A — Multi-tenant root (V12 §1.3 added — every clinical
// table is RLS-scoped by tenantId, so the tenants/hospitals table
// is the chain root)
// ═══════════════════════════════════════════════════════════════════

// 1. hospitals (also covers clinics — V12 §1.4 unified the duplicate
//    "clinics" + "hospital_facilities" tables that were drifting)
export const hospitals = pgTable(
  "hospitals",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    legalName: text("legal_name"),
    type: text("type").notNull().default("hospital"), // hospital|clinic|polyclinic|nursing_home
    /** ISO 3166-1 alpha-2 country code — drives V12 §5.1 RLS country
     *  pod scoping. */
    country: text("country").notNull().default("IN"),
    state: text("state"),
    city: text("city"),
    addressLine: text("address_line"),
    pincode: text("pincode"),
    phone: text("phone"),
    email: text("email"),
    websiteUrl: text("website_url"),
    /** Regulator registration (CEA in India, JCI globally). */
    regulatorId: text("regulator_id"),
    bedCount: integer("bed_count"),
    /** V11 entity profile slug — joins to entity_profiles. */
    profileSlug: text("profile_slug"),
    status: text("status").notNull().default("active"), // active|suspended|closed
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    countryIdx: index("hospitals_country_idx").on(t.country),
    cityIdx: index("hospitals_city_idx").on(t.city),
    statusIdx: index("hospitals_status_idx").on(t.status),
    countryCityIdx: index("hospitals_country_city_idx").on(t.country, t.city),
  }),
);

// 2. departments — Cardiology / Orthopaedics / OB-Gyn / etc. per hospital
export const departments = pgTable(
  "departments",
  {
    id: text("id").primaryKey(),
    hospitalId: text("hospital_id").notNull().references(() => hospitals.id),
    name: text("name").notNull(),
    /** Standard category code so cross-hospital reports group cleanly. */
    code: text("code").notNull(), // cardiology|orthopaedics|...
    hodEmail: text("hod_email"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    hospitalIdx: index("departments_hospital_idx").on(t.hospitalId),
    codeIdx: index("departments_code_idx").on(t.code),
    hospitalCodeIdx: unique("departments_hospital_code_unique").on(t.hospitalId, t.code),
  }),
);

// 3. wards
export const wards = pgTable(
  "wards",
  {
    id: text("id").primaryKey(),
    hospitalId: text("hospital_id").notNull().references(() => hospitals.id),
    departmentId: text("department_id").references(() => departments.id),
    name: text("name").notNull(),
    /** Ward category drives RLS visibility for nurse roles. */
    kind: text("kind").notNull().default("general"), // general|icu|hdu|maternity|paediatric|isolation
    bedCount: integer("bed_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    hospitalIdx: index("wards_hospital_idx").on(t.hospitalId),
    kindIdx: index("wards_kind_idx").on(t.kind),
  }),
);

// 4. beds
export const beds = pgTable(
  "beds",
  {
    id: text("id").primaryKey(),
    wardId: text("ward_id").notNull().references(() => wards.id),
    label: text("label").notNull(), // "12", "ICU-3", "OT-1"
    status: text("status").notNull().default("vacant"), // vacant|occupied|cleaning|out_of_service
    occupantPatientId: text("occupant_patient_id"),
    occupiedAt: timestamp("occupied_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    wardIdx: index("beds_ward_idx").on(t.wardId),
    statusIdx: index("beds_status_idx").on(t.status),
    occupantIdx: index("beds_occupant_idx").on(t.occupantPatientId),
  }),
);

// ═══════════════════════════════════════════════════════════════════
// SECTION B — Patient + family + clinical records
// (V12 §1.2 closed the gap where patients were only in the users blob)
// ═══════════════════════════════════════════════════════════════════

// 5. patients — clinical-domain extension of users (one-to-one with
//    users.id when the patient also has a login; standalone row when
//    the patient is a walk-in without an account)
export const patients = pgTable(
  "patients",
  {
    id: text("id").primaryKey(),
    /** Optional link to users — nullable for walk-ins. */
    userId: text("user_id").references(() => users.id),
    /** Hospital that originated the record. RLS-scoped. */
    tenantId: text("tenant_id").references(() => hospitals.id),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    dob: timestamp("dob", { withTimezone: true, mode: "string" }),
    gender: text("gender"),
    bloodGroup: text("blood_group"),
    /** ABHA (India national health ID) when linked. */
    abhaId: text("abha_id"),
    /** Photo URL from V9 §2 upload — used for wristband identity check. */
    photoUrl: text("photo_url"),
    /** JSON: known allergies, chronic conditions, current medications. */
    summary: jsonb("summary").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    userIdx: index("patients_user_idx").on(t.userId),
    tenantIdx: index("patients_tenant_idx").on(t.tenantId),
    phoneIdx: index("patients_phone_idx").on(t.phone),
    abhaIdx: index("patients_abha_idx").on(t.abhaId),
  }),
);

// 6. family_members — V6 cross-connection 1 patient registration also
//    seeds the family graph
export const familyMembers = pgTable(
  "family_members",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id").notNull().references(() => patients.id),
    /** The OTHER person — either an existing patient id or a name+phone
     *  stub if they don't have a record yet. */
    relatedPatientId: text("related_patient_id").references(() => patients.id),
    relatedName: text("related_name"),
    relatedPhone: text("related_phone"),
    /** spouse | child | parent | sibling | guardian. */
    relationship: text("relationship").notNull(),
    /** Can the related person access this patient's records? */
    canAccess: boolean("can_access").notNull().default(false),
    consentAt: timestamp("consent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    patientIdx: index("family_members_patient_idx").on(t.patientId),
    relatedPatientIdx: index("family_members_related_patient_idx").on(t.relatedPatientId),
  }),
);

// 7. encounters — every OPD visit / video consult / IPD admission
//    contributes one encounter row
export const encounters = pgTable(
  "encounters",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").references(() => hospitals.id),
    patientId: text("patient_id").notNull().references(() => patients.id),
    doctorId: text("doctor_id").references(() => doctors.id),
    departmentId: text("department_id").references(() => departments.id),
    /** opd|ipd|telemedicine|home_visit|emergency|observation. */
    kind: text("kind").notNull(),
    chiefComplaint: text("chief_complaint"),
    /** SOAP note JSON: { subjective, objective, assessment, plan }. */
    soap: jsonb("soap"),
    diagnosis: text("diagnosis"),
    icd10Codes: jsonb("icd10_codes").default(sql`'[]'::jsonb`),
    status: text("status").notNull().default("open"), // open|closed|cancelled
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index("encounters_tenant_idx").on(t.tenantId),
    patientIdx: index("encounters_patient_idx").on(t.patientId),
    doctorIdx: index("encounters_doctor_idx").on(t.doctorId),
    departmentIdx: index("encounters_department_idx").on(t.departmentId),
    kindIdx: index("encounters_kind_idx").on(t.kind),
    statusIdx: index("encounters_status_idx").on(t.status),
    // V12 §6.2 hot path: patient timeline = patient_id + started_at DESC
    patientStartedIdx: index("encounters_patient_started_idx").on(t.patientId, t.startedAt),
    // Doctor's own queue = doctor_id + status + started_at
    doctorStatusStartedIdx: index("encounters_doctor_status_started_idx").on(t.doctorId, t.status, t.startedAt),
  }),
);

// 8. admissions — IPD admission header (an encounter of kind=ipd has
//    exactly one admission row)
export const admissions = pgTable(
  "admissions",
  {
    id: text("id").primaryKey(),
    encounterId: text("encounter_id").notNull().references(() => encounters.id),
    patientId: text("patient_id").notNull().references(() => patients.id),
    bedId: text("bed_id").references(() => beds.id),
    admittingDoctorId: text("admitting_doctor_id").references(() => doctors.id),
    reason: text("reason"),
    estimatedDays: integer("estimated_days"),
    admittedAt: timestamp("admitted_at", { withTimezone: true }).notNull().defaultNow(),
    dischargedAt: timestamp("discharged_at", { withTimezone: true }),
    status: text("status").notNull().default("admitted"), // admitted|discharged|absconded|deceased|transferred
  },
  (t) => ({
    patientIdx: index("admissions_patient_idx").on(t.patientId),
    bedIdx: index("admissions_bed_idx").on(t.bedId),
    statusIdx: index("admissions_status_idx").on(t.status),
    admittedIdx: index("admissions_admitted_at_idx").on(t.admittedAt),
  }),
);

// 9. discharges — V6 cross-connection 8 (discharge fans out to
//    billing, claims, follow-up reminder, satisfaction survey)
export const discharges = pgTable(
  "discharges",
  {
    id: text("id").primaryKey(),
    admissionId: text("admission_id").notNull().references(() => admissions.id),
    finalDiagnosis: text("final_diagnosis"),
    /** Discharge summary text or HTML. */
    summaryHtml: text("summary_html"),
    /** Take-home prescription is its own row in prescriptions; we link
     *  back here. */
    takeHomePrescriptionId: text("take_home_prescription_id"),
    followUpInDays: integer("follow_up_in_days"),
    dischargingDoctorId: text("discharging_doctor_id").references(() => doctors.id),
    dischargedAt: timestamp("discharged_at", { withTimezone: true }).notNull().defaultNow(),
    /** SHA-256 of the locked summary so the V4 §2 PDF can prove
     *  tamper-evidence. */
    summaryHash: text("summary_hash"),
  },
  (t) => ({
    admissionIdx: index("discharges_admission_idx").on(t.admissionId),
    dischargedAtIdx: index("discharges_discharged_at_idx").on(t.dischargedAt),
  }),
);

// 10. prescriptions — header. Items in prescription_items below.
export const prescriptions = pgTable(
  "prescriptions",
  {
    id: text("id").primaryKey(),
    encounterId: text("encounter_id").references(() => encounters.id),
    patientId: text("patient_id").notNull().references(() => patients.id),
    doctorId: text("doctor_id").references(() => doctors.id),
    /** Where the patient prefers to fill it. */
    pharmacyId: text("pharmacy_id"),
    /** Patient's preferred language for the printable PDF. */
    locale: text("locale").notNull().default("en"),
    status: text("status").notNull().default("active"), // active|filled|expired|cancelled
    notes: text("notes"),
    prescriptionHash: text("prescription_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (t) => ({
    patientIdx: index("prescriptions_patient_idx").on(t.patientId),
    doctorIdx: index("prescriptions_doctor_idx").on(t.doctorId),
    encounterIdx: index("prescriptions_encounter_idx").on(t.encounterId),
    statusIdx: index("prescriptions_status_idx").on(t.status),
    createdAtIdx: index("prescriptions_created_at_idx").on(t.createdAt),
  }),
);

// 11. prescription_items
export const prescriptionItems = pgTable(
  "prescription_items",
  {
    id: text("id").primaryKey(),
    prescriptionId: text("prescription_id").notNull().references(() => prescriptions.id),
    /** INN (Universal Core layer per V12 §1.4 multi-language
     *  prescription engine). */
    drugInn: text("drug_inn").notNull(),
    /** Local resolved name at print time (may be brand, may be local
     *  generic). Snapshot — drug_master is the live source. */
    drugLocalName: text("drug_local_name"),
    dose: text("dose"),
    route: text("route"), // PO|IV|IM|SC|topical|inhaled|rectal
    frequency: text("frequency"), // BD|TDS|QID|OD|HS|...
    duration: text("duration"), // "7 days"
    instructionsKey: text("instructions_key"), // e.g. "AFTER_FOOD"
    quantity: integer("quantity"),
    position: integer("position").notNull().default(0),
  },
  (t) => ({
    prescriptionIdx: index("prescription_items_prescription_idx").on(t.prescriptionId),
    drugInnIdx: index("prescription_items_drug_inn_idx").on(t.drugInn),
  }),
);

// 12. lab_orders
export const labOrders = pgTable(
  "lab_orders",
  {
    id: text("id").primaryKey(),
    encounterId: text("encounter_id").references(() => encounters.id),
    patientId: text("patient_id").notNull().references(() => patients.id),
    doctorId: text("doctor_id").references(() => doctors.id),
    labId: text("lab_id"),
    /** comma-separated LOINC codes the order requests. */
    requestedCodes: jsonb("requested_codes").notNull().default(sql`'[]'::jsonb`),
    priority: text("priority").notNull().default("routine"), // stat|urgent|routine
    status: text("status").notNull().default("ordered"), // ordered|sample_collected|in_lab|reported|cancelled
    orderedAt: timestamp("ordered_at", { withTimezone: true }).notNull().defaultNow(),
    sampleCollectedAt: timestamp("sample_collected_at", { withTimezone: true }),
    reportedAt: timestamp("reported_at", { withTimezone: true }),
  },
  (t) => ({
    patientIdx: index("lab_orders_patient_idx").on(t.patientId),
    doctorIdx: index("lab_orders_doctor_idx").on(t.doctorId),
    labIdx: index("lab_orders_lab_idx").on(t.labId),
    statusIdx: index("lab_orders_status_idx").on(t.status),
    priorityStatusIdx: index("lab_orders_priority_status_idx").on(t.priority, t.status),
  }),
);

// 13. lab_results
export const labResults = pgTable(
  "lab_results",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id").notNull().references(() => labOrders.id),
    /** LOINC code. */
    code: text("code").notNull(),
    valueText: text("value_text"),
    valueNum: real("value_num"),
    unit: text("unit"),
    referenceLow: real("reference_low"),
    referenceHigh: real("reference_high"),
    /** out_of_range|critical_high|critical_low|normal|abnormal_flagged */
    flag: text("flag"),
    /** V13: was a critical-value flag raised to the doctor? */
    criticalAlertSentAt: timestamp("critical_alert_sent_at", { withTimezone: true }),
    criticalAcknowledgedAt: timestamp("critical_acknowledged_at", { withTimezone: true }),
    reportedAt: timestamp("reported_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orderIdx: index("lab_results_order_idx").on(t.orderId),
    codeIdx: index("lab_results_code_idx").on(t.code),
    flagIdx: index("lab_results_flag_idx").on(t.flag),
    // V12 §6.2 hot path: critical lab roll-up = flag + reported_at
    flagReportedIdx: index("lab_results_flag_reported_idx").on(t.flag, t.reportedAt),
  }),
);

// ═══════════════════════════════════════════════════════════════════
// SECTION C — ICU + IPD time-series (V12 §6.1 hypertables)
// ═══════════════════════════════════════════════════════════════════

// 14. icu_vitals — TimescaleDB hypertable. Partitioned by recorded_at.
//     Drizzle creates a regular table; scripts/v12-postgres-policies.sql
//     runs `SELECT create_hypertable(...)` after the table exists.
export const icuVitals = pgTable(
  "icu_vitals",
  {
    /** Composite PK (patient, recordedAt) instead of synthetic id — saves
     *  one index on a high-write table. */
    patientId: text("patient_id").notNull(),
    bedId: text("bed_id"),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
    heartRate: integer("heart_rate"),
    spo2: real("spo2"),
    systolicBp: integer("systolic_bp"),
    diastolicBp: integer("diastolic_bp"),
    meanArterialPressure: real("mean_arterial_pressure"),
    respiratoryRate: integer("respiratory_rate"),
    temperatureC: real("temperature_c"),
    /** Source device fingerprint — V13 accountability traceback. */
    deviceId: text("device_id"),
  },
  (t) => ({
    pkPatientTime: unique("icu_vitals_patient_time_pk").on(t.patientId, t.recordedAt),
    bedTimeIdx: index("icu_vitals_bed_time_idx").on(t.bedId, t.recordedAt),
  }),
);

// 15. observation_vitals — V4 §4.4 Observation Module timer module
export const observationVitals = pgTable(
  "observation_vitals",
  {
    patientId: text("patient_id").notNull(),
    observationId: text("observation_id").notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
    heartRate: integer("heart_rate"),
    spo2: real("spo2"),
    systolicBp: integer("systolic_bp"),
    diastolicBp: integer("diastolic_bp"),
    temperatureC: real("temperature_c"),
    painScore: integer("pain_score"),
    recordedBy: text("recorded_by"),
  },
  (t) => ({
    observationIdx: index("observation_vitals_observation_idx").on(t.observationId, t.recordedAt),
    patientIdx: index("observation_vitals_patient_idx").on(t.patientId, t.recordedAt),
  }),
);

// 16. mar_administrations — every MAR scan-to-give, hypertable
export const marAdministrations = pgTable(
  "mar_administrations",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id").notNull(),
    prescriptionItemId: text("prescription_item_id").references(() => prescriptionItems.id),
    /** Scheduled time the dose was due. */
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    /** Actual administration timestamp from the nurse scan. */
    administeredAt: timestamp("administered_at", { withTimezone: true }),
    administeredByEmail: text("administered_by_email"),
    coSignByEmail: text("co_sign_by_email"),
    /** given|missed|held|refused|partial */
    status: text("status").notNull().default("scheduled"),
    /** Required when a nurse marks missed/held/refused so V13 §3 doesn't
     *  flag it as an unjustified override. */
    reason: text("reason"),
    batchNumber: text("batch_number"),
    injectionSite: text("injection_site"),
  },
  (t) => ({
    patientIdx: index("mar_administrations_patient_idx").on(t.patientId),
    statusIdx: index("mar_administrations_status_idx").on(t.status),
    scheduledIdx: index("mar_administrations_scheduled_idx").on(t.scheduledAt),
    // V12 §6.2 hot path: nurse shift list = patient + scheduled_at
    patientScheduledIdx: index("mar_administrations_patient_scheduled_idx").on(t.patientId, t.scheduledAt),
  }),
);

// ═══════════════════════════════════════════════════════════════════
// SECTION D — V8 §7 + V10 §1 wallet
// ═══════════════════════════════════════════════════════════════════

// 17. wallets
export const wallets = pgTable(
  "wallets",
  {
    id: text("id").primaryKey(),
    entityKind: text("entity_kind").notNull(), // patient|doctor|hospital|pharmacy|lab|diagnostic|insurance|pharma|manufacturer|distributor|education|platform
    entityId: text("entity_id").notNull(),
    balanceCents: integer("balance_cents").notNull().default(0),
    holdCents: integer("hold_cents").notNull().default(0),
    currency: text("currency").notNull().default("INR"),
    status: text("status").notNull().default("active"), // active|frozen|closed
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    entityIdx: unique("wallets_entity_unique").on(t.entityKind, t.entityId),
    kindIdx: index("wallets_kind_idx").on(t.entityKind),
    statusIdx: index("wallets_status_idx").on(t.status),
  }),
);

// 18. wallet_txns — append-only ledger
export const walletTxns = pgTable(
  "wallet_txns",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(), // consultation_fee|consultation_refund|settlement|platform_fee|gov_tax|gratitude_credit|gratitude_debit|insurance_payout|insurance_premium|ppme_fee|equipment_purchase|equipment_refund|warranty_repair|topup|withdraw|adjustment|course_purchase|import_export_fee
    fromWalletId: text("from_wallet_id"),
    toWalletId: text("to_wallet_id"),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull(),
    refKind: text("ref_kind"),
    refId: text("ref_id"),
    note: text("note"),
    actorEmail: text("actor_email"),
    actorRole: text("actor_role"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    fromIdx: index("wallet_txns_from_idx").on(t.fromWalletId),
    toIdx: index("wallet_txns_to_idx").on(t.toWalletId),
    kindIdx: index("wallet_txns_kind_idx").on(t.kind),
    refIdx: index("wallet_txns_ref_idx").on(t.refKind, t.refId),
    createdAtIdx: index("wallet_txns_created_at_idx").on(t.createdAt),
    // V12 §6.2 wallet statement = wallet + created_at DESC
    fromCreatedIdx: index("wallet_txns_from_created_idx").on(t.fromWalletId, t.createdAt),
    toCreatedIdx: index("wallet_txns_to_created_idx").on(t.toWalletId, t.createdAt),
  }),
);

// ═══════════════════════════════════════════════════════════════════
// SECTION E — V13 Accountability + CAR + Near-miss + Scorecards
// ═══════════════════════════════════════════════════════════════════

// 19. accountability_events — hypertable (high write volume)
export const accountabilityEvents = pgTable(
  "accountability_events",
  {
    id: text("id").primaryKey(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    category: text("category").notNull(), // clinical|admin|financial|data_access|system
    action: text("action").notNull(),
    severity: text("severity").notNull().default("info"), // info|low|medium|high|critical
    actorEmail: text("actor_email").notNull(),
    actorRole: text("actor_role"),
    actorId: text("actor_id"),
    tenantId: text("tenant_id"),
    subjectKind: text("subject_kind"),
    subjectId: text("subject_id"),
    location: text("location"),
    device: text("device"),
    summary: text("summary").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    /** Breach metadata when auto/manually flagged. */
    breach: jsonb("breach"),
  },
  (t) => ({
    atIdx: index("accountability_events_at_idx").on(t.at),
    categoryIdx: index("accountability_events_category_idx").on(t.category),
    severityIdx: index("accountability_events_severity_idx").on(t.severity),
    actorIdx: index("accountability_events_actor_idx").on(t.actorEmail),
    subjectIdx: index("accountability_events_subject_idx").on(t.subjectKind, t.subjectId),
    tenantIdx: index("accountability_events_tenant_idx").on(t.tenantId),
    // Live feed = at DESC + category filter
    categoryAtIdx: index("accountability_events_category_at_idx").on(t.category, t.at),
    actorAtIdx: index("accountability_events_actor_at_idx").on(t.actorEmail, t.at),
  }),
);

// 20. corrective_action_requests
export const correctiveActionRequests = pgTable(
  "corrective_action_requests",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id").references(() => accountabilityEvents.id),
    breachRule: text("breach_rule").notNull(),
    breachLevel: integer("breach_level").notNull(),
    category: text("category").notNull(),
    tenantId: text("tenant_id"),
    title: text("title").notNull(),
    description: text("description").notNull(),
    severity: text("severity").notNull(),
    status: text("status").notNull().default("open"), // open|acknowledged|investigating|action_planned|closed|verified
    assignedToEmail: text("assigned_to_email").notNull(),
    assignedToRole: text("assigned_to_role"),
    openedByEmail: text("opened_by_email").notNull(),
    openedByRole: text("opened_by_role"),
    respondByAt: timestamp("respond_by_at", { withTimezone: true }).notNull(),
    closeByAt: timestamp("close_by_at", { withTimezone: true }).notNull(),
    rootCause: text("root_cause"),
    correctiveAction: text("corrective_action"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    closedLate: boolean("closed_late"),
  },
  (t) => ({
    statusIdx: index("cars_status_idx").on(t.status),
    severityIdx: index("cars_severity_idx").on(t.severity),
    assignedIdx: index("cars_assigned_idx").on(t.assignedToEmail),
    tenantIdx: index("cars_tenant_idx").on(t.tenantId),
    closeByIdx: index("cars_close_by_idx").on(t.closeByAt),
    statusCloseByIdx: index("cars_status_close_by_idx").on(t.status, t.closeByAt),
  }),
);

// 21. car_updates — append-only lifecycle history
export const carUpdates = pgTable(
  "car_updates",
  {
    id: text("id").primaryKey(),
    carId: text("car_id").notNull().references(() => correctiveActionRequests.id),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    byEmail: text("by_email").notNull(),
    byRole: text("by_role"),
    note: text("note").notNull(),
    toStatus: text("to_status"),
  },
  (t) => ({
    carIdx: index("car_updates_car_idx").on(t.carId, t.at),
  }),
);

// 22. near_miss_reports — V13 §7 no-blame culture
export const nearMissReports = pgTable(
  "near_miss_reports",
  {
    id: text("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    tenantId: text("tenant_id"),
    what: text("what").notNull(),
    where: text("where").notNull(),
    whenAt: timestamp("when_at", { withTimezone: true }).notNull(),
    domain: text("domain").notNull(),
    severity: text("severity").notNull(),
    outcome: text("outcome").notNull(),
    /** Empty string when reporter chose anonymous. */
    reporterEmail: text("reporter_email").notNull().default(""),
    reporterRole: text("reporter_role"),
    patientId: text("patient_id"),
    contributingFactors: jsonb("contributing_factors").default(sql`'[]'::jsonb`),
    suggestedFix: text("suggested_fix"),
    reviewStatus: text("review_status").notNull().default("new"),
    reviewNotes: text("review_notes"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    carId: text("car_id").references(() => correctiveActionRequests.id),
  },
  (t) => ({
    domainIdx: index("near_miss_domain_idx").on(t.domain),
    severityIdx: index("near_miss_severity_idx").on(t.severity),
    reviewStatusIdx: index("near_miss_review_status_idx").on(t.reviewStatus),
    tenantIdx: index("near_miss_tenant_idx").on(t.tenantId),
    createdAtIdx: index("near_miss_created_at_idx").on(t.createdAt),
  }),
);

// ═══════════════════════════════════════════════════════════════════
// SECTION F — V9 §3 PPME (Pre-Policy Medical Examination)
// ═══════════════════════════════════════════════════════════════════

// 23. ppme_reports
export const ppmeReports = pgTable(
  "ppme_reports",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id").notNull(),
    patientName: text("patient_name").notNull(),
    patientPhone: text("patient_phone"),
    insurerId: text("insurer_id").notNull(),
    insurerName: text("insurer_name").notNull(),
    insurerRef: text("insurer_ref").notNull(),
    policyType: text("policy_type").notNull(), // health|life|critical_illness|travel
    tier: text("tier").notNull(), // basic|standard|comprehensive|executive
    feeCents: integer("fee_cents").notNull(),
    currency: text("currency").notNull().default("INR"),
    facilityId: text("facility_id").notNull(),
    facilityName: text("facility_name").notNull(),
    status: text("status").notNull().default("scheduled"),
    photoUrls: jsonb("photo_urls").notNull().default(sql`'[]'::jsonb`),
    examinerNotes: text("examiner_notes"),
    examinerEmail: text("examiner_email"),
    reportHash: text("report_hash"),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    insurerIdx: index("ppme_insurer_idx").on(t.insurerId),
    facilityIdx: index("ppme_facility_idx").on(t.facilityId),
    statusIdx: index("ppme_status_idx").on(t.status),
    createdAtIdx: index("ppme_created_at_idx").on(t.createdAt),
  }),
);

// 24. ppme_test_results — one row per V9 §3.5 test
export const ppmeTestResults = pgTable(
  "ppme_test_results",
  {
    id: text("id").primaryKey(),
    reportId: text("report_id").notNull().references(() => ppmeReports.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    status: text("status").notNull().default("pending"),
    result: text("result"),
    referenceRange: text("reference_range"),
    recordedBy: text("recorded_by"),
    recordedAt: timestamp("recorded_at", { withTimezone: true }),
  },
  (t) => ({
    reportIdx: index("ppme_test_results_report_idx").on(t.reportId),
  }),
);

// ═══════════════════════════════════════════════════════════════════
// SECTION G — V7 §2 Insurance: company, empanelment, pre-auth, claim
// ═══════════════════════════════════════════════════════════════════

// 25. insurers
export const insurers = pgTable(
  "insurers",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    regulatorId: text("regulator_id"),
    taxId: text("tax_id"),
    country: text("country").notNull(),
    city: text("city"),
    lines: jsonb("lines").notNull().default(sql`'[]'::jsonb`),
    defaultPpmeTier: jsonb("default_ppme_tier").notNull().default(sql`'{}'::jsonb`),
    billingEmail: text("billing_email"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    countryIdx: index("insurers_country_idx").on(t.country),
  }),
);

// 26. insurer_empanelments
export const insurerEmpanelments = pgTable(
  "insurer_empanelments",
  {
    id: text("id").primaryKey(),
    insurerId: text("insurer_id").notNull().references(() => insurers.id),
    hospitalId: text("hospital_id").notNull().references(() => hospitals.id),
    hospitalName: text("hospital_name").notNull(),
    status: text("status").notNull().default("applied"), // applied|approved|rejected|suspended
    categories: jsonb("categories").notNull().default(sql`'[]'::jsonb`),
    discountPct: real("discount_pct"),
    appliedAt: timestamp("applied_at", { withTimezone: true }).notNull().defaultNow(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decidedBy: text("decided_by"),
    notes: text("notes"),
  },
  (t) => ({
    insurerIdx: index("empanelments_insurer_idx").on(t.insurerId),
    hospitalIdx: index("empanelments_hospital_idx").on(t.hospitalId),
    statusIdx: index("empanelments_status_idx").on(t.status),
  }),
);

// 27. pre_auth_requests
export const preAuthRequests = pgTable(
  "pre_auth_requests",
  {
    id: text("id").primaryKey(),
    insurerId: text("insurer_id").notNull().references(() => insurers.id),
    patientId: text("patient_id").notNull(),
    patientName: text("patient_name").notNull(),
    policyNumber: text("policy_number").notNull(),
    hospitalId: text("hospital_id").notNull().references(() => hospitals.id),
    hospitalName: text("hospital_name").notNull(),
    procedureCode: text("procedure_code"),
    diagnosis: text("diagnosis").notNull(),
    estimatedCostCents: integer("estimated_cost_cents").notNull(),
    currency: text("currency").notNull().default("INR"),
    status: text("status").notNull().default("pending"),
    approvedCapCents: integer("approved_cap_cents"),
    validFromAt: timestamp("valid_from_at", { withTimezone: true }),
    validUntilAt: timestamp("valid_until_at", { withTimezone: true }),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decidedBy: text("decided_by"),
    notes: text("notes"),
  },
  (t) => ({
    insurerIdx: index("pre_auth_insurer_idx").on(t.insurerId),
    hospitalIdx: index("pre_auth_hospital_idx").on(t.hospitalId),
    statusIdx: index("pre_auth_status_idx").on(t.status),
  }),
);

// 28. insurance_claims
export const insuranceClaims = pgTable(
  "insurance_claims",
  {
    id: text("id").primaryKey(),
    insurerId: text("insurer_id").notNull().references(() => insurers.id),
    patientId: text("patient_id").notNull(),
    patientName: text("patient_name").notNull(),
    policyNumber: text("policy_number").notNull(),
    hospitalId: text("hospital_id").notNull().references(() => hospitals.id),
    hospitalName: text("hospital_name").notNull(),
    preAuthId: text("pre_auth_id").references(() => preAuthRequests.id),
    billedCents: integer("billed_cents").notNull(),
    approvedCents: integer("approved_cents"),
    currency: text("currency").notNull().default("INR"),
    status: text("status").notNull().default("submitted"),
    diagnosis: text("diagnosis").notNull(),
    dischargeDate: timestamp("discharge_date", { withTimezone: true }).notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decidedBy: text("decided_by"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    documentUrls: jsonb("document_urls").notNull().default(sql`'[]'::jsonb`),
    notes: text("notes"),
  },
  (t) => ({
    insurerIdx: index("claims_insurer_idx").on(t.insurerId),
    hospitalIdx: index("claims_hospital_idx").on(t.hospitalId),
    statusIdx: index("claims_status_idx").on(t.status),
    submittedAtIdx: index("claims_submitted_at_idx").on(t.submittedAt),
    insurerStatusIdx: index("claims_insurer_status_idx").on(t.insurerId, t.status),
  }),
);

// 29. claim_documents (V7 §2.7 auto-assembled bundle items)
export const claimDocuments = pgTable(
  "claim_documents",
  {
    id: text("id").primaryKey(),
    claimId: text("claim_id").notNull().references(() => insuranceClaims.id),
    kind: text("kind").notNull(), // discharge_summary|invoice|lab_report|prescription|imaging|other
    url: text("url").notNull(),
    hash: text("hash"),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    claimIdx: index("claim_documents_claim_idx").on(t.claimId),
  }),
);

// 30. insurance_policies — V8 §2 patient buys / adds a policy
export const insurancePolicies = pgTable(
  "insurance_policies",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id").notNull(),
    insurerId: text("insurer_id").notNull().references(() => insurers.id),
    policyNumber: text("policy_number").notNull(),
    productName: text("product_name").notNull(),
    sumInsuredCents: integer("sum_insured_cents").notNull(),
    currency: text("currency").notNull().default("INR"),
    /** "added" — pre-existing policy linked. "purchased" — bought via
     *  OduDoc marketplace (V8 §2.3). */
    source: text("source").notNull().default("added"),
    validFromAt: timestamp("valid_from_at", { withTimezone: true }).notNull(),
    validUntilAt: timestamp("valid_until_at", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("active"), // active|expired|cancelled
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    patientIdx: index("policies_patient_idx").on(t.patientId),
    insurerIdx: index("policies_insurer_idx").on(t.insurerId),
    statusIdx: index("policies_status_idx").on(t.status),
    policyNumberIdx: unique("policies_insurer_number_unique").on(t.insurerId, t.policyNumber),
  }),
);

// ═══════════════════════════════════════════════════════════════════
// SECTION H — V11 Entity profiles + section blocks
// ═══════════════════════════════════════════════════════════════════

// 31. entity_profiles
export const entityProfiles = pgTable(
  "entity_profiles",
  {
    slug: text("slug").primaryKey(),
    entityKind: text("entity_kind").notNull(),
    entityId: text("entity_id").notNull(),
    displayName: text("display_name").notNull(),
    tagline: text("tagline"),
    logoUrl: text("logo_url"),
    heroImageUrl: text("hero_image_url"),
    city: text("city"),
    country: text("country"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    status: text("status").notNull().default("draft"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: text("reviewed_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    entityIdx: unique("entity_profiles_entity_unique").on(t.entityKind, t.entityId),
    statusIdx: index("entity_profiles_status_idx").on(t.status),
  }),
);

// 32. entity_profile_sections — ordered block list
export const entityProfileSections = pgTable(
  "entity_profile_sections",
  {
    id: text("id").primaryKey(),
    profileSlug: text("profile_slug").notNull().references(() => entityProfiles.slug),
    type: text("type").notNull(),
    visible: boolean("visible").notNull().default(true),
    position: integer("position").notNull().default(0),
    data: jsonb("data").notNull().default(sql`'{}'::jsonb`),
  },
  (t) => ({
    profileIdx: index("entity_sections_profile_idx").on(t.profileSlug, t.position),
  }),
);

// ═══════════════════════════════════════════════════════════════════
// SECTION I — V8 §1 Courses marketplace
// ═══════════════════════════════════════════════════════════════════

// 33. courses
export const courses = pgTable(
  "courses",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    providerId: text("provider_id").notNull(),
    providerName: text("provider_name").notNull(),
    title: text("title").notNull(),
    tagline: text("tagline").notNull(),
    description: text("description").notNull(),
    imageUrl: text("image_url"),
    tier: text("tier").notNull(), // free|paid|premium
    level: text("level").notNull(), // intro|intermediate|advanced|post_graduate
    priceCents: integer("price_cents").notNull().default(0),
    currency: text("currency").notNull().default("INR"),
    effortHours: integer("effort_hours").notNull(),
    status: text("status").notNull().default("draft"),
    tags: jsonb("tags").notNull().default(sql`'[]'::jsonb`),
    cmeCredits: integer("cme_credits"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    providerIdx: index("courses_provider_idx").on(t.providerId),
    statusIdx: index("courses_status_idx").on(t.status),
    tierIdx: index("courses_tier_idx").on(t.tier),
  }),
);

// 34. course_enrollments
export const courseEnrollments = pgTable(
  "course_enrollments",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id").notNull().references(() => courses.id),
    studentEmail: text("student_email").notNull(),
    studentName: text("student_name").notNull(),
    enrolledAt: timestamp("enrolled_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    feeCharged: boolean("fee_charged").notNull().default(false),
    paidCents: integer("paid_cents").notNull().default(0),
    currency: text("currency").notNull().default("INR"),
    settledTxId: text("settled_tx_id"),
  },
  (t) => ({
    courseIdx: index("enrollments_course_idx").on(t.courseId),
    studentIdx: index("enrollments_student_idx").on(t.studentEmail),
    studentCourseIdx: unique("enrollments_student_course_unique").on(t.studentEmail, t.courseId),
  }),
);

// ═══════════════════════════════════════════════════════════════════
// SECTION J — V10 §2 Equipment marketplace
// ═══════════════════════════════════════════════════════════════════

// 35. equipment_products
export const equipmentProducts = pgTable(
  "equipment_products",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    manufacturerId: text("manufacturer_id").notNull(),
    manufacturerName: text("manufacturer_name").notNull(),
    title: text("title").notNull(),
    tagline: text("tagline").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull(),
    modelNumber: text("model_number").notNull(),
    imageUrls: jsonb("image_urls").notNull().default(sql`'[]'::jsonb`),
    retailPriceCents: integer("retail_price_cents").notNull(),
    wholesaleTiers: jsonb("wholesale_tiers").notNull().default(sql`'[]'::jsonb`),
    currency: text("currency").notNull().default("INR"),
    warrantyMonths: integer("warranty_months").notNull().default(0),
    freeShippingMinCents: integer("free_shipping_min_cents"),
    leadDays: integer("lead_days").notNull().default(7),
    certifications: jsonb("certifications").notNull().default(sql`'[]'::jsonb`),
    status: text("status").notNull().default("draft"),
    tags: jsonb("tags").notNull().default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    manufacturerIdx: index("equipment_products_manufacturer_idx").on(t.manufacturerId),
    categoryIdx: index("equipment_products_category_idx").on(t.category),
    statusIdx: index("equipment_products_status_idx").on(t.status),
  }),
);

// 36. equipment_orders
export const equipmentOrders = pgTable(
  "equipment_orders",
  {
    id: text("id").primaryKey(),
    productId: text("product_id").notNull().references(() => equipmentProducts.id),
    productTitle: text("product_title").notNull(),
    manufacturerId: text("manufacturer_id").notNull(),
    buyerId: text("buyer_id").notNull(),
    buyerKind: text("buyer_kind").notNull(),
    buyerName: text("buyer_name").notNull(),
    qty: integer("qty").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    subtotalCents: integer("subtotal_cents").notNull(),
    shippingCents: integer("shipping_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),
    currency: text("currency").notNull().default("INR"),
    isWholesale: boolean("is_wholesale").notNull().default(false),
    status: text("status").notNull().default("pending"),
    warrantyExpiresAt: timestamp("warranty_expires_at", { withTimezone: true }),
    trackingRef: text("tracking_ref"),
    payoutTxId: text("payout_tx_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  },
  (t) => ({
    buyerIdx: index("equipment_orders_buyer_idx").on(t.buyerId),
    manufacturerIdx: index("equipment_orders_manufacturer_idx").on(t.manufacturerId),
    statusIdx: index("equipment_orders_status_idx").on(t.status),
    productIdx: index("equipment_orders_product_idx").on(t.productId),
  }),
);

// 37. equipment_warranty_registrations (V10 §2.6.1)
export const equipmentWarrantyRegistrations = pgTable(
  "equipment_warranty_registrations",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id").notNull().references(() => equipmentOrders.id),
    productId: text("product_id").notNull().references(() => equipmentProducts.id),
    ownerId: text("owner_id").notNull(),
    /** Serial number captured at dispatch — manufacturer fills it in. */
    serialNumber: text("serial_number"),
    registeredAt: timestamp("registered_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    claimsCount: integer("claims_count").notNull().default(0),
  },
  (t) => ({
    ownerIdx: index("warranty_owner_idx").on(t.ownerId),
    productIdx: index("warranty_product_idx").on(t.productId),
    expiresIdx: index("warranty_expires_idx").on(t.expiresAt),
  }),
);

// ═══════════════════════════════════════════════════════════════════
// SECTION K — V7 §3 Pharma + V8 §3 MR gratitude wallet
// ═══════════════════════════════════════════════════════════════════

// 38. pharma_companies
export const pharmaCompanies = pgTable(
  "pharma_companies",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    country: text("country").notNull(),
    taxId: text("tax_id"),
    websiteUrl: text("website_url"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    countryIdx: index("pharma_country_idx").on(t.country),
  }),
);

// 39. medical_representatives — V8 §3.1
export const medicalRepresentatives = pgTable(
  "medical_representatives",
  {
    id: text("id").primaryKey(),
    pharmaCompanyId: text("pharma_company_id").notNull().references(() => pharmaCompanies.id),
    userId: text("user_id").references(() => users.id),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    territory: text("territory"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pharmaIdx: index("mr_pharma_idx").on(t.pharmaCompanyId),
    territoryIdx: index("mr_territory_idx").on(t.territory),
  }),
);

// 40. mr_gift_records — V8 §3.2 gratitude wallet
export const mrGiftRecords = pgTable(
  "mr_gift_records",
  {
    id: text("id").primaryKey(),
    mrId: text("mr_id").notNull().references(() => medicalRepresentatives.id),
    doctorId: text("doctor_id").notNull().references(() => doctors.id),
    /** Gift type — must be regulator-compliant (no cash, no entertainment).
     *  V8 §3.2 enumerates: cme_voucher | conference_sponsorship |
     *  educational_material | sample_pack. */
    kind: text("kind").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("INR"),
    walletTxId: text("wallet_tx_id"),
    note: text("note"),
    givenAt: timestamp("given_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    mrIdx: index("mr_gift_mr_idx").on(t.mrId),
    doctorIdx: index("mr_gift_doctor_idx").on(t.doctorId),
    givenAtIdx: index("mr_gift_given_at_idx").on(t.givenAt),
  }),
);

// 41. drug_master — V7 §3.3 multi-language drug names
export const drugMaster = pgTable(
  "drug_master",
  {
    id: text("id").primaryKey(),
    /** INN — Universal Core. Single source of truth. */
    inn: text("inn").notNull().unique(),
    atcCode: text("atc_code"),
    schedule: text("schedule"), // X|H1|G|OTC|NDPS_X
    contributedByPharmaId: text("contributed_by_pharma_id").references(() => pharmaCompanies.id),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    atcIdx: index("drug_master_atc_idx").on(t.atcCode),
    scheduleIdx: index("drug_master_schedule_idx").on(t.schedule),
  }),
);

// 42. drug_aliases — V6 multi-language prescription engine layer 2
export const drugAliases = pgTable(
  "drug_aliases",
  {
    id: text("id").primaryKey(),
    drugInn: text("drug_inn").notNull().references(() => drugMaster.inn),
    locale: text("locale").notNull(), // en-IN|en-US|ru-RU|ko-KR|ar-AE|hi-IN|...
    /** brand|generic */
    kind: text("kind").notNull().default("generic"),
    localName: text("local_name").notNull(),
    manufacturerId: text("manufacturer_id"),
  },
  (t) => ({
    innLocaleIdx: index("drug_aliases_inn_locale_idx").on(t.drugInn, t.locale),
    nameIdx: index("drug_aliases_local_name_idx").on(t.localName),
  }),
);

// 43. adverse_drug_reactions — V7 §3.7 ADR
export const adverseDrugReactions = pgTable(
  "adverse_drug_reactions",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id"),
    drugInn: text("drug_inn").notNull(),
    /** mild|moderate|severe|life_threatening|fatal */
    severity: text("severity").notNull(),
    reaction: text("reaction").notNull(),
    onsetAt: timestamp("onset_at", { withTimezone: true }),
    reportedByEmail: text("reported_by_email"),
    reportedAt: timestamp("reported_at", { withTimezone: true }).notNull().defaultNow(),
    /** Was this escalated to the national pharmacovigilance database? */
    pvSentAt: timestamp("pv_sent_at", { withTimezone: true }),
  },
  (t) => ({
    drugIdx: index("adr_drug_idx").on(t.drugInn),
    severityIdx: index("adr_severity_idx").on(t.severity),
    reportedAtIdx: index("adr_reported_at_idx").on(t.reportedAt),
  }),
);

// ═══════════════════════════════════════════════════════════════════
// SECTION L — V7 §4 Education organisations + CME + blockchain certs
// ═══════════════════════════════════════════════════════════════════

// 44. education_orgs
export const educationOrgs = pgTable(
  "education_orgs",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    country: text("country").notNull(),
    accreditationId: text("accreditation_id"),
    websiteUrl: text("website_url"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    countryIdx: index("education_orgs_country_idx").on(t.country),
  }),
);

// 45. cme_credits — V7 §4.4 CME tracker
export const cmeCredits = pgTable(
  "cme_credits",
  {
    id: text("id").primaryKey(),
    doctorId: text("doctor_id").notNull().references(() => doctors.id),
    /** Linked source — a course completion, a conference attendance, an
     *  external CME submission. */
    sourceKind: text("source_kind").notNull(),
    sourceId: text("source_id"),
    educationOrgId: text("education_org_id").references(() => educationOrgs.id),
    creditHours: real("credit_hours").notNull(),
    awardedAt: timestamp("awarded_at", { withTimezone: true }).notNull().defaultNow(),
    /** Council the credit is logged against (IMC, AMC, GMC, ...). */
    council: text("council"),
  },
  (t) => ({
    doctorIdx: index("cme_credits_doctor_idx").on(t.doctorId),
    awardedAtIdx: index("cme_credits_awarded_at_idx").on(t.awardedAt),
    councilIdx: index("cme_credits_council_idx").on(t.council),
  }),
);

// 46. blockchain_certificates — V7 §4.5
export const blockchainCertificates = pgTable(
  "blockchain_certificates",
  {
    id: text("id").primaryKey(),
    /** Type of certificate — course_completion | cme | residency |
     *  rotation | conference. */
    kind: text("kind").notNull(),
    subjectKind: text("subject_kind").notNull(), // doctor|student|nurse
    subjectId: text("subject_id").notNull(),
    title: text("title").notNull(),
    /** SHA-256 hash of the issued PDF; the chain stores hash + timestamp.
     *  Anyone can re-hash the PDF and verify via /verify/[hash]. */
    pdfHash: text("pdf_hash").notNull(),
    pdfUrl: text("pdf_url"),
    issuedByEntityId: text("issued_by_entity_id"),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    subjectIdx: index("blockchain_cert_subject_idx").on(t.subjectKind, t.subjectId),
    hashIdx: unique("blockchain_cert_hash_unique").on(t.pdfHash),
  }),
);

// ═══════════════════════════════════════════════════════════════════
// SECTION M — V8 §3–§5 Gratitude referrals (lab + pharmacy + diagnostic)
// ═══════════════════════════════════════════════════════════════════

// 47. gratitude_referrals — V8 §4 lab + §5 pharmacy 3-party gratitude
export const gratitudeReferrals = pgTable(
  "gratitude_referrals",
  {
    id: text("id").primaryKey(),
    /** Who paid the gratitude. */
    payerKind: text("payer_kind").notNull(), // lab|pharmacy|diagnostic
    payerId: text("payer_id").notNull(),
    /** Who received it. */
    referrerKind: text("referrer_kind").notNull(), // doctor|hospital
    referrerId: text("referrer_id").notNull(),
    /** The referral itself — refKind = lab_order|prescription|... */
    refKind: text("ref_kind").notNull(),
    refId: text("ref_id").notNull(),
    grossCents: integer("gross_cents").notNull(),
    platformFeeCents: integer("platform_fee_cents").notNull(),
    referrerCutCents: integer("referrer_cut_cents").notNull(),
    currency: text("currency").notNull().default("INR"),
    walletTxId: text("wallet_tx_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    payerIdx: index("gratitude_payer_idx").on(t.payerKind, t.payerId),
    referrerIdx: index("gratitude_referrer_idx").on(t.referrerKind, t.referrerId),
    refIdx: index("gratitude_ref_idx").on(t.refKind, t.refId),
  }),
);
