# Postgres provider migration runbook

## Why

The codebase is currently on self-hosted Postgres (per `lib/db.ts` —
PgBouncer on a Hostinger VPS). That setup has no point-in-time
recovery built in, and any backup is whatever you script yourself. A
managed provider (Neon, Supabase, or Render) gives you:

- Daily snapshots + PITR (Neon: 7 days free, 30 days on Pro)
- Automated failover on the provider's infra
- One-click branching for staging environments
- A web UI to inspect rows without `psql`

## Pick a provider

| Provider | Free tier | PITR | When to choose |
|---|---|---|---|
| **Neon** | 0.5 GB storage, 10 projects | 7 days free / 30 days Pro | Postgres-native, branching is killer for staging |
| **Supabase** | 500 MB, 2 projects | 7 days | If you'll also use their auth/realtime later |
| **Render** | 256 MB, 90-day expiry | Daily snapshots | Simplest pricing, weakest free tier |

**My pick: Neon.** Postgres-native, the branching feature pays for
itself the first time you need a staging DB.

## Pre-flight (do this BEFORE running the script)

1. **Provision the destination DB.** On Neon: create a project, copy
   the DSN from the dashboard. It looks like:
   ```
   postgres://user:pass@ep-xxx.aws.neon.tech/odudoc
   ```

2. **Take a manual backup of the source.** Even though the migration
   script also dumps, having a separate backup file in your hands is
   cheap insurance:
   ```bash
   pg_dump --format=custom --file=odudoc-pre-migration.dump "$SOURCE_DSN"
   ```

3. **Quiesce writes.** Either:
   - Put up a maintenance banner from `/admin/settings` and ask
     admins to pause for the migration window (~10 minutes for
     anything <1 GB)
   - OR accept ≤a few minutes of replication drift; pick up new
     rows after cutover from the dump-tail timestamp

4. **Have the Vercel project page open** in another tab so you can
   flip `DATABASE_URL` immediately after the post-flight check
   passes.

## Run

```bash
export SOURCE_DSN="postgres://odudoc:...@vps.host:5432/odudoc"
export DEST_DSN="postgres://odudoc:...@ep-xxx.aws.neon.tech/odudoc"
bash scripts/migrate-postgres.sh
```

The script will:
1. `pg_dump` source → `odudoc-dump-<timestamp>.dump`
2. `pg_restore` → destination (with `--clean --if-exists` so it's
   idempotent if you re-run)
3. Print a side-by-side row count comparison for every major table

If any DRIFT column shows a non-zero negative number, **stop** —
something didn't restore. Check the pg_restore output for errors and
re-run.

## Cutover

1. In Vercel → Project Settings → Environment Variables:
   - Set `DATABASE_URL` to `$DEST_DSN`
   - Set `DATABASE_URL_DIRECT` to `$DEST_DSN` (same value — we don't
     use a separate direct URL on the new provider)
2. Trigger a redeploy (Vercel → Deployments → ⋯ → Redeploy)
3. Watch `/api/health` — confirm `checks.db.ok === true` and the
   latency looks reasonable (Neon eu-central-1 from a Vercel iad1
   Lambda will be ~80-120ms; that's normal)
4. Spot-check one read path (`/admin/orders`, `/admin/doctors`) and
   one write path (toggle a doctor status, then untoggle)

## After

- Keep the source DB running for 24-48h as a rollback. If anything
  goes sideways, flip `DATABASE_URL` back and re-deploy.
- Keep the dump file (`odudoc-dump-*.dump`) for 7+ days. Encrypt it
  or store it somewhere private — it contains every user record.
- Once you've gone 48h on the new DB without incident:
  - Tear down the source DB
  - Update `lib/db.ts` comment block to reflect the new host (the
    file documents the connection setup; nothing functional changes)
- Schedule the first backup-restore drill: pick a Neon snapshot,
  create a branch from it, point a staging deploy at the branch,
  confirm the data looks right. Quarterly cadence.

## If you hit trouble

| Symptom | Fix |
|---|---|
| `pg_restore` errors on `app_kv` "duplicate key" | The `--clean` flag should drop tables first; if it didn't, manually `TRUNCATE app_kv` on the destination and re-run pg_restore |
| `/api/health` shows `db.ok=false` after cutover | Wrong DSN format — Neon needs `?sslmode=require` appended; Supabase wants the pooler URL not the direct URL |
| Write path 500s with "PgBouncer unsupported" | Drop `prepare: false` setup in `lib/db.ts` if you're now on a non-PgBouncer host. (Both Neon and Supabase use their own pooling, so this might not bite, but if you see it that's the fix.) |
