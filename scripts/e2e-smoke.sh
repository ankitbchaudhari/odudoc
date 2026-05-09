#!/usr/bin/env bash
# End-to-end smoke test — exercises mutating endpoints with a real
# session cookie and verifies the writes persisted.
#
# Why this exists: the unauthenticated smoke test (curl public URLs)
# only proves routes are alive. It can't catch the "flush race" /
# "merging-save resurrects deleted rows" / "orphan reconciler revives
# the doctor" classes of bugs. This script logs in as a real session,
# creates test data, verifies it survives a reload, then cleans up.
#
# Usage:
#   1. Sign in to https://www.odudoc.com in your browser as super-admin.
#   2. Open DevTools → Application → Cookies → copy the value of
#      `next-auth.session-token` (or `__Secure-next-auth.session-token`
#      on https domains).
#   3. Export it:
#        export ODUDOC_SESSION="paste-the-long-value-here"
#   4. Run:
#        bash scripts/e2e-smoke.sh
#
# Optional:
#   ODUDOC_BASE   — defaults to https://www.odudoc.com
#   VERBOSE=1     — show response bodies on every step
#   KEEP=1        — skip cleanup so you can inspect created rows

set -uo pipefail

BASE="${ODUDOC_BASE:-https://www.odudoc.com}"
COOKIE="${ODUDOC_SESSION:-}"
VERBOSE="${VERBOSE:-0}"
KEEP="${KEEP:-0}"

if [ -z "$COOKIE" ]; then
  echo "ERROR: set ODUDOC_SESSION to your next-auth session token."
  echo "Steps:"
  echo "  1. Sign in to $BASE in your browser as super-admin"
  echo "  2. DevTools → Application → Cookies → copy"
  echo "     '__Secure-next-auth.session-token' (or 'next-auth.session-token' on http)"
  echo "  3. export ODUDOC_SESSION='paste-here'"
  echo "  4. bash scripts/e2e-smoke.sh"
  exit 2
fi

# Try both cookie names — the production deploy uses the Secure variant.
COOKIE_HEADER="Cookie: __Secure-next-auth.session-token=$COOKIE; next-auth.session-token=$COOKIE"

PASS=0
FAIL=0
declare -a FAILURES=()

# ─────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────

# req <method> <path> [body-json]
# Sets globals: HTTP, BODY (response body)
req() {
  local method="$1"
  local path="$2"
  local body="${3:-}"
  local tmp; tmp=$(mktemp)
  local args=(-s -o "$tmp" -w "%{http_code}" --max-time 20 -X "$method"
              -H "$COOKIE_HEADER")
  if [ -n "$body" ]; then
    args+=(-H "Content-Type: application/json" --data-raw "$body")
  fi
  HTTP=$(curl "${args[@]}" "$BASE$path")
  BODY=$(cat "$tmp")
  rm -f "$tmp"
  if [ "$VERBOSE" = "1" ]; then
    echo "  → $method $path → $HTTP"
    echo "    body: ${BODY:0:300}"
  fi
}

# Pull a JSON field with a brittle but no-deps grep. Sufficient for
# the simple shapes our APIs return.
json_get() {
  local key="$1"
  local body="${2:-$BODY}"
  echo "$body" | grep -oE "\"$key\"\\s*:\\s*(\"[^\"]*\"|[0-9]+|true|false|null)" \
    | head -1 \
    | sed -E 's/.*: ?"?([^"]*)"?$/\1/'
}

ok() {
  PASS=$((PASS+1))
  printf "  \033[32m✓\033[0m %s\n" "$1"
}
fail() {
  FAIL=$((FAIL+1))
  FAILURES+=("$1")
  printf "  \033[31m✗\033[0m %s\n" "$1"
  if [ "$VERBOSE" = "1" ]; then
    echo "      HTTP=$HTTP"
    echo "      body=${BODY:0:400}"
  fi
}

heading() {
  printf "\n\033[1;36m▌\033[0m \033[1m%s\033[0m\n" "$1"
}

# ─────────────────────────────────────────────────────────────────
# 1. Session sanity — confirm the cookie is valid + super-admin
# ─────────────────────────────────────────────────────────────────

heading "1. Session sanity"

req GET "/api/auth/session"
if [ "$HTTP" = "200" ]; then
  email=$(json_get email)
  role=$(json_get role)
  if [ -n "$email" ]; then
    ok "Authenticated as $email (role=$role)"
  else
    fail "Session returned 200 but no email — cookie probably expired"
    echo "Cannot continue without a valid session. Re-export ODUDOC_SESSION."
    exit 1
  fi
