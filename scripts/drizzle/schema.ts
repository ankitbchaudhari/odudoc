// @ts-nocheck — this file references `drizzle-orm` which is not installed yet.
// Unsuppress this when we run `bun add drizzle-orm drizzle-kit postgres`.
// Drizzle ORM schema SCAFFOLD for the 6 hot stores.
//
// ⚠️  THIS IS A DESIGN REFERENCE — NOT YET CONNECTED TO THE APP.
// Current code still reads/writes through lib/persistent-array.ts + app_kv JSONB.
//
// To cut over (planned month 2):
//   1. Install: `bun add drizzle-orm drizzle-kit postgres`
//   2. Generate migration: `npx drizzle-kit generate`
//   3. Apply to a new branch of Neon
//   4. Dual-write: update each store to write to BOTH app_kv AND drizzle for 2 weeks
//   5. Backfill historical data from app_kv → drizzle
//   6. Switch reads to drizzle
//   7. Stop writing to app_kv
//   8. Drop app_kv entries for the migrated keys
//
// Indexes are conservative — tune after observing slow-query logs.

import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  numeric,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";

// ─── Organizations ────────────────────────────────────────────────────────

export const organizations = pgTable(
  "organizations",
  {
    id: text("id").primaryKey(), // "ORG-xxxx"
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    type: text("type").notNull(), // "hospital" | "clinic" | "lab" | ...
    ownerUserId: text("owner_user_id").notNull(),
    country: text("country"),
    timezone: text("timezone"),
    currency: text("currency"),
    status: text("status").notNull().default("active"), // active | suspended | pending
    tier: text("tier").notNull().default("free"), // free | starter | growth | scale
    stripeCustomerId: text("stripe_customer_id"),
    settings: jsonb("settings").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugUq: uniqueIndex("organizations_slug_uq").on(t.slug),
    statusIdx: index("organizations_status_idx").on(t.status),
  }),
);

// ─── Patients ─────────────────────────────────────────────────────────────

export const patients = pgTable(
  "patients",
  {
    id: text("id").primaryKey(), // "PAT-xxxx"
    organizationId: text("organization_id").notNull(),
    mrn: text("mrn").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    gender: text("gender").notNull(),
    dateOfBirth: text("date_of_birth"), // YYYY-MM-DD
    phone: text("phone"),
    email: text("email"),
    addressLine1: text("address_line1"),
    addressLine2: text("address_line2"),
    city: text("city"),
    state: text("state"),
    country: text("country"),
    postalCode: text("postal_code"),
    bloodGroup: text("blood_group").notNull().default("unknown"),
    allergies: jsonb("allergies").$type<string[]>().notNull().default([]),
    chronicConditions: jsonb("chronic_conditions").$type<string[]>().notNull().default([]),
    currentMedications: jsonb("current_medications").$type<string[]>().notNull().default([]),
    emergencyContactName: text("emergency_contact_name"),
    emergencyContactPhone: text("emergency_contact_phone"),
    emergencyContactRelation: text("emergency_contact_relation"),
    insuranceProvider: text("insurance_provider"),
    insurancePolicyNumber: text("insurance_policy_number"),
    notes: text("notes"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgMrnUq: uniqueIndex("patients_org_mrn_uq").on(t.organizationId, t.mrn),
    orgNameIdx: index("patients_org_name_idx").on(t.organizationId, t.lastName, t.firstName),
    orgPhoneIdx: index("patients_org_phone_idx").on(t.organizationId, t.phone),
    orgStatusIdx: index("patients_org_status_idx").on(t.organizationId, t.status),
  }),
);

// ─── Appointments ─────────────────────────────────────────────────────────

export const appointments = pgTable(
  "appointments",
  {
    id: text("id").primaryKey(), // "APT-xxxx"
    organizationId: text("organization_id").notNull(),
    appointmentNumber: text("appointment_number").notNull(),
    patientId: text("patient_id").notNull(),
    providerId: text("provider_id").notNull(),
    type: text("type").notNull(),
    date: text("date").notNull(), // YYYY-MM-DD
    startTime: text("start_time").notNull(), // HH:MM
    endTime: text("end_time").notNull(),
    reason: text("reason"),
    room: text("room"),
    notes: text("notes"),
    status: text("status").notNull().default("scheduled"),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelReason: text("cancel_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // The overlap check in-code needs (providerId, date, time) fast lookup.
    orgProviderDateIdx: index("appointments_org_provider_date_idx").on(
      t.organizationId, t.providerId, t.date,
    ),
    orgPatientIdx: index("appointments_org_patient_idx").on(t.organizationId, t.patientId),
    orgDateStatusIdx: index("appointments_org_date_status_idx").on(
      t.organizationId, t.date, t.status,
    ),
  }),
);

