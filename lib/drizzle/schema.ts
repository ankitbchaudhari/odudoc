// Drizzle schema — source of truth for the app_kv → relational cutover.
//
// Phases 2, 3, 4 live in this file. Each table mirrors the existing store
// interface (lib/*-store.ts) 1:1 so the backfill script in a later commit
// is a straight JSON → row copy. IDs stay TEXT (not bigint) because the
// existing blob holds heterogeneous string IDs ("BK-1004", "v-house",
// "admin-001") and every call site references them by string. Renumbering
// at cutover would force a rewrite of every FK reference in the codebase
// for zero gain at 1k-user scale.
//
// Rules observed:
//  - Every FK column has its own index (Postgres doesn't auto-index FKs).
//  - Every column used in WHERE / ORDER BY has an index.
//  - Timestamps: timestamp({ withTimezone: true }) with defaultNow().
//  - Status fields: text + CHECK-via-enum in app code (not pg enum, so we
//    can add values without ALTER TYPE on a live DB — pg enum alterations
//    require superuser and can't run inside a pooled migration session).
//  - No CASCADE on user-facing FKs — we want the error, not silent loss.
//  - deletedAt soft-delete on user-visible records (users, doctors, vendors,
//    products, bookings). Hard DELETE only on session/token tables.
//
// Migration discipline: run `npm run db:generate` AFTER any change here,
// then review the emitted SQL before `npm run db:migrate`. NEVER hand-edit
// a migration file once it has been applied to any environment.

import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Phase 2 — Auth (next-auth compatible)
// ---------------------------------------------------------------------------
//
// Shape follows the next-auth Postgres adapter convention so we can plug in
// `@auth/drizzle-adapter` in the adapter-swap commit without touching column
// names. `users.password` is kept (credentials provider) — next-auth's
// default schema doesn't have it, but the adapter permits extra columns.

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: timestamp("email_verified", { withTimezone: true }),
    phone: text("phone").notNull().default(""),
    image: text("image"),
    // Credentials provider — bcrypt hash. Nullable for OAuth-only accounts.
    password: text("password"),
    role: text("role").notNull().default("patient"), // patient|doctor|admin|staff|vendor
    status: text("status").notNull().default("active"), // active|banned
    banReason: text("ban_reason"),
    bannedAt: timestamp("banned_at", { withTimezone: true }),
    warnings: jsonb("warnings").notNull().default(sql`'[]'::jsonb`),
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    tempPasswordExpiresAt: timestamp("temp_password_expires_at", {
      withTimezone: true,
    }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    emailIdx: unique("users_email_unique").on(t.email),
    roleIdx: index("users_role_idx").on(t.role),
    statusIdx: index("users_status_idx").on(t.status),
    createdAtIdx: index("users_created_at_idx").on(t.createdAt),
  }),
);

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refreshToken: text("refresh_token"),
    accessToken: text("access_token"),
    expiresAt: integer("expires_at"),
    tokenType: text("token_type"),
    scope: text("scope"),
    idToken: text("id_token"),
    sessionState: text("session_state"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.provider, t.providerAccountId] }),
    userIdx: index("accounts_user_id_idx").on(t.userId),
  }),
);

export const sessions = pgTable(
  "sessions",
  {
    sessionToken: text("session_token").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (t) => ({
    userIdx: index("sessions_user_id_idx").on(t.userId),
    expiresIdx: index("sessions_expires_idx").on(t.expires),
  }),
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.identifier, t.token] }),
    expiresIdx: index("verification_tokens_expires_idx").on(t.expires),
  }),
);

// ---------------------------------------------------------------------------
// Phase 4 — Doctors / Vendors / Products  (defined before Phase 3 so that
//   bookings.doctor_id can FK to doctors.id without a forward reference)
// ---------------------------------------------------------------------------

