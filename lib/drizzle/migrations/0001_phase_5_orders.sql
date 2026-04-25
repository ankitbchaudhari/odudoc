-- Phase 5 — Shop orders
--
-- Migrates orders from the app_kv JSON blob ("orders" key) to a real
-- relational schema. Header (orders) + line items (order_items). Order
-- number generation moves to a Postgres SEQUENCE so deletes can't
-- collide future numbers.
--
-- Idempotent — uses IF NOT EXISTS guards so re-running this on a DB
-- that already has the tables is a no-op. The dual-write phase in
-- lib/orders-store.ts keeps the JSON blob in sync until reads are
-- flipped, so this migration can land on production without an
-- application change required.

CREATE SEQUENCE IF NOT EXISTS orders_number_seq START 1;

CREATE TABLE IF NOT EXISTS "orders" (
  "id" text PRIMARY KEY NOT NULL,
  "order_number" text NOT NULL,
  "customer" text NOT NULL,
  "email" text NOT NULL,
  "phone" text DEFAULT '' NOT NULL,
  "subtotal" real NOT NULL,
  "shipping" real DEFAULT 0 NOT NULL,
  "total" real NOT NULL,
  "payment_status" text DEFAULT 'Pending' NOT NULL,
  "order_status" text DEFAULT 'Pending' NOT NULL,
  "shipping_address" text NOT NULL,
  "notes" text,
  "tracking_number" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  CONSTRAINT "orders_order_number_unique" UNIQUE("order_number")
);

CREATE TABLE IF NOT EXISTS "order_items" (
  "id" text PRIMARY KEY NOT NULL,
  "order_id" text NOT NULL,
  "product_id" text,
  "name" text NOT NULL,
  "quantity" integer NOT NULL,
  "price" real NOT NULL,
  "vendor_id" text,
  "vendor_name" text,
  "position" integer DEFAULT 0 NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "order_items"
   ADD CONSTRAINT "order_items_order_id_orders_id_fk"
   FOREIGN KEY ("order_id") REFERENCES "orders"("id");
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "orders_email_idx" ON "orders" ("email");
CREATE INDEX IF NOT EXISTS "orders_order_status_idx" ON "orders" ("order_status");
CREATE INDEX IF NOT EXISTS "orders_payment_status_idx" ON "orders" ("payment_status");
CREATE INDEX IF NOT EXISTS "orders_created_at_idx" ON "orders" ("created_at");
CREATE INDEX IF NOT EXISTS "orders_status_created_idx" ON "orders" ("order_status", "created_at");

CREATE INDEX IF NOT EXISTS "order_items_order_id_idx" ON "order_items" ("order_id");
CREATE INDEX IF NOT EXISTS "order_items_vendor_id_idx" ON "order_items" ("vendor_id");
CREATE INDEX IF NOT EXISTS "order_items_product_id_idx" ON "order_items" ("product_id");
