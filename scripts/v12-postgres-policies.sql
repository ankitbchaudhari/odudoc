-- V12 §5.1 RLS + V12 §6.1 TimescaleDB hypertables + V12 §6.2 composite
-- indexes that drizzle-kit can't express.
--
-- Run order (idempotent — each block guards with IF NOT EXISTS / EXISTS):
--   1. `npm run db:generate` — emits the CREATE TABLE migration
--   2. `npm run db:migrate`  — applies the tables to Postgres
--   3. `psql $DATABASE_URL -f scripts/v12-postgres-policies.sql`
--
-- Why this isn't a regular drizzle migration:
--   - drizzle-kit doesn't emit RLS policies.
--   - drizzle-kit doesn't know about Timescale's create_hypertable.
--   - Some V12 §6.2 indexes need WHERE clauses (partial indexes) or
--     pg_trgm GIN operators that Drizzle's index() helper can't express.

-- ═══════════════════════════════════════════════════════════════════
-- §0  Extensions
-- ═══════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- TimescaleDB is optional — V12 §6.1 wants it for the three high-write
-- time-series tables (icu_vitals, observation_vitals, mar_administrations)
-- + accountability_events. If the cluster doesn't have it, we fall back
-- to plain composite-indexed tables; the queries still work, just slower
-- past ~10M rows.
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS timescaledb;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'TimescaleDB not available — V12 §6.1 hypertables skipped, plain tables used';
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- §1  V12 §6.1 hypertables — promote the three high-write time-series
--    tables. Wrapped in DO blocks so the script is idempotent and
--    survives TimescaleDB absence.
-- ═══════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
    -- icu_vitals: 1-day chunks. Bedside monitors push ~1 row/sec/bed,
    -- so a 32-bed ICU produces ~2.7M rows/day. 1-day chunks keep
    -- compression + retention policies clean.
    PERFORM create_hypertable('icu_vitals', 'recorded_at',
      chunk_time_interval => INTERVAL '1 day',
      if_not_exists => TRUE);

    -- observation_vitals: 7-day chunks. Lower volume — interval-driven,
    -- not continuous.
    PERFORM create_hypertable('observation_vitals', 'recorded_at',
      chunk_time_interval => INTERVAL '7 days',
      if_not_exists => TRUE);

    -- mar_administrations: 7-day chunks, primary lookup is
    -- per-patient per-shift so chunking by scheduled_at is fine.
    PERFORM create_hypertable('mar_administrations', 'scheduled_at',
      chunk_time_interval => INTERVAL '7 days',
      migrate_data => TRUE,
      if_not_exists => TRUE);

    -- accountability_events: 30-day chunks. V13 live feed scrolls
    -- the most recent ~10 minutes; older chunks compress well.
    PERFORM create_hypertable('accountability_events', 'at',
      chunk_time_interval => INTERVAL '30 days',
      migrate_data => TRUE,
      if_not_exists => TRUE);

    -- Compression policy: anything older than 7 days gets columnstore
    -- compression. Saves ~80% on vitals.
    ALTER TABLE icu_vitals SET (timescaledb.compress, timescaledb.compress_segmentby = 'patient_id');
    ALTER TABLE observation_vitals SET (timescaledb.compress, timescaledb.compress_segmentby = 'patient_id');
    ALTER TABLE mar_administrations SET (timescaledb.compress, timescaledb.compress_segmentby = 'patient_id');
    ALTER TABLE accountability_events SET (timescaledb.compress, timescaledb.compress_segmentby = 'tenant_id');

    BEGIN
      PERFORM add_compression_policy('icu_vitals', INTERVAL '7 days');
      PERFORM add_compression_policy('observation_vitals', INTERVAL '30 days');
      PERFORM add_compression_policy('mar_administrations', INTERVAL '30 days');
      PERFORM add_compression_policy('accountability_events', INTERVAL '90 days');
    EXCEPTION WHEN duplicate_object THEN
      -- Policy already added by a previous run.
      NULL;
    END;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- §2  V12 §6.2 composite + partial indexes drizzle-kit can't express
-- ═══════════════════════════════════════════════════════════════════