export const doctors = pgTable(
  "doctors",
  {
    id: text("id").primaryKey(), // mirrors existing "doc-xxx" IDs
    userId: text("user_id").references(() => users.id), // nullable: legacy rows pre-auth link
    name: text("name").notNull(),
    specialty: text("specialty").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull().default(""),
    status: text("status").notNull().default("Active"), // Active|Inactive
    commission: real("commission").notNull().default(30),
    rating: real("rating").notNull().default(0),
    consultationCount: integer("consultation_count").notNull().default(0),
    tier: text("tier").notNull().default("Bronze"), // Bronze|Silver|Gold|Platinum
    imageUrl: text("image_url"),
    bio: text("bio"),
    qualifications: text("qualifications"),
    experience: integer("experience"),
    city: text("city"),
    location: text("location"),
    fee: real("fee"),
    gender: text("gender"), // Male|Female
    country: text("country"),
    services: jsonb("services"), // string[]
    timeSlots: jsonb("time_slots"), // string[]
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    emailIdx: index("doctors_email_idx").on(t.email),
    userIdx: index("doctors_user_id_idx").on(t.userId),
    specialtyIdx: index("doctors_specialty_idx").on(t.specialty),
    statusIdx: index("doctors_status_idx").on(t.status),
    tierIdx: index("doctors_tier_idx").on(t.tier),
    cityIdx: index("doctors_city_idx").on(t.city),
  }),
);

export const vendors = pgTable(
  "vendors",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id),
    name: text("name").notNull(),
    ownerName: text("owner_name").notNull(),
    ownerEmail: text("owner_email").notNull(),
    phone: text("phone").notNull().default(""),
    addressLine: text("address_line").notNull().default(""),
    city: text("city").notNull().default(""),
    country: text("country").notNull().default(""),
    licenseNumber: text("license_number").notNull(),
    licenseDocUrl: text("license_doc_url"),
    bankAccount: text("bank_account"),
    commissionPercent: real("commission_percent").notNull().default(15),
    status: text("status").notNull().default("pending"), // pending|approved|suspended|rejected
    statusReason: text("status_reason"),
    stripeAccountId: text("stripe_account_id"),
    stripePayoutsEnabled: boolean("stripe_payouts_enabled"),
    stripeDetailsSubmitted: boolean("stripe_details_submitted"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    ownerEmailIdx: index("vendors_owner_email_idx").on(t.ownerEmail),
    userIdx: index("vendors_user_id_idx").on(t.userId),
    statusIdx: index("vendors_status_idx").on(t.status),
  }),
);

export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id").references(() => vendors.id),
    vendorName: text("vendor_name"),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    category: text("category").notNull(),
    price: real("price").notNull(),
    originalPrice: real("original_price").notNull(),
    stock: integer("stock").notNull().default(0),
    status: text("status").notNull().default("Draft"), // Active|Draft|Out of Stock
    prescriptionRequired: boolean("prescription_required")
      .notNull()
      .default(false),
    color: text("color").notNull().default(""),
    imageUrl: text("image_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    vendorIdx: index("products_vendor_id_idx").on(t.vendorId),
    categoryIdx: index("products_category_idx").on(t.category),
    statusIdx: index("products_status_idx").on(t.status),
    // Composite for the storefront's common filter: active + category.
    statusCategoryIdx: index("products_status_category_idx").on(
      t.status,
      t.category,
    ),
  }),
);

// ---------------------------------------------------------------------------
// Phase 5 — Shop orders
// ---------------------------------------------------------------------------
//
// Pulls the orders blob (lib/orders-store.ts) into a real schema.
// Header table holds the customer + totals; line items live in their
// own table so we can index by vendor for the vendor dashboard's
// "orders that contain my products" query without scanning every order.
//
// Order numbers move from `orders.length + 1` (fragile after deletes)
// to a Postgres SEQUENCE, formatted ORD-YYYY-NNNNN at write time.

export const orderNumberSeq = sql`CREATE SEQUENCE IF NOT EXISTS orders_number_seq START 1`;