// ─── Admissions ───────────────────────────────────────────────────────────

export const admissions = pgTable(
  "admissions",
  {
    id: text("id").primaryKey(), // "ADM-xxxx"
    organizationId: text("organization_id").notNull(),
    patientId: text("patient_id").notNull(),
    admittingDoctor: text("admitting_doctor"),
    admittingDepartment: text("admitting_department"),
    encounterId: text("encounter_id"),
    chiefComplaint: text("chief_complaint"),
    provisionalDiagnosis: text("provisional_diagnosis"),
    finalDiagnosis: text("final_diagnosis"),
    dischargeSummary: text("discharge_summary"),
    dischargeDisposition: text("discharge_disposition"),
    history: jsonb("history").$type<Array<{ wardId: string; bedId: string; from: string; to?: string }>>().notNull().default([]),
    currentWardId: text("current_ward_id"),
    currentBedId: text("current_bed_id"),
    status: text("status").notNull().default("admitted"),
    admittedAt: timestamp("admitted_at", { withTimezone: true }).notNull(),
    dischargedAt: timestamp("discharged_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgStatusIdx: index("admissions_org_status_idx").on(t.organizationId, t.status),
    orgPatientIdx: index("admissions_org_patient_idx").on(t.organizationId, t.patientId),
    orgCurrentBedIdx: index("admissions_org_current_bed_idx").on(t.organizationId, t.currentBedId),
  }),
);

// ─── Notifications log ────────────────────────────────────────────────────

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(), // "NTF-xxxx"
    organizationId: text("organization_id").notNull(),
    channel: text("channel").notNull(), // sms | email | whatsapp | push | in_app | voice
    category: text("category").notNull(),
    recipientName: text("recipient_name"),
    recipientContact: text("recipient_contact").notNull(),
    patientId: text("patient_id"),
    subject: text("subject"),
    body: text("body").notNull(),
    templateCode: text("template_code"),
    status: text("status").notNull().default("queued"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    errorMessage: text("error_message"),
    providerRef: text("provider_ref"), // Twilio MessageSid / Resend email_id
    costEstimate: numeric("cost_estimate", { precision: 10, scale: 4 }),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    attemptCount: integer("attempt_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // Webhook callback lookup (Twilio/Resend key by providerRef).
    providerRefIdx: index("notifications_provider_ref_idx").on(t.providerRef),
    orgCreatedIdx: index("notifications_org_created_idx").on(t.organizationId, t.createdAt),
    orgStatusIdx: index("notifications_org_status_idx").on(t.organizationId, t.status),
    orgPatientIdx: index("notifications_org_patient_idx").on(t.organizationId, t.patientId),
  }),
);

// ─── Subscriptions (Stripe) ───────────────────────────────────────────────

export const subscriptions = pgTable(
  "subscriptions",
  {
    organizationId: text("organization_id").primaryKey(),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    priceId: text("price_id"),
    planTier: text("plan_tier").notNull().default("free"),
    status: text("status").notNull().default("active"),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: text("cancel_at_period_end"), // "true" | "false"
    lastInvoiceStatus: text("last_invoice_status"),
    lastInvoiceId: text("last_invoice_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    stripeCustomerIdx: index("subscriptions_stripe_customer_idx").on(t.stripeCustomerId),
    stripeSubIdx: index("subscriptions_stripe_sub_idx").on(t.stripeSubscriptionId),
  }),
);

// ─── Audit log ────────────────────────────────────────────────────────────

export const auditLog = pgTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    actorUserId: text("actor_user_id"),
    actorEmail: text("actor_email"),
    actorRole: text("actor_role"),
    action: text("action").notNull(), // create | update | delete | access | export | ...
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    module: text("module"),
    severity: text("severity").notNull().default("info"), // info | warning | critical
    reason: text("reason"),
    before: jsonb("before"),
    after: jsonb("after"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgCreatedIdx: index("audit_log_org_created_idx").on(t.organizationId, t.createdAt),
    orgActionIdx: index("audit_log_org_action_idx").on(t.organizationId, t.action),
    orgModuleIdx: index("audit_log_org_module_idx").on(t.organizationId, t.module),
    orgEntityIdx: index("audit_log_org_entity_idx").on(t.organizationId, t.entityType, t.entityId),
  }),
);
