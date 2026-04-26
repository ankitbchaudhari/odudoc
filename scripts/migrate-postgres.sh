#!/usr/bin/env bash
#
# Migrate the OduDoc Postgres database from one host (e.g. self-hosted
# on Hostinger VPS) to a managed provider with point-in-time recovery
# (Neon / Supabase / Render).
#
# What this script does:
#   1. Dumps the source DB to a local timestamped .sql file using
#      pg_dump's custom format (-Fc) — fastest restore + selective
#      table support if needed.
#   2. Restores into the destination using pg_restore.
#   3. Runs a post-flight comparison: row counts of the most write-
#      heavy tables side-by-side so you can eyeball drift before
#      flipping DATABASE_URL in Vercel.
#
# What this script DOES NOT do:
#   - Run application migrations on the new DB. Run `npm run db:migrate`
#     after the restore lands so the schema includes everything that
#     hasn't yet been baked into the source DB.
#   - Flip DATABASE_URL in Vercel. That's a one-liner in their UI; no
#     reason to script away the safety check of a human eyeing it.
#   - Provide cutover messaging. Put up a maintenance banner from the
#     /admin/settings UI before running this so writes don't race.
#
# Usage:
#   1. Set SOURCE_DSN and DEST_DSN below or export them.
#   2. Run from the repo root: `bash scripts/migrate-postgres.sh`
#   3. After the post-flight check, in Vercel:
#        - Update DATABASE_URL + DATABASE_URL_DIRECT to DEST_DSN
#        - Trigger a redeploy
#        - Watch /api/health for the new env to confirm DB.ok
#   4. Keep the source DB running for 24-48h as a rollback; then tear
#      it down once you've validated.

set -euo pipefail

# ---- Configure these (or export from your shell) -----------------------
SOURCE_DSN="${SOURCE_DSN:-}"
DEST_DSN="${DEST_DSN:-}"

if [[ -z "$SOURCE_DSN" || -z "$DEST_DSN" ]]; then
  echo "Set SOURCE_DSN and DEST_DSN before running."
  echo "  export SOURCE_DSN=postgres://user:pass@old-host:5432/odudoc"
  echo "  export DEST_DSN=postgres://user:pass@ep-xxx.aws.neon.tech/odudoc"
  exit 1
fi

ts=$(date -u +%Y%m%d-%H%M%S)
dump_file="odudoc-dump-${ts}.dump"

echo "==> Dumping from source ($ts)"
pg_dump \
  --format=custom \
  --no-owner \
  --no-privileges \
  --verbose \
  --file="$dump_file" \
  "$SOURCE_DSN"

dump_size=$(du -h "$dump_file" | cut -f1)
echo "==> Dump complete: $dump_file ($dump_size)"

echo "==> Restoring into destination"
pg_restore \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --verbose \
  --dbname="$DEST_DSN" \
  "$dump_file"

echo "==> Restore complete"

echo "==> Post-flight row-count comparison"
tables=("users" "doctors" "vendors" "products" "orders" "order_items" "withdrawals" "bookings" "payments" "blog_posts" "app_kv")
printf "%-20s %-12s %-12s %-10s\n" "TABLE" "SOURCE" "DEST" "DRIFT"
printf "%-20s %-12s %-12s %-10s\n" "-----" "------" "----" "-----"
for t in "${tables[@]}"; do
  src_count=$(psql "$SOURCE_DSN" -At -c "SELECT count(*) FROM \"$t\"" 2>/dev/null || echo "n/a")
  dst_count=$(psql "$DEST_DSN" -At -c "SELECT count(*) FROM \"$t\"" 2>/dev/null || echo "n/a")
  if [[ "$src_count" == "n/a" || "$dst_count" == "n/a" ]]; then
    drift="—"
  else
    drift=$((dst_count - src_count))
  fi
  printf "%-20s %-12s %-12s %-10s\n" "$t" "$src_count" "$dst_count" "$drift"
done

echo ""
echo "==> Done. If DRIFT looks correct (zero or matches expected new"
echo "    rows during the run), update DATABASE_URL in Vercel."
echo ""
echo "    Keep $dump_file for 7+ days as a rollback artifact."
