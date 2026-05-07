# Doctor guide — video scripts & recording briefs

These are the per-section walkthrough videos referenced from
`/for-doctors/guide` and `/dashboard/doctor/guide`.

## Format

- **Length:** 60–90 seconds each. Hard cap 2 minutes.
- **Aspect ratio:** 16:9, 1080p minimum, 1440p preferred.
- **Voiceover:** Native English (US or neutral) for v1. Hindi + Spanish dubs come later.
- **On-screen:** Real screen-share of the actual product, no Figma mockups. Use a demo doctor account with realistic but not real patient data.
- **Branding:** Closing card with OduDoc logo + URL, 2 seconds.
- **Hosting:** Upload to YouTube as **Unlisted**, then paste the IDs into `lib/doctor-guide-content.ts` → `GUIDE_VIDEO_IDS`.

## Captions & accessibility

- Burn in English captions (sans-serif, white-on-black, lower-third).
- Provide a separate `.vtt` to YouTube for auto-translation.
- Keep cursor large + slow; doctors watching on phones have small screens.

---

## 1. Getting started — `getting-started`

**Hook (0–5s):** "From sign-up to your first patient on OduDoc takes about 30 minutes. Here's the path."

**Body (5–60s):** Screen-share walkthrough:

1. Land on `/dashboard/doctor` after login → highlight verification banner.
2. Open verification panel → drag in mock ID, license, selfie. Show the "we'll review in 48 hours" copy.
3. Jump to `/dashboard/doctor/profile` → fill name, photo, fee, bio.
4. Jump to `/dashboard/doctor/timetable` → tick weekday morning slots.
5. Jump to `/dashboard/doctor/earnings` → click Connect Stripe.

**Close (60–80s):** "Once we approve your verification you'll get an email and your profile goes live."

---

## 2. Your public profile — `profile`

**Hook:** "This is the page patients see before they book you."

**Body:** Open the public `/d/<slug>` profile in one tab and the editor in the other.
- Show the live profile.
- Edit fee in the editor → save → reload public page to show change.
- Add a service → reload → highlight new chip.
- Show the share-on-WhatsApp preview card.

**Close:** "Tip: profiles with a real headshot get 3.4× more bookings."

---

## 3. Availability & instant mode — `availability`

**Hook:** "Patients can reach you two ways on OduDoc."

**Body:**
- Show the timetable editor → drag-select Monday 6 PM–9 PM.
- Switch to dashboard → click "Go available now" → 15-minute timer starts.
- Cut to patient-side view: "Get instant care" → see the doctor available → book.
- Cut back to doctor: incoming consultation toast.

**Close:** "The button auto-expires. You're never accidentally on call overnight."

---

## 4. Consultations & video calls — `consultations`

**Hook:** "Here's what happens when a patient books you."

**Body:** End-to-end happy path:
1. Awaiting-doctor toast → click → consultation detail.
2. Click Approve → show confirmation email preview.
3. At slot time → Join call.
4. Inside the call: live transcript, mute, share screen, pause transcription.
5. End call → write prescription button.

**Close:** "Earnings drop into your balance the same day."

---

## 5. Prescriptions — `prescriptions`

**Hook:** "Three ways to write a prescription."

**Body:** 20s on each:
- **Manual:** type "amox" → autocomplete from drug catalogue → fill dose/frequency/duration.
- **AI:** open AI panel, type "42 F sinusitis no allergies" → AI suggests Rx → edit → sign.
- **Voice:** click mic, dictate, AI structures the form.

**Close:** "Whichever way you write it, the patient gets it by email within seconds with a public verification URL the pharmacy can scan."

---

## 6. AI prescription assistant — `ai-prescription`

**Hook:** "Let the AI draft, you sign."

**Body:**
- Open AI Rx page.
- Type a one-line case summary + meds + allergies.
- Show the generated structured prescription.
- Demonstrate editing one line.
- Show interaction warning ("Patient is on metformin — flag noted").
- Sign + send.

**Close:** "The AI never sends without your signature. You're always in control."

---

## 7. Voice dictation — `voice`

**Hook:** "Speak the script. Sign the form."

**Body:**
- Open voice prescription page.
- Click mic.
- Say: "Amoxicillin 500 milligrams, twice a day, seven days, with food. Paracetamol 650 milligrams, every six hours as needed."
- Show form populating live.
- Switch language toggle → repeat in Hindi.

**Close:** "90+ languages. Useful if you consult cross-border."

---

## 8. Clinic EMR — `emr`

**Hook:** "A free clinic EMR comes with your account."

**Body:**
- Patients list → search → open one patient.
- Show timeline: past consults, prescriptions, lab uploads.
- Add a SOAP note.
- Upload a lab PDF.
- Show audit log entry appearing.
- Show staff page → invite a nurse with limited permissions.

**Close:** "Free for 50 new patients a month. Export everything to FHIR or HL7 anytime."

---

## 9. Earnings & payouts — `earnings`

**Hook:** "What you keep, when you get it."

**Body:**
- Earnings page → show this week's gross and net.
- Hover over the tier badge → tooltip explains 30/25/20/15.
- Click "Withdraw" → show Stripe destination.
- Cut to weekly payout email.

**Close:** "No subscription. You pay only when you earn."

---

## 10. OduDoc Ray (AI co-pilot) — `ray`

**Hook:** "Your second brain during a consultation."

**Body:**
- Inside a live consultation.
- Toggle Ray on → consent shown to patient.
- Patient describes a symptom on the call → Ray surfaces a differential in the side panel.
- Show "Suggested questions" appearing.
- Show "Relevant guideline" link expanding into a citation.

**Close:** "Ray is your eyes-only. Nothing reaches the patient unless you share it."

---

## 11. Reviews & reputation — `reviews`

**Hook:** "Your reviews live on your public profile."

**Body:**
- Reviews page → show 4-star average.
- Open a review → show "Reply publicly" option.
- Show flagging an abusive review.

**Close:** "Reviews feed into search ranking. Keep them honest, reply when you can."

---

## 12. Refer a colleague — `referrals`

**Hook:** "Both of you earn $25."

**Body:**
- Referrals page → copy unique link.
- Show what the colleague sees when they click: pre-filled application.
- Show your earnings page: pending bonus once they hit 5 consults.

**Close:** "No cap. Refer as many as you like."

---

## 13. Mobile app — `mobile`

**Hook:** "Practice from your phone."

**Body:** Phone screen capture:
- Open OduDoc Doctor app.
- Toggle "Available now".
- Receive push for instant consult.
- Take the call.
- Sign the prescription on phone.

**Close:** "Available on Play Store. iOS coming soon."

---

## 14. Compliance & support — `compliance`

**Hook:** "Three things every doctor asks us about security."

**Body:**
- Show HTTPS, "encrypted at rest" data-safety page.
- Show ABHA / HPR linking flow for India.
- Show support inbox response time.

**Close:** "Email support@odudoc.com. Same-day reply."
