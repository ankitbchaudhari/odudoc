# Drizzle migration scaffold

This directory contains the **planned** schema for moving hot stores off
`app_kv` JSONB onto proper relational tables. It is **not yet connected** to
the running application.

## Why not cut over yet?

A safe migration is a 2-week project, not a one-session task:
- Schema decisions need review (are these the right indexes? should `history`
  stay as JSONB or normalize to a `bed_assignments` join table?)
- Cutover requires dual-write for 1–2 weeks to catch bugs
- Backfilling existing tenant data needs a scripted plan per store
- Rollback path must be ready

Launching on `app_kv` is fine for the first 1–3 pilot hospitals
(≤10k rows per tenant). After ~Month 2, revisit this migration with real
production traffic shape.

## What's in here

- `schema.ts` — Drizzle table definitions for the 6 hot stores:
  `organizations`, `patients`, `appointments`, `admissions`,
  `notifications`, `subscriptions`, `audit_log`
- (future) `drizzle.config.ts`
- (future) `migrations/` — generated SQL
- (future) `backfill/` — one-off scripts to port `app_kv` → relational

## When ready to cut over

```bash
bun add drizzle-orm drizzle-kit postgres
# Create scripts/drizzle/drizzle.config.ts pointing at DATABASE_URL
npx drizzle-kit generate
# Inspect scripts/drizzle/migrations/*.sql
# Apply to a Neon dev branch first:
psql "$DATABASE_URL_DEV" -f scripts/drizzle/migrations/0000_init.sql
```

Then pick ONE store at a time (recommended order):

1. `subscriptions` (smallest table, only Stripe-related, low risk)
2. `organizations` (foundational but rarely mutated)
3. `audit_log` (append-only, easy)
4. `notifications` (high churn but we have providerRef webhooks that will
   tolerate a migration gap gracefully)
5. `patients` (tall pole — uniqueness constraints, references from many other
   tables)
6. `appointments` (concurrency-sensitive — double-booking checks)
7. `admissions` (touches `wards-store` atomically — migrate wards at the same time)

For each store:
1. Add a drizzle write alongside the existing `app_kv` write
2. Deploy, observe for 3 days
3. Add a drizzle read with `app_kv` fallback
4. Deploy, observe for 1 week, compare read results
5. Switch primary to drizzle, keep `app_kv` as shadow write
6. After 2 weeks clean, remove `app_kv` writes for that key