-- Trigram name search on patients (V12 §6.2 — every search box hits this)
CREATE INDEX IF NOT EXISTS patients_name_trgm_idx
  ON patients USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS doctors_name_trgm_idx
  ON doctors USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS equipment_products_title_trgm_idx
  ON equipment_products USING gin (title gin_trgm_ops);

-- Partial index: only OPEN CARs by deadline. The closed/verified ones
-- never appear on the overdue board, so don't index them.
CREATE INDEX IF NOT EXISTS cars_open_by_deadline_idx
  ON corrective_action_requests (close_by_at)
  WHERE status NOT IN ('closed', 'verified');

-- Partial index: only UNACKNOWLEDGED breaches in the live feed.
CREATE INDEX IF NOT EXISTS accountability_unack_breaches_idx
  ON accountability_events (at)
  WHERE breach IS NOT NULL AND (breach->>'acknowledgedBy') IS NULL;

-- Partial: critical lab results waiting for ack (V13 §3 30-min rule).
CREATE INDEX IF NOT EXISTS lab_results_critical_unack_idx
  ON lab_results (reported_at)
  WHERE flag IN ('critical_high', 'critical_low')
    AND critical_acknowledged_at IS NULL;

-- Patient timeline + critical labs combined.
CREATE INDEX IF NOT EXISTS lab_results_critical_only_idx
  ON lab_results (reported_at DESC)
  WHERE flag IN ('critical_high', 'critical_low');

-- Wallet ledger by ref — used by reconciliation jobs.
CREATE INDEX IF NOT EXISTS wallet_txns_ref_compound_idx
  ON wallet_txns (ref_kind, ref_id, created_at);

-- ═══════════════════════════════════════════════════════════════════
-- §3  V12 §5.1 Row-Level Security
-- ═══════════════════════════════════════════════════════════════════
--
-- Strategy: every clinical table carries tenant_id. The application
-- sets `SET LOCAL odudoc.tenant_id = '<hospital-id>'` at the start of
-- every request (a Postgres session-local GUC), and RLS policies on
-- each table compare row.tenant_id against the GUC.
--
-- For the platform role (super admin / cron jobs) the application
-- sets `SET LOCAL odudoc.tenant_id = '*'`, and the policy allows '*'
-- to read every row. Writes from '*' are still allowed because
-- platform admin sometimes needs to manually correct data.
--
-- Policies are intentionally permissive on reads-while-NULL-tenant
-- because the patient app reads patient-owned data without a tenant
-- context (patients aren't scoped to a hospital — they own their
-- record). Patient-side scoping uses `odudoc.patient_id` GUC
-- instead.

-- Helper function: current tenant from session GUC, or empty string
-- if the application hasn't set it.
CREATE OR REPLACE FUNCTION current_tenant() RETURNS text
  LANGUAGE sql STABLE AS
$$ SELECT coalesce(current_setting('odudoc.tenant_id', true), '') $$;

CREATE OR REPLACE FUNCTION current_patient() RETURNS text
  LANGUAGE sql STABLE AS
$$ SELECT coalesce(current_setting('odudoc.patient_id', true), '') $$;

-- ── Tenant-scoped clinical tables ──
DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'patients', 'encounters', 'admissions', 'discharges',
    'prescriptions', 'lab_orders', 'lab_results',
    'icu_vitals', 'observation_vitals', 'mar_administrations',
    'departments', 'wards', 'beds',
    'ppme_reports', 'ppme_test_results',
    'insurer_empanelments', 'pre_auth_requests',
    'insurance_claims', 'claim_documents',
    'near_miss_reports'
  ]) LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    -- Drop policy if exists (idempotent on re-run).
    EXECUTE format('DROP POLICY IF EXISTS %I_tenant_policy ON %I', t, t);
    EXECUTE format($pol$
      CREATE POLICY %I_tenant_policy ON %I
        USING (
          current_tenant() = '*'
          OR tenant_id = current_tenant()
          OR tenant_id IS NULL
        )
        WITH CHECK (
          current_tenant() = '*'
          OR tenant_id = current_tenant()
          OR tenant_id IS NULL
        )
    $pol$, t, t);
  END LOOP;