export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(), // app-generated, e.g. "o-<base36>-<rand>"
    orderNumber: text("order_number").notNull().unique(),
    customer: text("customer").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull().default(""),
    subtotal: real("subtotal").notNull(),
    shipping: real("shipping").notNull().default(0),
    total: real("total").notNull(),
    paymentStatus: text("payment_status").notNull().default("Pending"), // Paid|Pending|Refunded
    orderStatus: text("order_status").notNull().default("Pending"), // Pending|Processing|Shipped|Delivered|Cancelled
    shippingAddress: text("shipping_address").notNull(),
    notes: text("notes"),
    trackingNumber: text("tracking_number"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    emailIdx: index("orders_email_idx").on(t.email),
    orderStatusIdx: index("orders_order_status_idx").on(t.orderStatus),
    paymentStatusIdx: index("orders_payment_status_idx").on(t.paymentStatus),
    createdAtIdx: index("orders_created_at_idx").on(t.createdAt),
    // Composite for the admin "filter by status + sort by date" view.
    statusCreatedIdx: index("orders_status_created_idx").on(
      t.orderStatus,
      t.createdAt,
    ),
  }),
);

export const orderItems = pgTable(
  "order_items",
  {
    id: text("id").primaryKey(), // app-generated, "oi-<rand>"
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    productId: text("product_id"), // soft ref — products may be deleted post-order
    name: text("name").notNull(), // snapshot at order time
    quantity: integer("quantity").notNull(),
    price: real("price").notNull(), // snapshot at order time
    vendorId: text("vendor_id"), // soft ref for the same reason
    vendorName: text("vendor_name"),
    position: integer("position").notNull().default(0), // ordering within the order
  },
  (t) => ({
    orderIdx: index("order_items_order_id_idx").on(t.orderId),
    vendorIdx: index("order_items_vendor_id_idx").on(t.vendorId),
    productIdx: index("order_items_product_id_idx").on(t.productId),
  }),
);

// ---------------------------------------------------------------------------
// Phase 6 — Doctor withdrawal requests
// ---------------------------------------------------------------------------
//
// Same shape as the bindPersistentArray store in lib/withdrawals-store.ts.
// Indexes match the read paths: by doctor email (doctor's own list) and
// by status (admin "pending requests" filter).

export const withdrawals = pgTable(
  "withdrawals",
  {
    id: text("id").primaryKey(), // app-generated, "wd-<base36>-<rand>"
    doctorEmail: text("doctor_email").notNull(),
    doctorName: text("doctor_name").notNull(),
    amount: real("amount").notNull(),
    method: text("method").notNull(), // bank_transfer | paypal | stripe | other
    accountDetails: text("account_details").notNull(),
    notes: text("notes"),
    status: text("status").notNull().default("pending"), // pending|approved|rejected|paid
    adminNote: text("admin_note"),
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    doctorEmailIdx: index("withdrawals_doctor_email_idx").on(t.doctorEmail),
    statusIdx: index("withdrawals_status_idx").on(t.status),
    requestedAtIdx: index("withdrawals_requested_at_idx").on(t.requestedAt),
    statusRequestedIdx: index("withdrawals_status_requested_idx").on(
      t.status,
      t.requestedAt,
    ),
  }),
);

// ---------------------------------------------------------------------------
// Phase 3 — Bookings / Payments / PaymentEvents
// ---------------------------------------------------------------------------

export const bookings = pgTable(
  "bookings",
  {
    id: text("id").primaryKey(), // "BK-1004" style preserved
    doctorId: text("doctor_id").references(() => doctors.id),
    doctorName: text("doctor_name").notNull(),
    patientId: text("patient_id").references(() => users.id), // nullable for guest bookings
    patientName: text("patient_name").notNull(),
    patientPhone: text("patient_phone").notNull().default(""),
    patientEmail: text("patient_email"),
    timeSlot: text("time_slot").notNull(),
    appointmentType: text("appointment_type").notNull().default("in-person"),
    fee: real("fee").notNull(),
    paymentStatus: text("payment_status").notNull().default("pending"), // pending|paid|failed|refunded
    paymentIntentId: text("payment_intent_id").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    doctorIdx: index("bookings_doctor_id_idx").on(t.doctorId),
    patientIdx: index("bookings_patient_id_idx").on(t.patientId),
    paymentIntentIdx: index("bookings_payment_intent_idx").on(t.paymentIntentId),
    paymentStatusIdx: index("bookings_payment_status_idx").on(t.paymentStatus),
    createdAtIdx: index("bookings_created_at_idx").on(t.createdAt),
  }),
);

