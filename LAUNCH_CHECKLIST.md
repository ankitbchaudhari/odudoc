# OduDoc Launch Checklist

Concrete steps to go from "deployed" to "first paying hospital onboarded."
Estimated total time: 4–8 hours of dashboard work, spread across your calendar.

---

## 0. Prerequisites

- [ ] You have **Owner** access to the Vercel project
- [ ] You control the `odudoc.com` DNS (for domain verification)
- [ ] Decide which Neon branch is production (default: `main`)

---

## 1. Vercel Environment Variables (30 min)

Go to **Vercel → Project → Settings → Environment Variables**. Set all of these
for **Production** (and copy to Preview/Development where sensible).

Reference: `.env.example` in the repo root.

### Required to launch
- [ ] `NEXTAUTH_URL` = `https://www.odudoc.com`
- [ ] `NEXTAUTH_SECRET` = run `openssl rand -base64 32`
- [ ] `DATABASE_URL` = Neon pooled connection string (from Neon dashboard → Connection Details → Pooled)
- [ ] `SUPER_ADMIN_EMAILS` = your email(s), comma-separated
- [ ] `CRON_SECRET` = `openssl rand -hex 32`

### Required for billing
- [ ] `STRIPE_SECRET_KEY` = `sk_live_...` (Stripe → Developers → API keys)
- [ ] `STRIPE_WEBHOOK_SECRET` = `whsec_...` (set after step 3 below)
- [ ] `STRIPE_PRICE_MAP` = `price_xxx:starter,price_yyy:growth,price_zzz:scale` (set after step 3)

### Required for email (Resend)
- [ ] `RESEND_API_KEY` = `re_...`
- [ ] `RESEND_WEBHOOK_SECRET` = `whsec_...` (set after step 4)
- [ ] `RESEND_FROM_NOREPLY` = `no-reply@odudoc.com`
- [ ] `RESEND_FROM_NOTIFICATIONS` = `notifications@odudoc.com`
- [ ] `RESEND_FROM_PROMOTION` = `promotions@odudoc.com`

### Required for SMS/WhatsApp (Twilio)
- [ ] `TWILIO_ACCOUNT_SID` = `AC...`
- [ ] `TWILIO_AUTH_TOKEN` = (Twilio → Console)
- [ ] `TWILIO_MESSAGING_SERVICE_SID` = `MG...`
- [ ] `TWILIO_WHATSAPP_FROM` = `whatsapp:+14155238886` (sandbox) or your approved number
- [ ] `TWILIO_VOICE_FROM` = your Twilio voice-capable number

### Required for rate limiting (Upstash)
- [ ] `UPSTASH_REDIS_REST_URL`
- [ ] `UPSTASH_REDIS_REST_TOKEN`
  (Create free Upstash Redis DB, copy REST URL + token)

### Required for observability (Sentry)
- [ ] `SENTRY_DSN` = `https://...@sentry.io/...`
- [ ] `SENTRY_ENVIRONMENT` = `production`

### Optional (feature flags)
- [ ] `MAINTENANCE_MODE` = `1` to enable tenant kill-switch (leave unset normally)
- [ ] `CSRF_TRUSTED_ORIGINS` = extra origins comma-separated (normally just NEXTAUTH_URL)
- [ ] `BLOB_READ_WRITE_TOKEN` = for file uploads (Vercel Blob)
- [ ] `DAILY_API_KEY`, `DAILY_DOMAIN` = for video consults
- [ ] `ANTHROPIC_API_KEY` = for AI blog generator

After setting: **redeploy** to pick up the new vars (`vercel --prod --yes`).

---

## 2. Neon Database (15 min)

- [ ] Confirm production branch is set to **Auto-suspend: never** (or longer than 5 min)
- [ ] Set a **point-in-time-recovery window** of at least 7 days (Neon → Settings → Branching)
- [ ] **Download a one-time snapshot** after first real tenant signs up (can be automated later)
- [ ] Note: we currently use the `app_kv` JSONB table as the canonical store. A
      proper relational migration is tracked separately (see `scripts/drizzle/`).

---

## 3. Stripe (1 hour)

### 3.1 Create products + prices
Stripe Dashboard → **Products** → **Add product**, one per plan tier:

- [ ] **Starter** — monthly recurring, e.g. ₹4,999/mo — copy price ID `price_...`
- [ ] **Growth** — monthly recurring, e.g. ₹14,999/mo — copy price ID
- [ ] **Scale** — monthly recurring, e.g. ₹49,999/mo — copy price ID

Set `STRIPE_PRICE_MAP` in Vercel:
```
price_aaa:starter,price_bbb:growth,price_ccc:scale
```

### 3.2 Webhook
Stripe Dashboard → **Developers → Webhooks → Add endpoint**:

- [ ] Endpoint URL: `https://www.odudoc.com/api/webhooks/stripe`
- [ ] Events to send:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `checkout.session.completed`
- [ ] Copy the signing secret → set `STRIPE_WEBHOOK_SECRET` in Vercel

