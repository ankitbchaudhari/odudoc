# WhatsApp on OduDoc — current state + upgrade path

## What's live now (Phase 1 — click-to-chat)

The /admin/doctor-invites tool generates a `wa.me/<phone>?text=…`
URL when a phone number is attached. Clicking it opens WhatsApp on
**your** device (mobile or desktop web) with the invitation message
pre-filled. **You** click Send — the message goes from your number,
person-to-person.

This is intentionally **not** the WhatsApp Business API. Click-to-chat
has three properties we want:

| Property | Why it matters |
|---|---|
| Zero-cost | No Meta verification, no per-message charge, no minimum spend |
| Zero-config | Works the moment a phone is attached to an invite |
| Zero compliance risk | Messages are personal not promotional under Meta's TOS, because they're sent from your own number, not automated from a server |

It scales reasonably to ~100 sends per week before the manual
clicking becomes annoying.

## What it is *not* good for

- Mass blasting unsolicited cold messages — you'd get banned by
  Meta within days regardless of the channel
- Automated transactional notifications (booking confirmations,
  payment receipts, prescription reminders)
- Two-way conversations parsed by your server
- Webhook-driven flows (incoming message → server reply)

For any of those, you need **Phase 2 — WhatsApp Cloud API**.

## Phase 2 — WhatsApp Cloud API (when to do it)

Add this when:

1. You have **opted-in** users (patients who signed up and gave
   you permission to message them on WhatsApp), and
2. You want **automated** messages — booking confirmation, doctor
   started the consultation, prescription is ready, payment receipt
3. Manual click-to-chat doesn't scale anymore (>100/week)

### What you'll need to do

1. **Create a Meta Business Account** at business.facebook.com
2. **Verify the business** (DUNS / GST / certificate of incorporation
   — Meta is strict about this for India-based applicants)
3. **Add a phone number** dedicated to OduDoc — must not be a
   personal WhatsApp number, must not have been used on regular
   WhatsApp before. Buy a fresh SIM if needed.
4. **Get the number approved** for WhatsApp Business API (~3-5 days)
5. **Submit message templates** for approval — every business-
   initiated message must be a pre-approved template. Meta rejects
   anything that smells promotional unless category is set to
   MARKETING and the wording follows their rules. Templates take
   ~24 hours to review.
6. **Implement the webhook** at `/api/webhooks/whatsapp` that
   receives delivery receipts and incoming replies. Meta sends a
   verification challenge on first connect.
7. **Set up a BSP relationship** (optional but recommended for
   India) — Gupshup, MSG91, AiSensy, WATI. They handle template
   approval queues and INR billing. ₹0.40-0.80 per message vs.
   Meta's USD pricing.

### Architecture sketch (Phase 2)

```
Patient signs up
   │
   ↓ explicitly opts into WhatsApp updates (checkbox at signup)
   │
WhatsApp opt-in flag → users-store
   │
   ↓ later: booking confirmed
   │
/api/webhooks/stripe → markPaid() → schedule WhatsApp send
   │
WhatsApp queue (lib/whatsapp-cloud.ts) → Meta Cloud API
   │ POST graph.facebook.com/v18.0/<phone-number-id>/messages
   │  body: { template: { name: "booking_confirmed", … } }
   ↓
Meta delivers to patient's WhatsApp
   │
   ↓ patient replies
   │
/api/webhooks/whatsapp ← Meta posts the inbound message
   │
   parse → store in conversation log → optional auto-reply
```

### Estimated effort

- Meta verification + template approval: **~2 weeks elapsed** (mostly
  waiting on Meta)
- Cloud API integration code: **~3 days of focused work**
- Production testing + monitoring: **~3 days**

Total **~3 weeks** end-to-end if Meta doesn't ask for additional
documents.

### Costs (real-world)

- Meta Cloud API (direct): first 1,000 conversations / month free,
  then $0.005 per **service** message (you-initiated to opted-in
  user) and ~$0.04 per **marketing** template message
- BSP markup (e.g. AiSensy, Gupshup): adds ~₹0.20-0.40 per message
- Phone number SIM: ~₹500/year recurring
- Optional dedicated WhatsApp Business Verified Badge: $1,000+
  one-time, only worth it for very visible brands

For a typical healthtech platform doing booking confirmations + a
weekly health-tip nudge, expect **₹2,000-5,000/month** at
1,000-5,000 patients.

## What I'd build first (when you decide to do Phase 2)

Mirror the ABDM Phase 1 pattern:

1. `lib/whatsapp-cloud-config-store.ts` — admin-set credentials at
   `/admin/whatsapp` (phone-number-id, access-token, webhook
   verify-token, BSP toggle)
2. `lib/whatsapp-cloud.ts` — single function `sendWhatsappTemplate({
   to, templateName, components })` that calls the Meta API
3. `/api/webhooks/whatsapp` — receives delivery receipts + inbound
   replies
4. Hook into `markPaid()` (consultation booked + paid) to fire a
   booking-confirmation template — first real use case
5. Hook into `attachPrescription()` (consultation completed) to
   fire a "your prescription is ready" template
6. Patient consent toggle on `/profile` — "Send appointment updates
   on WhatsApp"

When you're ready, ask me to ship Phase 2. Until then, the
click-to-chat flow that just shipped is the right tool.

— Last updated: 2026-04-29
