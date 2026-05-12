# Notification Audit — Patient Signup → Booking flow

Audit done after wiring the production notification stack (Twilio + Resend).
Findings, what shipped in this commit, and what's left as follow-up.

---

## Path traced

1. **POST `/api/auth/mobile-register`** — patient creates account
2. **POST `/api/auth/mobile-verify`** — confirms 6-digit OTP, returns JWT
3. **POST `/api/bookings/mobile`** — creates first appointment
4. **Cron `/api/cron/appointment-reminders`** — 24h-out reminder
5. **PATCH `/api/hospital/lab-orders` with results** — lab completion
6. **PATCH `/api/withdrawals/:id`** — doctor payout decision

---

## Shipped in this commit

### ✅ Mobile OTP send now fans out (SMS + email)

Files: `app/api/auth/mobile-register/route.ts`, `app/api/auth/mobile-resend-code/route.ts`

Previously email-only. Mobile users on flaky data plans frequently miss
emails; SMS is the more reliable channel for OTP. Both now fire in parallel
via `Promise.allSettled` so one channel's failure doesn't kill the other.

### ✅ Appointment notifications no longer dropped on the floor

File: `lib/notifications.ts`

`sendNotification()` was a memory-only logger labelled
`"in production, integrate with SendGrid/Twilio"`. Every appointment
confirmation, cancellation, and reschedule notification from
`notifyAppointmentBooked()` / `notifyAppointmentCancelled()` was silently
discarded. Now routes through `lib/notifications/notify` so email goes via
Resend and SMS via Twilio.

### ✅ Withdrawal decisions add SMS path

File: `app/api/withdrawals/[id]/route.ts`

Email-only → email + SMS. Doctors typically check phones faster than
inboxes for money decisions. Looks up the doctor's phone via
`findUserByEmail` and fires both channels in parallel.

### ✅ Lab result ready notification

File: `app/api/hospital/lab-orders/route.ts`

When `setLabResults()` transitions an order to `completed`, the API now
notifies the patient on SMS + email with a deep link to
`/dashboard/labs`. Spec §6.3 "🟢 Normal result — report ready" event.

---

## Found but NOT fixed this session — follow-ups

### ⚠️ Appointment reminders cron is email-only

File: `app/api/cron/appointment-reminders/route.ts`

Sends email + FCM push but no SMS or WhatsApp. Patients without the
mobile app and with cluttered email get no reminder. Should fan out to
SMS for any consultation with a `patientPhone`.

**Effort to fix:** 30 minutes. Same pattern as the lab-result wiring above.

### ⚠️ Web /api/auth/otp/send route is disabled entirely

File: `app/api/auth/otp/send/route.ts`

```
// TEMPORARY: SMS + email 2FA verification is disabled. All authenticated
// users skip the OTP step and sign in directly.
```

Web login currently has **no second factor**. Product decision, not a bug.
Re-enable when you decide to enforce 2FA — the underlying `createOtp` and
`sendOtpCodes` infrastructure is still in `lib/otp-store.ts`.

### ⚠️ No welcome email on first verification

File: `app/api/auth/mobile-verify/route.ts`

After a new patient verifies their OTP and gets their JWT, no welcome
email fires. `lib/email.ts` has `sendWelcomeEmail()` defined but it's
not called anywhere in the mobile flow. Low priority — primary onboarding
happens in-app.

### ⚠️ `lib/email.ts` has orphan helpers

`sendAppointmentConfirmation`, `sendOrderConfirmationEmail`, several
others — defined but never imported by any route. Either delete or wire
into the matching API routes. Suggest delete since the new dispatcher
path is `notify()` and these duplicate that work.

### ⚠️ Lab order `labName` field missing

The lab order schema doesn't carry the lab's display name — only patient
and items. Hardcoded "OduDoc Lab" in the notification for v1. Add
`labName` to `LabOrder` and fill it from the active organization name
when creating the order.

### ⚠️ Patient notifications use full phone but no opt-out gate

`notify({ channel: "sms" })` doesn't currently check
`preferences-store`. Patients can opt-out of marketing via
`/dashboard/notifications/preferences` but operational categories
(`result`, `appointment`, `billing`) ignore the prefs. For v1 this is
correct (life-safety overrides), but if you want to honor opt-outs for
non-critical categories, route through `notifyUser()` instead of
`notify()`.

---

## Manual test checklist (after Vercel redeploys)

Run these one-by-one. ✅ each that succeeds. Anything failing → paste me
the error.

### Test 1 — Mobile signup OTP fans out
- [ ] Open `https://www.odudoc.com` from a mobile browser
- [ ] Sign up with a fresh email + your real phone
- [ ] Check email inbox → "Your OduDoc verification code" arrives
- [ ] Check phone SMS → "XXXXXX is your OduDoc verification code"
- [ ] Both codes are the same 6 digits

### Test 2 — Appointment confirmation reaches you
- [ ] After verification, book any doctor / any slot
- [ ] Check email inbox → appointment confirmation
- [ ] Check phone SMS → "OduDoc: Appointment confirmed..."
- [ ] Both arrive within 30 seconds

### Test 3 — Lab result ready
- [ ] Sign in to admin as a hospital-org user
- [ ] Open `/admin/lab-orders` → create a test order for yourself
- [ ] Fill in result values for every item
- [ ] Order auto-transitions to "completed"
- [ ] Check email + SMS → "your lab results from OduDoc Lab are ready"

### Test 4 — Withdrawal status
- [ ] As a doctor, request a withdrawal in `/dashboard/withdrawals`
- [ ] Sign in as super-admin → `/admin/withdrawals`
- [ ] Approve the withdrawal
- [ ] Doctor's email + SMS fire

### Test 5 — Channel preferences respected (next-stage when notifyUser used)
- [ ] Sign in as patient → `/dashboard/notifications/preferences`
- [ ] Drag WhatsApp to top
- [ ] Toggle "Marketing" off
- [ ] Send admin broadcast / test marketing → does not arrive
- [ ] Send OTP → arrives anyway (override)

---

## Status — production notification surfaces

| Surface | Status |
|---|---|
| Patient signup OTP | ✅ Email + SMS (new) |
| Patient signup OTP resend | ✅ Email + SMS (new) |
| Appointment confirmation | ✅ Email + SMS (was dropped before) |
| Appointment cancellation | ✅ Email + SMS (was dropped before) |
| Appointment 24h reminder | ⚠️ Email + FCM only (no SMS) |
| Vital alerts (critical) | ✅ WhatsApp + SMS + Email + push |
| Lab result ready | ✅ Email + SMS (new) |
| Withdrawal status | ✅ Email + SMS (new) |
| Withdrawal request received | ❌ Not implemented |
| Rx ready for pickup | ❌ Not implemented |
| Doctor invite | ✅ Email only (unchanged) |
| Career application | ✅ Email only (unchanged) |
| Voice IVR follow-up | ✅ SMS deep link (built earlier today) |

Marketing + transactional emails: all DKIM-signed via Resend through
verified `odudoc.com` domain. All SMS via Twilio paid account
(no trial restriction). WhatsApp via production sender `+13028992625`
once Meta templates are approved.