else
  fail "/api/auth/session returned $HTTP — cookie invalid"
  exit 1
fi

# ─────────────────────────────────────────────────────────────────
# 2. Public read APIs — should be 200 with this cookie too
# ─────────────────────────────────────────────────────────────────

heading "2. Public read APIs"

req GET "/api/doctors"
[ "$HTTP" = "200" ] && ok "GET /api/doctors → 200" || fail "GET /api/doctors → $HTTP"

req GET "/api/public/departments"
[ "$HTTP" = "200" ] && ok "GET /api/public/departments → 200" || fail "GET /api/public/departments → $HTTP"

# ─────────────────────────────────────────────────────────────────
# 3. Doctor self-read (only works if the session is a doctor)
# ─────────────────────────────────────────────────────────────────

heading "3. Doctor self-read"

req GET "/api/doctors/me"
case "$HTTP" in
  200) ok "Session is a doctor — /api/doctors/me → 200" ;;
  401|403) ok "Session isn't a doctor (HTTP $HTTP) — expected for super-admin" ;;
  *)   fail "/api/doctors/me returned $HTTP" ;;
esac

# ─────────────────────────────────────────────────────────────────
# 4. Organizations CRUD durability test
#    (the bug we just fixed — create / delete / verify it stays gone)
# ─────────────────────────────────────────────────────────────────

heading "4. Organizations CRUD durability"

req GET "/api/organizations"
if [ "$HTTP" = "403" ]; then
  ok "Skipping org tests — session is not super-admin (got 403)"
elif [ "$HTTP" = "200" ]; then
  TEST_ORG_NAME="e2e-smoke-$(date +%s)"
  req POST "/api/organizations" \
    "{\"name\":\"$TEST_ORG_NAME\",\"contactEmail\":\"e2e+$(date +%s)@odudoc.example\",\"plan\":\"trial\"}"
  if [ "$HTTP" = "200" ] || [ "$HTTP" = "201" ]; then
    ORG_ID=$(json_get id)
    if [ -n "$ORG_ID" ]; then
      ok "Created org id=$ORG_ID"

      req GET "/api/organizations"
      if echo "$BODY" | grep -q "$ORG_ID"; then
        ok "GET sees the new org"
      else
        fail "GET doesn't see the new org we just created"
      fi

      req DELETE "/api/organizations" "{\"id\":\"$ORG_ID\"}"
      if [ "$HTTP" = "200" ]; then
        ok "DELETE returned 200"

        req GET "/api/organizations"
        if echo "$BODY" | grep -q "$ORG_ID"; then
          fail "Org still appears after delete (durability bug — flush/tombstone broken)"
        else
          ok "Org is gone — durability holds (tombstone + reload working)"
        fi
      else
        fail "DELETE returned $HTTP"
      fi
    else
      fail "POST succeeded ($HTTP) but no id in response: ${BODY:0:200}"
    fi
  else
    fail "POST /api/organizations returned $HTTP"
  fi
else
  fail "GET /api/organizations returned $HTTP"
fi

# ─────────────────────────────────────────────────────────────────
# 5. Inventory persistence (works for any clinic-owning role)
# ─────────────────────────────────────────────────────────────────

heading "5. Inventory CRUD durability"

req GET "/api/emr/inventory"
if [ "$HTTP" = "403" ] || [ "$HTTP" = "401" ]; then
  ok "Skipping inventory — session has no clinic affiliation (HTTP $HTTP)"
elif [ "$HTTP" = "200" ]; then
  SKU="E2E-$(date +%s)"
  req POST "/api/emr/inventory" \
    "{\"scope\":\"general\",\"sku\":\"$SKU\",\"name\":\"Smoke test SKU\",\"qty\":10}"
  if [ "$HTTP" = "200" ] || [ "$HTTP" = "201" ]; then
    INV_ID=$(json_get id)
    if [ -n "$INV_ID" ]; then
      ok "Created inventory item id=$INV_ID"

      req PATCH "/api/emr/inventory/$INV_ID" '{"adjustQty":-3}'
      if [ "$HTTP" = "200" ]; then
        new_qty=$(json_get qty)
        [ "$new_qty" = "7" ] && ok "Stock adjustment landed (qty=$new_qty)" || fail "qty after -3 should be 7, got $new_qty"
      else
        fail "PATCH adjust returned $HTTP"
      fi

      if [ "$KEEP" != "1" ]; then
        req DELETE "/api/emr/inventory/$INV_ID"
        if [ "$HTTP" = "200" ]; then
          req GET "/api/emr/inventory"
          if echo "$BODY" | grep -q "$INV_ID"; then
            fail "Inventory item reappears after delete"
          else
            ok "Inventory item stays deleted"
          fi
        else
          fail "DELETE inventory returned $HTTP"
        fi
      fi
    else
      fail "POST inventory succeeded but no id"
    fi
  else
    fail "POST /api/emr/inventory returned $HTTP"
  fi
