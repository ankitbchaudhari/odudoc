# scripts/

Operational scripts. Not shipped to the browser.

## `db-migrate.ts` — apply Drizzle migrations

**Run from the Hostinger VPS only.** Not from Vercel, not from a laptop.

### Why from the VPS?

Our runtime `DATABASE_URL` points at **PgBouncer on port 6432** (transaction pooling). Drizzle's migrator calls `pg_advisory_lock()`, which needs a **session-scoped** connection. Running migrations through PgBouncer stalls or silently skips. The script refuses to run if it detects port 6432.

### One-time VPS setup

SSH in once and install tooling:

```bash
ssh <you>@69.62.77.194
cd /srv/odudoc                  # or wherever the repo lives on the VPS
git pull origin main
npm ci --omit=optional          # prod deps + dev deps needed by drizzle-kit
```

Set a **direct** (non-pooled) Postgres URL in your shell — NOT exported in `.env` that the app reads:

```bash
# bypass PgBouncer by connecting to Postgres directly on localhost
export DATABASE_URL_DIRECT='postgres://odudoc_app:<password>@localhost:5432/odudoc?sslmode=disable'
```

`sslmode=disable` is fine because the connection never leaves the VPS. If you prefer SSL even on localhost, use `sslmode=require` — the script handles both.

### Run a migration

After pulling a commit that adds a new file under `lib/drizzle/migrations/`:

```bash
cd /srv/odudoc
git pull origin main
npm ci --omit=optional          # only if package-lock.json changed
npm run db:migrate
```

Expected output:

```
[db:migrate] applying migrations from lib/drizzle/migrations…
[db:migrate] done in 412ms
```

### Idempotency

Drizzle records every applied migration in `drizzle.__drizzle_migrations` keyed by content hash. Re-running the script after a successful apply is a **no-op** — no schema change, no error. If a migration fails mid-way, Postgres rolls back the transaction: fix the SQL and re-run.

### Rollback

Drizzle doesn't ship automatic down migrations. For each migration we land, we keep a matching rollback SQL in `lib/drizzle/migrations/rollbacks/<name>.sql` (TODO: author these per phase). Apply manually via `psql` if needed.

### Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `port 6432 (PgBouncer)` error | `DATABASE_URL_DIRECT` not set or still points at pooler | Export a `localhost:5432` URL |
| `pg_advisory_lock` hang | Ran through PgBouncer anyway | Kill the process, set direct URL, re-run |
| `relation "__drizzle_migrations" does not exist` on second run | Previous run crashed before creating the tracking table | Re-run — the migrator creates it on start |
| `role "odudoc_app" does not exist` | Wrong credentials | Re-check `DATABASE_URL_DIRECT` |
| SSL handshake errors on localhost | Postgres `pg_hba.conf` requires SSL for remote but not local | Use `sslmode=disable` on localhost |
