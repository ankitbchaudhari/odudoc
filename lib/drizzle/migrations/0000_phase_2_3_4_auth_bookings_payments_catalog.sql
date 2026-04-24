CREATE TABLE "accounts" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"doctor_id" text,
	"doctor_name" text NOT NULL,
	"patient_id" text,
	"patient_name" text NOT NULL,
	"patient_phone" text DEFAULT '' NOT NULL,
	"patient_email" text,
	"time_slot" text NOT NULL,
	"appointment_type" text DEFAULT 'in-person' NOT NULL,
	"fee" real NOT NULL,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"payment_intent_id" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "doctors" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"specialty" text NOT NULL,
	"email" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL,
	"commission" real DEFAULT 30 NOT NULL,
	"rating" real DEFAULT 0 NOT NULL,
	"consultation_count" integer DEFAULT 0 NOT NULL,
	"tier" text DEFAULT 'Bronze' NOT NULL,
	"image_url" text,
	"bio" text,
	"qualifications" text,
	"experience" integer,
	"city" text,
	"location" text,
	"fee" real,
	"gender" text,
	"country" text,
	"services" jsonb,
	"time_slots" jsonb,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "payment_events" (
	"id" text PRIMARY KEY NOT NULL,
	"payment_id" text,
	"provider" text NOT NULL,
	"event_type" text NOT NULL,
	"signature_valid" boolean NOT NULL,
	"raw_payload" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"provider_payment_id" text NOT NULL,
	"booking_id" text,
	"user_id" text,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_provider_payment_id_unique" UNIQUE("provider","provider_payment_id")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"vendor_id" text,
	"vendor_name" text,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category" text NOT NULL,
	"price" real NOT NULL,
	"original_price" real NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'Draft' NOT NULL,
	"prescription_required" boolean DEFAULT false NOT NULL,
	"color" text DEFAULT '' NOT NULL,
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" timestamp with time zone,
	"phone" text DEFAULT '' NOT NULL,
	"image" text,
	"password" text,
	"role" text DEFAULT 'patient' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"ban_reason" text,
	"banned_at" timestamp with time zone,
	"warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"temp_password_expires_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"owner_name" text NOT NULL,
	"owner_email" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"address_line" text DEFAULT '' NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"country" text DEFAULT '' NOT NULL,
	"license_number" text NOT NULL,
	"license_doc_url" text,
	"bank_account" text,
	"commission_percent" real DEFAULT 15 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"status_reason" text,
	"stripe_account_id" text,
	"stripe_payouts_enabled" boolean,
	"stripe_details_submitted" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bookings_doctor_id_idx" ON "bookings" USING btree ("doctor_id");--> statement-breakpoint
CREATE INDEX "bookings_patient_id_idx" ON "bookings" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "bookings_payment_intent_idx" ON "bookings" USING btree ("payment_intent_id");--> statement-breakpoint
CREATE INDEX "bookings_payment_status_idx" ON "bookings" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "bookings_created_at_idx" ON "bookings" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "doctors_email_idx" ON "doctors" USING btree ("email");--> statement-breakpoint
CREATE INDEX "doctors_user_id_idx" ON "doctors" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "doctors_specialty_idx" ON "doctors" USING btree ("specialty");--> statement-breakpoint
CREATE INDEX "doctors_status_idx" ON "doctors" USING btree ("status");--> statement-breakpoint
CREATE INDEX "doctors_tier_idx" ON "doctors" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "doctors_city_idx" ON "doctors" USING btree ("city");--> statement-breakpoint
CREATE INDEX "payment_events_payment_id_idx" ON "payment_events" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "payment_events_provider_type_idx" ON "payment_events" USING btree ("provider","event_type");--> statement-breakpoint
CREATE INDEX "payment_events_received_at_idx" ON "payment_events" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "payments_booking_id_idx" ON "payments" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "payments_user_id_idx" ON "payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payments_created_at_idx" ON "payments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "products_vendor_id_idx" ON "products" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category");--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "products_status_category_idx" ON "products" USING btree ("status","category");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "vendors_owner_email_idx" ON "vendors" USING btree ("owner_email");--> statement-breakpoint
CREATE INDEX "vendors_user_id_idx" ON "vendors" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "vendors_status_idx" ON "vendors" USING btree ("status");--> statement-breakpoint
CREATE INDEX "verification_tokens_expires_idx" ON "verification_tokens" USING btree ("expires");