#!/usr/bin/env bash
# /opt/odudoc-files/retention-cleanup.sh
# Runs daily via cron. Deletes files older than their category retention.
# Logs to /var/www/files/logs/retention.log

set -euo pipefail
LOG=/var/www/files/logs/retention.log
mkdir -p "$(dirname "$LOG")"

ts() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }

{
  echo "[$(ts)] retention sweep start"

  for cat in cvs prescriptions recordings; do
    dir="/var/www/files/$cat"
    if [ ! -d "$dir" ]; then continue; fi

    # 365-day retention for all three categories
    count=$(find "$dir" -type f -mtime +365 | wc -l)
    if [ "$count" -gt 0 ]; then
      echo "[$(ts)] $cat: deleting $count files older than 365 days"
      find "$dir" -type f -mtime +365 -delete
    else
      echo "[$(ts)] $cat: nothing to delete"
    fi
  done

  echo "[$(ts)] retention sweep done"
} >> "$LOG" 2>&1
