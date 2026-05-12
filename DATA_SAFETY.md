# OduDoc data safety contract

What the platform guarantees, what it does NOT, and what *you* must
configure at the database provider.

This document was written after the `jolaha9382@imashr.com` incident
where a signed-up user's verification succeeded but login then
reported "No account found." Root cause: a transient Postgres
connection error during a cold Lambda's hydrate caused the user-store
to seed with `[admin, vendor]` and write that seed back to Postgres,
wiping every real user.

## Application-layer defences (now in place)

### Layer 1 — Strict load discrimination

`lib/persistent-array.ts → loadJsonStrict()` returns a discriminated
result: `{ ok: true, found: true, data }`, `{ ok: true, found: false }`,
or `{ ok: false, error }`. The old `loadJson(key, fallback)` couldn't
tell "DB down" from "row missing", which is what enabled the wipe.

### Layer 2 — Safe hydrate

`hydrate()` and `reload()` only seed + save when the row is
**confirmed missing**. A DB error leaves the in-memory ref untouched
and does NOT mark the store as hydrated, so the next request retries
instead of operating on a phantom view.

### Layer 3 — Strict drain on critical writes

These routes now call `awaitAllFlushesStrict()` and return **503**
to the user if the Postgres write fails:

- `/api/auth/register` — patient web signup
- `/api/auth/mobile-register` — patient mobile signup
- `/api/auth/verify` — email-link verification
- `/api/auth/mobile-verify` — mobile OTP verification
- `/api/withdrawals` — doctor payout request

Before this change, the non-strict variant silently succeeded even
when Postgres rejected the write. Now the user sees a clear "service
temporarily unavailable, please retry" and can re-submit — no phantom
accounts.

### Layer 4 — Read-back verification

After every critical write that returns a user-facing success token,
the route reloads from Postgres and re-fetches the just-written row.
If the row isn't there, return 503. This catches the case where
strict-drain succeeded but the row was somehow missing afterward
(e.g. concurrent write conflict).

Currently applied to:
- `/api/auth/register`
- `/api/auth/mobile-register`

### Layer 5 — Integrity-check cron

`/api/cron/integrity-check` runs every hour. It pulls a small set of
canary signals directly from Postgres:

- Does `users` have at least 1 row?
- Does `admin@odudoc.com` exist?
- Can we read `organizations`, `memberships`, `doctors` keys?

If any canary fails, it:
1. Logs a structured `integrity_check.alert` event
2. Adds a row to `/admin/audit-log` and the admin notifications panel
3. Emails `SUPER_ADMIN_EMAIL` (or `admin@odudoc.com` fallback)

Scheduled in `vercel.json` to run at `0 * * * *` (every hour on the hour).

## What this DOES NOT cover (and you must address externally)

### A. Postgres point-in-time recovery / backups

**This is the most important thing on your todo list.**

If the database itself is corrupted, deleted, or held ransom, the
application code cannot save you. You need provider-level backups.

**Action items by provider:**

| Provider | What to enable |
|---|---|
| **Neon** | Settings → Backups → enable point-in-time recovery. Free tier gets 24h; Pro gets 7-30 days |
| **Supabase** | Settings → Database → Backups. Free tier has daily backups for 7 days; Pro has point-in-time recovery |
| **Vercel Postgres** | Settings → Storage → Backups. Auto-enabled on paid plans |
| **Self-hosted** | Cron `pg_dump` + push to S3/B2 daily, retain 30 days |

Verify by:
1. Open the provider dashboard
2. Find the Backups / PITR section
3. Confirm there's a recent backup or recovery point
4. **Test a restore once** before you need it — providers' "automatic
   backup" claims have failed restorations more times than people realise

### B. Multi-region replication

OduDoc currently runs in a single Vercel region (`bom1`). If that
region goes dark, the app is down. A regional outage on the database
side is unrecoverable without replication.

Not urgent at current scale — Vercel's `bom1` has very high uptime —
but plan for it when you have real revenue at stake.

### C. Application bugs that bypass these defences

Every layer above protects against the documented failure modes. A
new mutation route added after this doc could skip the strict drain
and reintroduce data loss. **Pattern for all new write routes:**

```ts
// 1. Do the mutation
const record = createX(...);

// 2. Strict drain
try {
  await awaitAllFlushesStrict();
} catch (err) {
  log.error("x.persist_failed", err);
  return NextResponse.json(
    { error: "server_busy" },
    { status: 503 }
  );
}

// 3. Read-back verification (for high-value writes)
await reloadX();
if (!findX(record.id)) {
  log.error("x.readback_missing", undefined, { id: record.id });
  return NextResponse.json(
    { error: "server_busy" },
    { status: 503 }
  );
}

// 4. Return success
return NextResponse.json({ x: record }, { status: 201 });
```

Code review every new mutating route for this pattern. If you skip it,
you reintroduce the risk this document was written to prevent.

### D. Concurrent mutation races

`bindPersistentArray` uses optimistic concurrency: writes are
last-write-wins per key. If two Lambdas mutate the same key at the
same time, one update can clobber the other. `mergingSave()`
partially mitigates this by re-reading and merging missing-by-id
items, but it's not a full CRDT.

For high-contention writes (counters, simultaneous bookings), use a
real database with row-level locks instead of the persistent-array
abstraction. Drizzle is already wired in `lib/drizzle/`.

## Monitoring you should set up

### 1. Vercel function logs alert

In Vercel project settings → Integrations → enable a log drain to
something that can alert on patterns. Watch for:
- `persistent_array.load_failed`
- `persistent_array.save_failed`
- `*.persist_failed`
- `*.readback_missing`
- `integrity_check.alert`

Any of these mean a real-user request hit a problem.

### 2. Email forwarding for integrity-check alerts

Set `SUPER_ADMIN_EMAIL` env var in Vercel to the address that should
get the hourly integrity-check alerts. Forward `admin@odudoc.com` to
your real email if that's the address being used.

### 3. Manual canary test

Run this curl daily for the first week after this fix lands:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://www.odudoc.com/api/cron/integrity-check
```

Expect `{ "alerts": 0, ... }`. If `alerts > 0`, investigate immediately.

## How recovery works if data IS lost

Despite all these layers, if data does go missing:

1. **Check Vercel logs** for `persistent_array.*` errors around the
   time of the loss — gives you the exact key + error.
2. **Postgres-side restore** — use point-in-time recovery to a moment
   just before the loss. This is destructive of any data added since,
   so prefer to export-restore-merge if real activity continued.
3. **Inform affected users** — they may need to re-sign-up or
   re-submit. Be honest about what happened; don't hide silently.
4. **File an audit-log entry** describing the incident.

## Bottom line

The code now has multiple layers preventing single-failure data loss.
The next failure mode is harder to hit (would require both strict
drain AND read-back AND integrity-check to all fail simultaneously).

But: code can't replace provider-level backups. **Today, please:**

- [ ] Open your Postgres provider dashboard
- [ ] Confirm point-in-time recovery or daily backups are enabled
- [ ] Note the retention window
- [ ] Run one test restore (to a staging DB) so you know the
      restoration process actually works before you need it
- [ ] Set `SUPER_ADMIN_EMAIL` env var in Vercel
- [ ] Set `CRON_SECRET` env var so the integrity-check cron is gated