### 3.3 Billing portal
- [ ] Stripe Dashboard → **Settings → Billing → Customer portal** → **Activate**
- [ ] Branding: upload OduDoc logo, set colors
- [ ] Redirect URL: `https://www.odudoc.com/hospital/billing`

### 3.4 Tax + invoicing
- [ ] **Settings → Tax** — enable Stripe Tax or configure GST manually
- [ ] **Settings → Invoicing** — upload logo, set footer text

### 3.5 Test
- [ ] Create a test org, go to `/hospital/billing`, subscribe with test card
      `4242 4242 4242 4242`. Verify webhook fires in Stripe dashboard.

---

## 4. Resend (30 min)

### 4.1 Domain
- [ ] Resend Dashboard → **Domains → Add domain** → `odudoc.com`
- [ ] Add the SPF, DKIM, DMARC records to your DNS
- [ ] Wait for verification (usually <10 min)

### 4.2 Webhook
- [ ] Resend → **Webhooks → Add endpoint**
- [ ] URL: `https://www.odudoc.com/api/webhooks/resend`
- [ ] Events: `email.sent`, `email.delivered`, `email.bounced`, `email.complained`, `email.failed`
- [ ] Copy the `whsec_...` → set `RESEND_WEBHOOK_SECRET` in Vercel

### 4.3 Test
- [ ] Trigger any transactional email (password reset, welcome) and verify it
      arrives + shows `delivered` in the hospital Notifications log.

---

## 5. Twilio (45 min)

### 5.1 Messaging service
- [ ] Twilio Console → **Messaging → Services → Create service**
- [ ] Add at least one sender (phone number or Alpha sender for India/UAE)
- [ ] Copy the `MG...` SID → `TWILIO_MESSAGING_SERVICE_SID`

### 5.2 Status callback
- [ ] In the messaging service, **Integration → Status callback URL**:
      `https://www.odudoc.com/api/webhooks/twilio/status`

### 5.3 WhatsApp
- [ ] For production, apply for a WhatsApp Business Profile (takes 1–3 days).
      For pilot, use the Twilio sandbox: each pilot user must join with a code.

### 5.4 Test
- [ ] From the notifications UI, send a test SMS to your phone. Verify delivery
      + the status webhook updates the row to `delivered`.

---

## 6. Upstash Redis (10 min)

- [ ] Upstash Console → **Create Database**
- [ ] Region: closest to your Vercel deployment region
- [ ] Copy **REST URL** + **REST Token** → Vercel env vars

---

## 7. Sentry (15 min)

- [ ] Sentry Console → **Create Project → Next.js**
- [ ] Copy DSN → `SENTRY_DSN` env var
- [ ] Create an alert rule: **New issue in production → email/Slack me**
- [ ] Optional: set up performance monitoring with 5% sample rate

---

## 8. DNS (5 min)

- [ ] `www.odudoc.com` → Vercel (should already be set)
- [ ] Apex `odudoc.com` → redirect to `www`
- [ ] MX records point to your email provider (Google Workspace / Zoho / Fastmail)
- [ ] Add a CAA record limiting cert issuance to your CA (optional hardening)

---

## 9. Smoke Tests (30 min)

Run after all above is done:

- [ ] `node scripts/smoke.mjs` (see that file)
- [ ] Manual: sign up a new organization at `/auth/register`
- [ ] Manual: create a patient, book an appointment, mark as completed
- [ ] Manual: send an SMS, check the notification log for `delivered`
- [ ] Manual: trigger a failed email (invalid address) — should show as `bounced` in the log
- [ ] Manual: go through Stripe checkout with test card, verify org tier flips to `starter`

---

## 10. Pilot launch

- [ ] Pick 1–3 friendly hospitals willing to be reference accounts
- [ ] Offer 60-day free pilot + 50% off first year in exchange for logo + quote
- [ ] Set up a shared Slack/WhatsApp channel with each pilot for bug reports
- [ ] Schedule a weekly 30-min check-in with each pilot admin
- [ ] Track pilot metrics: DAU, feature usage, bug count, NPS

---

## 11. Post-launch (Month 2+)

These were explicitly deferred from the launch cut:

- [ ] **Drizzle migration** — move hot stores (patients, appointments, admissions,
      notifications, billing) off `app_kv` JSONB onto proper tables. Scaffold in
      `scripts/drizzle/`. Plan: dual-write for 2 weeks, then cutover.
- [ ] **Real per-route Zod schemas** — replace `z.any()` safety net with typed
      validation on the 20 hottest routes. Currently 103 routes validated at the
      "not-a-500" level but not at the field-type level.
- [ ] **Real load test** — k6 against top 10 endpoints at 50 RPS
- [ ] **Backup runbook** — documented steps for restoring a tenant from Neon PITR
- [ ] **SOC2-lite controls** — if selling to mid-market. Access audit, MFA enforcement,
      quarterly review attestations.
- [ ] **Vercel Pro upgrade** — for proper cron cadence (`*/15 * * * *`) and longer function timeouts
