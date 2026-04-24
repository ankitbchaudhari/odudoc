// Drizzle schema — single source of truth for every table added during
// the app_kv → relational cutover.
//
// Phase 1 (this file, today): foundation only. No tables defined yet.
// Phase 2 adds: users, sessions, accounts, verification_tokens (next-auth).
// Phase 3 adds: bookings, payments, payment_events.
// Phase 4 adds: doctors, vendors, products, services.
// Phase 5 adds: coupons, coupon_redemptions, reviews.
// Phase 6 adds: pages, posts, announcements.
//
// Rules for every future addition:
//  - Use `bigint generated always as identity` for PKs (replica-safe at 1M scale).
//    NEVER `serial` — breaks logical replication and hits int4 ceiling.
//  - Every FK column gets an index (Postgres doesn't auto-index them).
//  - Every column used in WHERE / ORDER BY gets an index.
//  - Timestamps: `timestamp({ withTimezone: true })` with `defaultNow()`.
//  - Soft-delete columns (`deletedAt`) over hard DELETE where audit matters.
//  - No CASCADE deletes on user-facing tables — we want the error.
//
// Generate migration:  npm run db:generate
// Apply migration:     npm run db:migrate

// Re-export nothing for now. Drizzle Kit is happy with an empty schema file
// and will emit "No schema changes" until a table is declared here.
export {};