else
  fail "GET /api/emr/inventory returned $HTTP"
fi

# ─────────────────────────────────────────────────────────────────
# 6. Waste log durability
# ─────────────────────────────────────────────────────────────────

heading "6. Biomedical waste log"

req GET "/api/emr/waste"
if [ "$HTTP" = "403" ] || [ "$HTTP" = "401" ]; then
  ok "Skipping waste — no clinic affiliation"
elif [ "$HTTP" = "200" ]; then
  req POST "/api/emr/waste" \
    '{"category":"yellow","sourceDept":"e2e-smoke","weightGrams":250,"bagCount":1,"notes":"test"}'
  if [ "$HTTP" = "201" ] || [ "$HTTP" = "200" ]; then
    ENTRY_ID=$(json_get id)
    [ -n "$ENTRY_ID" ] && ok "Logged waste entry $ENTRY_ID" || fail "POST waste no id in response"
  else
    fail "POST /api/emr/waste returned $HTTP"
  fi
else
  fail "GET /api/emr/waste returned $HTTP"
fi

# ─────────────────────────────────────────────────────────────────
# 7. Admissions queue
# ─────────────────────────────────────────────────────────────────

heading "7. Reception admissions"

req GET "/api/emr/admissions?today=1"
if [ "$HTTP" = "403" ] || [ "$HTTP" = "401" ]; then
  ok "Skipping admissions — no clinic affiliation"
elif [ "$HTTP" = "200" ]; then
  ok "GET admissions returns 200 with counts"
  req POST "/api/emr/admissions" \
    '{"patientId":"e2e-pt","patientName":"E2E Patient","department":"OPD","triage":"green"}'
  if [ "$HTTP" = "201" ] || [ "$HTTP" = "200" ]; then
    ADM_ID=$(json_get id)
    if [ -n "$ADM_ID" ]; then
      ok "Created admission $ADM_ID"
      req PATCH "/api/emr/admissions/$ADM_ID" '{"status":"checked_in"}'
      [ "$HTTP" = "200" ] && ok "Check-in patch landed" || fail "Check-in patch → $HTTP"
      if [ "$KEEP" != "1" ]; then
        req PATCH "/api/emr/admissions/$ADM_ID" '{"status":"cancelled"}'
        [ "$HTTP" = "200" ] && ok "Cancel patch landed" || fail "Cancel patch → $HTTP"
      fi
    fi
  else
    fail "POST admission → $HTTP"
  fi
else
  fail "GET admissions → $HTTP"
fi

# ─────────────────────────────────────────────────────────────────
# 8. AI feedback ingestion + admin stats
# ─────────────────────────────────────────────────────────────────

heading "8. AI feedback signals"

req POST "/api/ai/feedback" \
  '{"surface":"other","suggestion":"e2e-smoke","verdict":"accepted","note":"automated test"}'
[ "$HTTP" = "200" ] && ok "Feedback recorded" || fail "POST /api/ai/feedback → $HTTP"

req GET "/api/ai/feedback"
if [ "$HTTP" = "200" ]; then
  total=$(json_get total)
  ok "Admin feedback stats reachable (total=$total)"
elif [ "$HTTP" = "403" ]; then
  ok "Admin stats gate working (403 for non-admin)"
else
  fail "GET /api/ai/feedback → $HTTP"
fi

# ─────────────────────────────────────────────────────────────────
# 9. Tenant context + org switcher
# ─────────────────────────────────────────────────────────────────

heading "9. Tenant context"

req GET "/api/tenant/context"
[ "$HTTP" = "200" ] && ok "Tenant context loaded" || fail "Tenant context → $HTTP"

# ─────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────

echo
echo "─────────────────────────────────────────────────────"
TOTAL=$((PASS+FAIL))
if [ "$FAIL" -eq 0 ]; then
  printf "  \033[1;32mAll %d checks passed.\033[0m\n" "$TOTAL"
  exit 0
else
  printf "  \033[1;31m%d / %d failed.\033[0m\n\n" "$FAIL" "$TOTAL"
  echo "Failed steps:"
  for f in "${FAILURES[@]}"; do echo "  - $f"; done
  exit 1
fi
