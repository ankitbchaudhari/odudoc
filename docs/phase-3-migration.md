# Phase 3: Migrate from `/tmp` JSON stores to real persistence

Current state: every store in `lib/*-store.ts` is a module-scoped in-memory
array that gets seeded on cold start and persisted to a JSON file in
`/tmp/odudoc/` (or `$ODUDOC_DATA_DIR`). On Vercel that's survives warm lambda
reuse but is effectively ephemeral between deploys and across regions.

This doc is the plan for moving those stores to Vercel Postgres (Neon) with
the `@vercel/postgres` client while keeping the existing function signatures
so route handlers don't change.

---

## 1. Stores to migrate

| Store | File | Row count (est) | Hot reads |
|---|---|---|---|
| Vendors | `lib/vendors-store.ts` | 10s–100s | admin list, `getVendorByEmail` per request |
| Products (vendor) | `lib/products-vendor-store.ts` | 100s–1000s | `/api/products`, product detail |
| Orders | `lib/orders-store.ts` | 1000s+ | orders list, `listOrdersByVendor` |
| Payouts | `lib/payouts-store.ts` | 1000s+ | admin ledger, vendor payouts, webhook markPaid |
| Consultations | `lib/consultations-store.ts` | 100s–1000s | dashboard, doctor inbox |

Everything else (static content, session JWT, files-service pointers) is
already external and stays.

## 2. Target: Vercel Postgres

Chosen over KV/Redis because we need:
- Joins (orders × vendors, payouts × vendors)
- Filter + sort on timeseries (analytics)
- Unique constraints (e.g. `(orderId, vendorId)` idempotency for payouts)

SQLite via Turso is a plausible alternative; plan assumes Vercel Postgres.

## 3. Schema sketch

```sql
create table vendors (
  id text primary key,
  name text not null,
  owner_name text not null,
  owner_email text not null unique,
  phone text not null,
  address_line text not null,
  city text not null,
  country text not null,
  license_number text not null,
  license_doc_url text,
  bank_account text,
  commission_percent numeric(5,2) not null default 10,
  status text not null,
  status_reason text,
  stripe_account_id text,
  stripe_payouts_enabled boolean not null default false,
  stripe_details_submitted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz
);
create index on vendors (status);

create table products (
  id text primary key,
  vendor_id text not null references vendors(id) on delete cascade,
  name text not null,
  category text not null,
  description text,
  price numeric(10,2) not null,
  original_price numeric(10,2),
  stock integer not null default 0,
  color text,
  prescription_required boolean not null default false,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on products (vendor_id);
create index on products (status);

create table orders (
  id text primary key,
  order_number text not null unique,
  customer text not null,
  email text not null,
  phone text not null,
  subtotal numeric(10,2) not null,
  shipping numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  payment_status text not null,
  order_status text not null,
  shipping_address text not null,
  notes text,
  tracking_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on orders (email);
create index on orders (created_at desc);

create table order_items (
  id bigserial primary key,
  order_id text not null references orders(id) on delete cascade,
  product_id text,
  name text not null,
  quantity integer not null,
  price numeric(10,2) not null,
  vendor_id text,
  vendor_name text
);
create index on order_items (order_id);
create index on order_items (vendor_id);

create table payouts (
  id text primary key,
  vendor_id text not null references vendors(id),
  vendor_name text not null,
  order_id text not null references orders(id),
  order_number text not null,
  gross_amount numeric(10,2) not null,
  commission_percent numeric(5,2) not null,
  commission_amount numeric(10,2) not null,
  net_amount numeric(10,2) not null,
  status text not null,
  paid_at timestamptz,
  stripe_transfer_id text,
  transfer_initiated_at timestamptz,
  transfer_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, vendor_id)
);
create index on payouts (vendor_id, status);

create table consultations (
  -- mirror of existing consultation shape
  id text primary key,
  ...
);
```

## 4. Code migration strategy

Keep `lib/*-store.ts` function signatures identical, swap the
implementation body. Route handlers need **zero changes**.

1. Introduce `lib/db.ts` — thin wrapper around `sql` from `@vercel/postgres`
   with a typed query helper and test-mode toggle.
2. Add a `DATA_BACKEND=postgres|memory` env switch. Default to `memory` so
   local dev without Postgres still works.
3. For each store, add a Postgres-backed branch:
   ```ts
   export async function getVendorById(id: string): Promise<Vendor | null> {
     if (backend === "memory") return memory.getVendorById(id);
     const { rows } = await sql`select * from vendors where id = ${id}`;
     return rows[0] ? mapVendorRow(rows[0]) : null;
   }
   ```
4. **Signatures become async.** This is the breaking change. Every caller
   needs `await`. Easiest path: change all store functions to async in one
   PR, fix the fallout across route handlers (all already run in Node).
5. Remove `persist()`/`loadFromDisk()` code paths once Postgres backend is
   the default.

### Idempotency gotcha

`recordOrderPayouts` currently relies on array scan for `(orderId, vendorId)`
dedupe. In Postgres, rely on the `unique (order_id, vendor_id)` constraint
and use `on conflict do nothing returning *` so concurrent webhook
invocations don't double-insert.

## 5. Data migration

For each JSON file currently in `/tmp/odudoc/`:

```
scripts/migrate-json-to-postgres.ts
  - reads $ODUDOC_DATA_DIR
  - bulk-inserts into corresponding table (upsert on id)
```

Run once with `DATA_BACKEND=memory` reading the JSON, then flip the env var.

Since `/tmp` is per-instance on Vercel, the authoritative JSON lives on a
developer machine. Export via `vercel env pull` + a one-off Node script
against the local data dir is enough for the ~handful of real rows we have.

## 6. Files-service and sessions

No change. Files stay on the VPS, signed URLs as-is. NextAuth still uses
JWT sessions.

## 7. Rollout

1. Create Postgres DB via Vercel dashboard, wire env vars.
2. Land schema migration (sql file or Prisma — stay raw SQL for now).
3. PR 1: add `DATA_BACKEND` switch, make store functions async, default
   still memory.
4. PR 2: implement Postgres branches for `vendors` + `products` (lowest
   write volume, highest read value).
5. PR 3: `orders` + `order_items`.
6. PR 4: `payouts` (includes the unique-constraint idempotency change).
7. PR 5: `consultations`.
8. PR 6: flip `DATA_BACKEND=postgres` in prod, remove JSON-persist code.

Rollback: flip env var back; JSON code path stays until PR 8.

## 8. Out of scope for Phase 3

- Sharding / read replicas
- Full-text search on products (add later with pg_trgm or Typesense)
- Audit log tables (add once compliance story needs it)