// Payments table is the authoritative record of every money movement.
// One row per payment intent (Stripe PI, PayU txnid, etc.). Webhook
// deliveries append to payment_events for audit; they do NOT mutate this
// row's amount — only its status.
export const payments = pgTable(
  "payments",
  {
    id: text("id").primaryKey(), // app-generated, e.g. "pay_<nanoid>"
    provider: text("provider").notNull(), // stripe|payu|tazapay|connectpay|induspays
    providerPaymentId: text("provider_payment_id").notNull(), // PI id / txnid
    bookingId: text("booking_id").references(() => bookings.id),
    userId: text("user_id").references(() => users.id),
    amountCents: integer("amount_cents").notNull(), // integer cents/paise
    currency: text("currency").notNull().default("INR"),
    status: text("status").notNull().default("pending"), // pending|succeeded|failed|refunded|disputed
    description: text("description"),
    metadata: jsonb("metadata"), // free-form per-provider
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    providerIdIdx: unique("payments_provider_payment_id_unique").on(
      t.provider,
      t.providerPaymentId,
    ),
    bookingIdx: index("payments_booking_id_idx").on(t.bookingId),
    userIdx: index("payments_user_id_idx").on(t.userId),
    statusIdx: index("payments_status_idx").on(t.status),
    createdAtIdx: index("payments_created_at_idx").on(t.createdAt),
  }),
);

// Append-only audit log of every webhook we received. Signature check
// result is stored so we can tell "we rejected this" from "we never saw
// this" when debugging. Never mutated — only inserted.
export const paymentEvents = pgTable(
  "payment_events",
  {
    id: text("id").primaryKey(), // webhook event id from provider (dedup)
    paymentId: text("payment_id").references(() => payments.id),
    provider: text("provider").notNull(),
    eventType: text("event_type").notNull(), // e.g. payment_intent.succeeded
    signatureValid: boolean("signature_valid").notNull(),
    rawPayload: jsonb("raw_payload").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    paymentIdx: index("payment_events_payment_id_idx").on(t.paymentId),
    providerTypeIdx: index("payment_events_provider_type_idx").on(
      t.provider,
      t.eventType,
    ),
    receivedAtIdx: index("payment_events_received_at_idx").on(t.receivedAt),
  }),
);

// ---------------------------------------------------------------------------
// Relations (optional — Drizzle uses these for `with` joins only, not FKs)
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  bookings: many(bookings),
  payments: many(payments),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const doctorsRelations = relations(doctors, ({ one, many }) => ({
  user: one(users, { fields: [doctors.userId], references: [users.id] }),
  bookings: many(bookings),
}));

export const vendorsRelations = relations(vendors, ({ one, many }) => ({
  user: one(users, { fields: [vendors.userId], references: [users.id] }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one }) => ({
  vendor: one(vendors, {
    fields: [products.vendorId],
    references: [vendors.id],
  }),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  doctor: one(doctors, {
    fields: [bookings.doctorId],
    references: [doctors.id],
  }),
  patient: one(users, {
    fields: [bookings.patientId],
    references: [users.id],
  }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  booking: one(bookings, {
    fields: [payments.bookingId],
    references: [bookings.id],
  }),
  user: one(users, { fields: [payments.userId], references: [users.id] }),
  events: many(paymentEvents),
}));

export const paymentEventsRelations = relations(paymentEvents, ({ one }) => ({
  payment: one(payments, {
    fields: [paymentEvents.paymentId],
    references: [payments.id],
  }),
}));

// ---------------------------------------------------------------------------
// V12 — 47 missing tables (clinical, wallet, accountability, marketplaces,
// insurance, pharma, education). Re-exported so drizzle-kit picks them up
// from this single entry point.
// ---------------------------------------------------------------------------

export * from "./schema-v12";

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
}));
