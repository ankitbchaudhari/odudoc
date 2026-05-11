# OduDoc Notifications — Setup Guide

This is the end-to-end checklist for wiring SMS, WhatsApp, Voice, and Email
delivery on www.odudoc.com. After completing this once, every transactional
flow (OTPs, appointment confirms, Rx-ready pings, vital alerts) goes out
automatically.

---

## What you need

| Provider | Used for | Free tier? |
|---|---|---|
| **Twilio** | SMS, WhatsApp, Voice (AI phone calls) | Trial credit on signup |
| **Resend** | Transactional email | 3,000/mo free |

Both already have packages installed (`twilio`, `resend`) and the OduDoc-side
wrappers are written. You just need to paste credentials into Vercel.

---

## Step 1 — Twilio dashboard (in the tab you have open)

### 1a. Account credentials

1. Twilio Console home → **Account info** (top right)
2. Copy **Account SID** (starts with `AC...`)
3. Copy **Auth Token** (click "View" to reveal)

### 1b. Buy an SMS-capable phone number

1. Phone Numbers → **Buy a number**
2. Filter capabilities: ✅ SMS, ✅ Voice (for AI phone calls in Spec §16)
3. Pick a number, click **Buy**
4. Copy the E.164 number, e.g. `+15551234567`

### 1c. WhatsApp sender — pick one

**Option A: Sandbox (instant, testing only)**
- Messaging → **Try it Out** → **Send a WhatsApp message**
- Note the sandbox number (default `+14155238886`)
- To receive: send `join <your-keyword>` from your phone to that number
- Use `whatsapp:+14155238886` as `TWILIO_WHATSAPP_FROM`

**Option B: Business sender (production, ~2–7 day Meta review)**
- Messaging → Senders → **WhatsApp senders** → **Create new sender**
- Submit your business info, display name, sample templates
- After Meta approval, use `whatsapp:+<your-approved-number>` as `TWILIO_WHATSAPP_FROM`

### 1d. Webhook URLs — paste these back into Twilio

Once code is deployed (it already is), open each number's settings in Twilio
and paste:

| Capability | Webhook URL | Method |
|---|---|---|
| Incoming SMS | `https://www.odudoc.com/api/whatsapp/webhook` | POST |
| Incoming WhatsApp | `https://www.odudoc.com/api/whatsapp/webhook` | POST |
| Voice incoming | `https://www.odudoc.com/api/voice-bot/twilio/voice` | POST |
| Voice status | `https://www.odudoc.com/api/voice-bot/twilio/status` | POST |
| Message status callback (global) | `https://www.odudoc.com/api/webhooks/twilio/status` | POST |
| Booking-bot WhatsApp | `https://www.odudoc.com/api/booking-bot/twilio-whatsapp` | POST |

> **Signature verification** is on (`lib/twilio-signature.ts`) — Twilio's
> request signing must match using `TWILIO_AUTH_TOKEN`, so don't strip the
> `X-Twilio-Signature` header at a CDN.

---

## Step 2 — Resend dashboard

1. Sign up at https://resend.com (free)
2. Add domain `odudoc.com` → copy the DNS records → paste into your DNS
3. Wait for verification (usually < 5 min)
4. Verify these mailboxes exist on your domain (cPanel):
   - `no-reply@odudoc.com` — OTPs, password resets
   - `notifications@odudoc.com` — appointments, reminders
   - `admin@odudoc.com` — withdrawal decisions, system alerts
   - `career@odudoc.com` — career application replies
   - `promotion@odudoc.com` — marketing
5. API Keys → **Create API Key** → copy the `re_...` token

---

## Step 3 — Paste into Vercel

Project → Settings → **Environment Variables** → add each, scope **Production**:

```ini
# Twilio (SMS + WhatsApp + Voice)
TWILIO_ACCOUNT_SID=AC........................
TWILIO_AUTH_TOKEN=........................
TWILIO_FROM_NUMBER=+15551234567
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_VOICE_FROM=+15551234567               # optional, defaults to TWILIO_FROM_NUMBER

# Resend (email)
RESEND_API_KEY=re_........................
```

Click **Save**, then **Redeploy** the latest deployment so the new vars take
effect.

---

## Step 4 — Verify in the admin panel

After redeploy, visit `https://www.odudoc.com/admin/notifications/test`:

- Top section shows three pills (SMS / WhatsApp / Email) — each should be 🟢 **Configured**
- Pick a channel, enter your own phone/email, hit **Send test**
- Result block shows the provider message ID (Twilio SID for SMS/WA, Resend ID for email)
- If 🟡 **Skipped — provider not configured** → env var missing
- If ❌ **Failed** → response body shows the error from Twilio/Resend (auth, bad number, etc.)

---

## Where it's used in the codebase

Anything in the platform calling these wrappers will now actually send:

| Surface | Module | Notes |
|---|---|---|
| Patient OTP login | `lib/consult-otp.ts`, `lib/mobile-otp-store.ts` | SMS preferred, WA fallback |
| Doctor invite | `lib/doctor-invites-store.ts` → `sendDoctorInvitationEmail` | Email |
| Appointment confirm | `lib/email.sendAppointmentConfirmation` + WA dispatcher | Both channels |
| Withdrawal decisions | `sendWithdrawalStatusEmail` | Email |
| Career flow | `sendCareerApplicationReceived`, `sendCareerStatusUpdateEmail` | Email |
| WhatsApp booking bot | `lib/booking-bot/` → inbound webhook → store reply | WA |
| Vital alerts (Spec §7.2) | `lib/notifications/notify.ts` — call from alert engine | SMS + WA + push |

For new code, prefer the unified dispatcher:

```ts
import { notify, notifyWithFallback } from "@/lib/notifications/notify";

// One-shot
await notify({ channel: "sms", to: "+15551234567", body: "Your OTP is 123456" });

// Fallback chain — first configured channel wins
await notifyWithFallback(["whatsapp", "sms", "email"], {
  to: phone,
  subject: "Lab result ready",     // ignored for sms/wa
  body: "Your lab result is ready in OduDoc.",
});
```

---

## Cost guardrails

- **Per-message cost** is charged to the org's wallet (Spec §21). Make sure
  every send-call site routes through `lib/ai-metering/` so the bill lands
  on the right tenant.
- Set Twilio **monthly spend cap** in console → Account → Billing → Usage
  triggers. Recommended initial cap: $50/mo until you measure real volume.
- Resend free tier (3,000/mo) covers low traffic. Upgrade when you cross.

---

## Quick troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Test send shows "Skipped" | Env var missing | Check Vercel → redeploy |
| SMS sent but never delivered | Twilio number not SMS-capable, or recipient country blocked | Twilio → Geo Permissions, enable target country |
| WhatsApp test fails with code 63016 | Recipient hasn't opted in to sandbox | Send `join <keyword>` first |
| Email lands in spam | Domain DKIM/SPF not verified | Re-check DNS in Resend |
| Webhook receives nothing | URL wrong in Twilio number config | Paste from §1d above |
| Webhook returns 401 | Signature mismatch | `TWILIO_AUTH_TOKEN` doesn't match the one Twilio is using |