END $$;

-- ── Patient-self read of own records ──
-- Patients access their own records by setting odudoc.patient_id; the
-- application enforces this at sign-in. Encounters / prescriptions /
-- lab results have a patient_id column already, so the policy is a
-- straight equality.
DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT unnest(ARRAY['encounters', 'prescriptions', 'lab_orders', 'lab_results', 'admissions', 'discharges']) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_patient_self_policy ON %I', t, t);
    EXECUTE format($pol$
      CREATE POLICY %I_patient_self_policy ON %I
        FOR SELECT
        USING (
          current_patient() != ''
          AND patient_id = current_patient()
        )
    $pol$, t, t);
  END LOOP;
END $$;

-- ── Wallets — RLS by owner email/id ──
-- Wallets aren't tenant-scoped (a doctor moves between hospitals; their
-- wallet stays). Patient + doctor + entity wallets are owned by
-- entity_id matching the user's email/id. Application sets
-- odudoc.wallet_owner_id.
CREATE OR REPLACE FUNCTION current_wallet_owner() RETURNS text
  LANGUAGE sql STABLE AS
$$ SELECT coalesce(current_setting('odudoc.wallet_owner_id', true), '') $$;

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wallets_owner_policy ON wallets;
CREATE POLICY wallets_owner_policy ON wallets
  USING (
    current_tenant() = '*'  -- super admin sees everything
    OR entity_id = current_wallet_owner()
  )
  WITH CHECK (
    current_tenant() = '*'
    OR entity_id = current_wallet_owner()
  );

ALTER TABLE wallet_txns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wallet_txns_owner_policy ON wallet_txns;
CREATE POLICY wallet_txns_owner_policy ON wallet_txns
  USING (
    current_tenant() = '*'
    OR from_wallet_id IN (SELECT id FROM wallets WHERE entity_id = current_wallet_owner())
    OR to_wallet_id   IN (SELECT id FROM wallets WHERE entity_id = current_wallet_owner())
  );

-- ── Accountability events — tenant + own-actions ──
ALTER TABLE accountability_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS accountability_tenant_policy ON accountability_events;
CREATE POLICY accountability_tenant_policy ON accountability_events
  USING (
    current_tenant() = '*'
    OR tenant_id = current_tenant()
    OR tenant_id IS NULL
    -- A user always sees events they themselves caused (for the
    -- self-scorecard view).
    OR actor_email = current_wallet_owner()
  );

-- ── CARs — assignee + opener can read, tenant can read all ──
ALTER TABLE corrective_action_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cars_visibility_policy ON corrective_action_requests;
CREATE POLICY cars_visibility_policy ON corrective_action_requests
  USING (
    current_tenant() = '*'
    OR tenant_id = current_tenant()
    OR assigned_to_email = current_wallet_owner()
    OR opened_by_email = current_wallet_owner()
  );

-- ── Family — only members can see each other ──
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS family_visibility_policy ON family_members;
CREATE POLICY family_visibility_policy ON family_members
  USING (
    current_tenant() = '*'
    OR patient_id = current_patient()
    OR related_patient_id = current_patient()
  );

-- ═══════════════════════════════════════════════════════════════════
-- §4  Sequence — order numbers (referenced from schema.ts)
-- ═══════════════════════════════════════════════════════════════════

CREATE SEQUENCE IF NOT EXISTS orders_number_seq START 1;

-- ═══════════════════════════════════════════════════════════════════
-- §5  Done. Verify with:
--
--   SELECT count(*) FROM pg_tables WHERE schemaname = 'public';
--     -- expect: 47 V12 tables + 12 phase-1-6 tables + extensions = ~60+
--
--   SELECT hypertable_name FROM timescaledb_information.hypertables;
--     -- expect: icu_vitals, observation_vitals, mar_administrations,
--     --         accountability_events
--
--   SELECT tablename FROM pg_tables
--     WHERE schemaname='public' AND rowsecurity = TRUE;
--     -- expect: ~22 tables with RLS enabled
-- ═══════════════════════════════════════════════════════════════════
