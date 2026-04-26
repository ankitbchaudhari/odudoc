-- Phase 6 — Doctor withdrawal requests
--
-- Pulls withdrawals out of the app_kv JSON blob into a dedicated
-- table. Same dual-write pattern as the orders migration in 0001:
-- the app keeps writing to the JSON blob while also writing here, so
-- this migration can land on production without an application-side
-- cutover required.
--
-- Idempotent — IF NOT EXISTS guards.

CREATE TABLE IF NOT EXISTS "withdrawals" (
  "id" text PRIMARY KEY NOT NULL,
  "doctor_email" text NOT NULL,
  "doctor_name" text NOT NULL,
  "amount" real NOT NULL,
  "method" text NOT NULL,
  "account_details" text NOT NULL,
  "notes" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "admin_note" text,
  "requested_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "withdrawals_doctor_email_idx" ON "withdrawals" ("doctor_email");
CREATE INDEX IF NOT EXISTS "withdrawals_status_idx" ON "withdrawals" ("status");
CREATE INDEX IF NOT EXISTS "withdrawals_requested_at_idx" ON "withdrawals" ("requested_at");
CREATE INDEX IF NOT EXISTS "withdrawals_status_requested_idx" ON "withdrawals" ("status", "requested_at");
