-- Phase 7 — schema for the in-memory stores shipped during the
-- platform expansion (consent vault, ABDM, voice orders, rx-OCR,
-- procurement, roster, tele-ICU, wearables, family, health-passport,
-- inter-org). The bindPersistentArray layer reads/writes JSON blobs
-- keyed by store name; this migration creates the same tables in
-- typed, queryable form so production can swap the in-memory layer
-- for Drizzle-backed reads without touching call sites.
--
-- Strategy:
--   - Keep the `id` columns text + the same generated values that the
--     in-memory stores produce (e.g. "cv-mxyz-ab12") so foreign keys
--     don't require a re-issue.
--   - Use `jsonb` for the wide-shape columns the stores currently keep
--     in TypeScript objects (allergies, currentMeds, scopes, etc.).
--   - All timestamps as `timestamptz` for proper TZ handling.
--   - `created_at` / `updated_at` defaults so call sites don't need to
--     stamp them when migrating to direct SQL writes.
--
-- This migration is idempotent: every CREATE uses IF NOT EXISTS.

-- ── Family / dependents ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS family_dependents (
  id text PRIMARY KEY,
  owner_user_id text NOT NULL,
  name text NOT NULL,
  date_of_birth date,
  sex text,
  relationship text NOT NULL,
  phone text,
  photo_url text,
  medical_id text NOT NULL,
  abha_id text,
  allergies jsonb DEFAULT '[]'::jsonb,
  current_meds jsonb DEFAULT '[]'::jsonb,
  weight_kg numeric,
  notes text,
  promoted_to_user_id text,
  promoted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS family_dependents_owner_idx ON family_dependents (owner_user_id) WHERE promoted_to_user_id IS NULL;

-- ── Health Passport ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS passport_consents (
  id text PRIMARY KEY,
  owner_user_id text NOT NULL,
  dependent_id text,
  granted_to_org_id text NOT NULL,
  scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  note text,
  scan_count integer NOT NULL DEFAULT 0,
  last_scan_at timestamptz
);
CREATE INDEX IF NOT EXISTS passport_consents_owner_idx ON passport_consents (owner_user_id);
CREATE INDEX IF NOT EXISTS passport_consents_lookup_idx
  ON passport_consents (owner_user_id, granted_to_org_id) WHERE revoked_at IS NULL;

-- ── DPDP consent vault ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consent_vault (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  dependent_id text,
  purpose text NOT NULL,
  purpose_statement text NOT NULL,
  recipient_kind text NOT NULL,
  recipient_id text NOT NULL,
  recipient_name text NOT NULL,
  data_categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  expires_at timestamptz,
  post_revoke_retention_days integer,
  lawful_basis text NOT NULL DEFAULT 'consent',
  status text NOT NULL DEFAULT 'granted',
  granted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  revoked_at timestamptz,
  revoke_reason text,
  signature text NOT NULL,
  receipt_downloaded_at timestamptz
);
CREATE INDEX IF NOT EXISTS consent_vault_user_idx ON consent_vault (user_id);
CREATE INDEX IF NOT EXISTS consent_vault_active_lookup_idx
  ON consent_vault (user_id, purpose, recipient_id) WHERE status = 'granted';

CREATE TABLE IF NOT EXISTS erasure_requests (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  filed_at timestamptz NOT NULL DEFAULT now(),
  reason text,
  retain_dependents boolean NOT NULL DEFAULT false,
  scope_categories jsonb NOT NULL DEFAULT '["all"]'::jsonb,
  status text NOT NULL DEFAULT 'cooling_off',
  cooling_off_ends_at timestamptz,
  reviewed_by text,
  reviewed_at timestamptz,
  review_note text,
  completed_at timestamptz,
  cancelled_at timestamptz
);

-- ── ABDM / ABHA ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS abdm_abha_links (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  dependent_id text,
  abha_number text NOT NULL,
  abha_address text NOT NULL,
  kyc_source text,
  status text NOT NULL DEFAULT 'unverified',
  health_id_token text,
  linked_at timestamptz,
  last_verified_at timestamptz,
  revoked_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS abdm_abha_links_active_idx
  ON abdm_abha_links (user_id, abha_number) WHERE status = 'linked';

CREATE TABLE IF NOT EXISTS abdm_care_contexts (
  id text PRIMARY KEY,
  organization_id text NOT NULL,
  abha_number text NOT NULL,
  patient_user_id text NOT NULL,
  type text NOT NULL,
  display text NOT NULL,
  internal_ref text NOT NULL,
  record_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  nha_context_id text,
  registered_at timestamptz,
  linked_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS abdm_care_contexts_abha_idx ON abdm_care_contexts (abha_number);
CREATE INDEX IF NOT EXISTS abdm_care_contexts_org_idx ON abdm_care_contexts (organization_id);

-- ── Voice orders ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS voice_orders (
  id text PRIMARY KEY,
  organization_id text NOT NULL,
  captured_by_email text,
  captured_by_name text,
  bed_id text,
  kind text NOT NULL,
  bed_ref text,
  payload jsonb NOT NULL,
  matched_span text,
  confidence numeric NOT NULL,
  transcript text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  edits text,
  confirmed_at timestamptz,
  confirmed_by_email text,
  executed_at timestamptz,
  execution_target text,
  execution_ref text,
  events jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS voice_orders_org_idx ON voice_orders (organization_id);
CREATE INDEX IF NOT EXISTS voice_orders_status_idx ON voice_orders (organization_id, status);

-- ── Rx OCR imports ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rx_ocr_imports (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  dependent_id text,
  raw_text text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  photo_url text,
  source text NOT NULL DEFAULT 'user_upload',
  note text,
  status text NOT NULL DEFAULT 'saved',
  forwarded_to_fulfillment boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── Procurement ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS procurement_skus (
  id text PRIMARY KEY,
  organization_id text NOT NULL,
  generic_name text NOT NULL,
  brand text,
  category text NOT NULL,
  unit text NOT NULL,
  pack_size integer,
  strength text,
  form text,
  stock numeric NOT NULL DEFAULT 0,
  reorder_level numeric NOT NULL,
  reorder_qty numeric NOT NULL,
  lead_time_days integer NOT NULL,
  preferred_vendor_id text,
  preferred_vendor_name text,
  alternate_vendors jsonb,
  last_reorder_at timestamptz,
  paused boolean NOT NULL DEFAULT false,
  avg_daily_burn numeric,
  unit_cost_rupees numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS procurement_skus_org_idx ON procurement_skus (organization_id);

CREATE TABLE IF NOT EXISTS procurement_pos (
  id text PRIMARY KEY,
  organization_id text NOT NULL,
  vendor_id text,
  vendor_name text NOT NULL,
  source text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal_rupees numeric NOT NULL DEFAULT 0,
  notes text,
  events jsonb NOT NULL DEFAULT '[]'::jsonb,
  expected_at timestamptz,
  received_at timestamptz,
  acknowledged_at timestamptz,
  cancelled_at timestamptz,
  vendor_reference text,
  grn_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS procurement_pos_org_idx ON procurement_pos (organization_id, status);

-- ── Roster ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roster_staff (
  id text PRIMARY KEY,
  organization_id text NOT NULL,
  user_id text,
  name text NOT NULL,
  role text NOT NULL,
  specialty text,
  email text,
  phone text,
  max_hours_per_week integer DEFAULT 48,
  preferred_shifts jsonb,
  blocked_shifts jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS roster_staff_org_idx ON roster_staff (organization_id) WHERE active = true;

CREATE TABLE IF NOT EXISTS roster_leaves (
  id text PRIMARY KEY,
  organization_id text NOT NULL,
  staff_id text NOT NULL,
  staff_name text NOT NULL,
  from_date date NOT NULL,
  to_date date NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  reviewer_email text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rosters (
  id text PRIMARY KEY,
  organization_id text NOT NULL,
  from_date date NOT NULL,
  to_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  assignments jsonb NOT NULL DEFAULT '[]'::jsonb,
  workload_summary jsonb NOT NULL DEFAULT '[]'::jsonb,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  published_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── Tele-ICU ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teleicu_beds (
  id text PRIMARY KEY,
  organization_id text NOT NULL,
  bed_label text NOT NULL,
  ward text,
  patient_user_id text,
  patient_name text,
  patient_age integer,
  patient_sex text,
  admission_diagnosis text,
  ventilator_mode text,
  vasopressors jsonb,
  monitor_device_id text,
  status text NOT NULL DEFAULT 'vacant',
  code_status text,
  admitted_at timestamptz,
  discharged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS teleicu_beds_org_idx ON teleicu_beds (organization_id);

-- ── Wearables ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wearable_devices (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  dependent_id text,
  provider text NOT NULL,
  display_name text NOT NULL,
  external_id text,
  refresh_token_cipher text,
  linked_at timestamptz NOT NULL DEFAULT now(),
  last_sync_at timestamptz,
  status text NOT NULL DEFAULT 'active'
);
CREATE INDEX IF NOT EXISTS wearable_devices_user_idx ON wearable_devices (user_id);

CREATE TABLE IF NOT EXISTS wearable_readings (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  dependent_id text,
  device_id text NOT NULL,
  kind text NOT NULL,
  value numeric NOT NULL,
  context jsonb,
  taken_at timestamptz NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wearable_readings_user_kind_idx
  ON wearable_readings (user_id, kind, taken_at DESC);

-- ── Inter-org ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS org_connections (
  id text PRIMARY KEY,
  org_a_id text NOT NULL,
  org_b_id text NOT NULL,
  requested_by_org_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  note text,
  revenue_split_pct integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  revoked_by_org_id text,
  revoked_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS org_connections_pair_idx ON org_connections (org_a_id, org_b_id);

CREATE TABLE IF NOT EXISTS inter_org_transfers (
  id text PRIMARY KEY,
  from_org_id text NOT NULL,
  to_org_id text NOT NULL,
  patient_id text NOT NULL,
  patient_name text NOT NULL,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  urgency text NOT NULL DEFAULT 'routine',
  reason text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  patient_consent jsonb NOT NULL,
  requested_by_user_id text NOT NULL,
  requested_by_email text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  accepted_by_user_id text,
  accepted_at timestamptz,
  declined_reason text,
  declined_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_reason text,
  merged_as_local_patient_id text,
  completion_notes text,
  read_by_org_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  referral jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inter_org_transfers_to_idx ON inter_org_transfers (to_org_id, status);
CREATE INDEX IF NOT EXISTS inter_org_transfers_from_idx ON inter_org_transfers (from_org_id, status);

CREATE TABLE IF NOT EXISTS bed_snapshots (
  id text PRIMARY KEY,
  organization_id text NOT NULL,
  capacity jsonb NOT NULL DEFAULT '{}'::jsonb,
  available jsonb NOT NULL DEFAULT '{}'::jsonb,
  staff_shortage boolean NOT NULL DEFAULT false,
  notice text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by_user_id text,
  updated_by_email text
);

-- ── Insurance / Cashless ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS tpa_empanelments (
  id text PRIMARY KEY,
  organization_id text NOT NULL,
  tpa_id text NOT NULL,
  discount_pct numeric NOT NULL DEFAULT 0,
  portal_url text,
  contact_person text,
  contact_phone text,
  contact_email text,
  valid_until date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS tpa_empanelments_pair_idx ON tpa_empanelments (organization_id, tpa_id);

CREATE TABLE IF NOT EXISTS patient_policies (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  dependent_id text,
  tpa_id text NOT NULL,
  member_id text NOT NULL,
  plan_name text,
  sum_insured_rupees numeric,
  cumulative_bonus_pct numeric,
  valid_until date,
  group_holder text,
  card_front_url text,
  card_back_url text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS patient_policies_user_idx ON patient_policies (user_id);

CREATE TABLE IF NOT EXISTS insurance_preauths (
  id text PRIMARY KEY,
  organization_id text NOT NULL,
  patient_user_id text NOT NULL,
  dependent_id text,
  patient_name text NOT NULL,
  tpa_id text NOT NULL,
  policy_id text NOT NULL,
  member_id text NOT NULL,
  procedure_code text NOT NULL,
  procedure_name text NOT NULL,
  icd10 text,
  proposed_admission_date date,
  estimate_rupees jsonb NOT NULL,
  doctor_name text,
  clinical_notes text,
  documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  tpa_reference text,
  approved_amount_rupees numeric,
  tpa_note text,
  filed_by_email text,
  submitted_at timestamptz,
  decided_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS insurance_preauths_org_idx ON insurance_preauths (organization_id, status);

-- ── WhatsApp conversations ────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id text PRIMARY KEY,
  patient_user_id text NOT NULL,
  organization_id text NOT NULL,
  patient_phone text NOT NULL,
  patient_name text NOT NULL,
  opt_in_status text NOT NULL DEFAULT 'unknown',
  opt_in_at timestamptz,
  opt_out_at timestamptz,
  cooldown_until timestamptz,
  last_outbound_template text,
  last_outbound_at timestamptz,
  unread_by_staff integer NOT NULL DEFAULT 0,
  unread_by_patient integer NOT NULL DEFAULT 0,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS whatsapp_conversations_org_idx ON whatsapp_conversations (organization_id);
CREATE INDEX IF NOT EXISTS whatsapp_conversations_patient_idx ON whatsapp_conversations (patient_user_id);

-- ── Patient safety context (Rx safety engine) ───────────────────
CREATE TABLE IF NOT EXISTS patient_safety_context (
  id text PRIMARY KEY,
  organization_id text NOT NULL,
  patient_id text NOT NULL,
  date_of_birth date,
  weight_kg numeric,
  egfr numeric,
  pregnancy_status text,
  pregnancy_trimester integer,
  allergies jsonb NOT NULL DEFAULT '[]'::jsonb,
  current_meds jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by_email text
);
CREATE UNIQUE INDEX IF NOT EXISTS patient_safety_context_lookup_idx
  ON patient_safety_context (organization_id, patient_id);

-- ── Pharmacy fulfillment ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS pharmacy_stock (
  id text PRIMARY KEY,
  pharmacy_id text NOT NULL,
  pharmacy_name text NOT NULL,
  city text,
  pincode text,
  lat numeric,
  lng numeric,
  generic_name text NOT NULL,
  brand text,
  strength text,
  form text,
  pack_size integer,
  stock_units integer NOT NULL DEFAULT 0,
  mrp_rupees numeric NOT NULL DEFAULT 0,
  discount_pct numeric NOT NULL DEFAULT 0,
  delivery_eta_hours integer NOT NULL DEFAULT 24,
  home_delivery boolean NOT NULL DEFAULT true,
  prescription_required boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pharmacy_stock_generic_idx ON pharmacy_stock (generic_name);

CREATE TABLE IF NOT EXISTS rx_fulfillment_orders (
  id text PRIMARY KEY,
  patient_user_id text NOT NULL,
  patient_name text NOT NULL,
  patient_phone text,
  delivery_address text NOT NULL,
  pharmacy_id text NOT NULL,
  pharmacy_name text NOT NULL,
  rx_id text,
  lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal_rupees numeric NOT NULL DEFAULT 0,
  delivery_fee_rupees numeric NOT NULL DEFAULT 0,
  total_rupees numeric NOT NULL DEFAULT 0,
  marketplace_fee_pct numeric NOT NULL DEFAULT 8,
  pharmacy_net_rupees numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'placed',
  events jsonb NOT NULL DEFAULT '[]'::jsonb,
  estimated_delivery_hours integer NOT NULL DEFAULT 24,
  payment_status text NOT NULL DEFAULT 'pending',
  delivery_proof text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rx_fulfillment_orders_patient_idx ON rx_fulfillment_orders (patient_user_id);
CREATE INDEX IF NOT EXISTS rx_fulfillment_orders_pharmacy_idx ON rx_fulfillment_orders (pharmacy_id, status);
