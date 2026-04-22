# OduDoc — Website Guide & Demo Book

**Live URL:** https://www.odudoc.com
**Last updated:** April 22, 2026

---

## 1. What OduDoc does (60-second pitch)

OduDoc is a patient-facing telemedicine + hospital-ops platform.

- **Patients** can browse doctors, book appointments, and start video consults — no account needed, just phone OTP.
- **Doctors** get a dashboard for appointments, consultations, prescriptions, and earnings.
- **Hospitals/Clinics** get a full admin panel for patients, staff, billing, inventory, labs, wards, OT, and more.

The homepage is the marketing entry — the real product lives in `/dashboard`, `/admin`, and the booking flow.

---

## 2. Accounts & logins (for the demo)

| Role | Login URL | Notes |
|---|---|---|
| Patient | — | No account needed. Phone OTP only when booking. |
| Doctor | `/auth/signin` | Email + temp password from welcome SMS/email (7-day expiry) |
| Admin  | `/auth/signin` | Admin credentials set in env / seeded user |
| Google SSO | `/auth/signin` | "Continue with Google" on sign-in page |

**Demo-ready doctor accounts** are created by the admin via `/admin/doctors → Add Doctor` — welcome email + SMS with temp password is sent automatically.

---

## 3. The patient booking demo — most important flow

This is the flow to show first. It's what every visitor will use.

### Steps

1. Go to **https://www.odudoc.com**
2. Click **Find Doctors** in the top nav (or scroll to the featured doctors)
3. Pick any doctor card → lands on `/doctors/[id]`
4. Click **Book Appointment** (or **Video Consult** — same flow)
5. **Step 1 — Slot:** pick a date (15-day window) and a time slot
6. **Step 2 — Details:** enter First Name, Last Name, Phone (with country code, e.g. `+91 98765 43210`)
7. Click **Send verification code**
8. **Step 3 — OTP:** enter the 6-digit SMS code → click **Verify & confirm booking**
9. Booking confirmation screen with reference ID

### What's happening under the hood
- OTP is handled by **Firebase Phone Auth** (free up to 10k SMS/month)
- Paid bookings redirect to Stripe for card payment
- **Payments are currently disabled for 24 hours** — bookings are free, no card required. Green banner on the form tells the patient.
- Video consultations open a Daily.co room tied to the consult token

---

## 4. Video consult demo (patient side)

Same as booking, but the button is **Video Consult**. After OTP:
- Paid: Stripe → then auto-redirects to `/dashboard/consultations/[id]`
- Free: directly redirects to the consult page
- Patient fills in medical history → room unlocks when doctor joins

---

## 5. Doctor dashboard demo

**Login** at `/auth/signin` with doctor email + temp password.

On first login with a temp password, the user is prompted to set a permanent password (7-day expiry enforced server-side).

### Key pages to show
| Page | What's there |
|---|---|
| `/dashboard/doctor` | Overview — today's appointments, upcoming consults, earnings snapshot |
| `/dashboard/consultations` | Active + past consults with patient history |
| `/dashboard/prescriptions` | Issue e-prescriptions |
| `/dashboard/payments` | Doctor earnings + payout requests |
| `/dashboard/doctor/profile` | Edit specialty, fee, slots, bio |

---

## 6. Admin panel demo

**Login** at `/auth/signin` with an admin account → `/admin`.

The admin panel has **100+ modules** grouped by function. For a 5-minute demo, show these in order:

### A. Doctor management (2 min)
1. **`/admin/doctors`** — table of all doctors
2. Click **Add Doctor** → fill name/email/phone → Save
3. Doctor gets email + SMS with login + temp password automatically
4. **`/admin/applications`** — doctor job applications; approve → same auto-onboard flow
5. **`/admin/careers`** — job postings visible at `/careers`

### B. Letters generator (1 min)
1. **`/admin/letters`** → **Generate Letter**
2. Pick type: **Appointment Letter** or **Experience Letter**
3. Choose doctor from dropdown → fill type-specific fields (role, start date, etc.)
4. Click **Generate** → PDF-printable view opens
5. Click **Print** in top-right for A4 letterhead output

### C. Appointments & consultations (1 min)
- **`/admin/appointments`** — all bookings across the system
- **`/admin/consultations`** (inside telemedicine or doctor sections) — active video consults
- **`/admin/patients`** — patient records + medical history

### D. Clinical modules (show 2-3 from the list)
Pick any — the admin panel covers: pharmacy, lab orders, radiology, wards, ICU, OT, dialysis, maternity, oncology, ophthalmology, ENT, blood bank, dietary, housekeeping, biowaste, emergency codes, incidents, quality metrics, KPI dashboard, etc.

### E. Finance & ops
- **`/admin/billing`** / **`/admin/invoices`** — patient invoicing
- **`/admin/payouts`** — doctor payout processing
- **`/admin/inventory`** / **`/admin/vendors`** — hospital supplies
- **`/admin/staff`** / **`/admin/staff-schedule`** — workforce

---

## 7. Patient-facing content pages

| URL | Purpose |
|---|---|
| `/` | Homepage |
| `/doctors` | Browse all doctors |
| `/doctors-az` | A–Z index |
| `/directory` | Full directory |
| `/specialty/[slug]` | Specialty pages (cardiology, dermatology, etc.) |
| `/conditions` / `/symptoms` / `/surgeries` | Medical content hub |
| `/blog` | Health articles |
| `/shop` | Pharmacy / products |
| `/tests` | Lab test booking |
| `/pricing` | Plans |
| `/for-clinics` / `/for-doctors` / `/corporate` | B2B landing pages |
| `/careers` | Jobs + application form |
| `/faq` / `/help` / `/contact` | Support |
| `/about` / `/privacy` / `/terms` | Legal |

---

## 8. Quick demo script (5 minutes total)

**Minute 1 — Homepage & brand**
- Open https://www.odudoc.com → scroll → highlight "Find Doctors" + "Video Consult" primary CTAs

**Minute 2 — Patient books**
- Find Doctors → click any doctor → Book Appointment → pick slot → fill form → SMS OTP → confirm booking

**Minute 3 — Video consult**
- Back to doctor profile → Video Consult → same OTP flow → show the medical-history intake

**Minute 4 — Doctor side**
- Log in as doctor → Dashboard → show today's appointments & consults

**Minute 5 — Admin**
- Log in as admin → `/admin/doctors` → Add Doctor (fake entry) → show welcome email/SMS → `/admin/letters` → generate + print a letter → `/admin/kpi-dashboard` for wow-factor metrics

---

## 9. Config & environment

### Current platform state
- **Host:** Vercel (production = `www.odudoc.com`)
- **Database:** Postgres (via `bindPersistentArray` store pattern)
- **Auth:** NextAuth credentials + Google OAuth
- **SMS OTP:** Firebase Phone Auth (Blaze plan, free under 10k/mo)
- **Email:** Resend
- **SMS (non-OTP, e.g. welcome messages):** Twilio
- **Payments:** Stripe (currently disabled via `PAYMENTS_DISABLED_UNTIL` flag)
- **Video:** Daily.co

### Critical env vars (set in Vercel)
- Firebase: `NEXT_PUBLIC_FIREBASE_*` (4 client) + `FIREBASE_ADMIN_*` (3 server)
- Stripe: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- Twilio: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`
- Resend: `RESEND_API_KEY`
- NextAuth: `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Daily: `DAILY_API_KEY`
- Payments gate: `PAYMENTS_DISABLED_UNTIL` (ISO timestamp)

---

## 10. Known good + known issues

### Working
- ✅ Patient booking end-to-end (Firebase OTP → free booking or Stripe)
- ✅ Video consult (Daily room, patient history form, doctor joins)
- ✅ Doctor onboarding (manual add / application approve / career hire → welcome email + SMS + temp password)
- ✅ Admin letters (appointment + experience, printable A4)
- ✅ Temp-password 7-day expiry enforcement

### Currently disabled / pending
- ⏸️ **Stripe payments** — disabled for 24 hours (free bookings only) via env flag. Re-enable by removing/expiring `PAYMENTS_DISABLED_UNTIL`.
- ⚠️ Firebase Phone Auth requires **Blaze plan** (free under 10k/mo SMS) — project is on Blaze. If plan is downgraded, OTP breaks.
- 📝 Twilio free trial only sends to verified numbers — upgrade Twilio account for open SMS to any number (Firebase handles OTP fine regardless).

---

## 11. Troubleshooting cheat sheet

| Symptom | Fix |
|---|---|
| "Could not send code" on OTP step | Check Firebase Blaze plan active; check authorized domains include `www.odudoc.com`; hard-refresh browser |
| reCAPTCHA enterprise warning in console | Harmless — falls back to v2 automatically |
| Doctor can't log in | Temp password expired (>7 days). Admin: `/admin/doctors` → resend invite |
| Booking fails on payment step | Check Stripe keys in Vercel; check `PAYMENTS_DISABLED_UNTIL` if you're trying to test paid path |
| Welcome email/SMS not sent | Check Resend + Twilio env vars; view server logs in Vercel |
| 404 on freshly-generated letter | Cold-Lambda race on the JSON store — already fixed (awaits save + reload fallback). Retry once. |

---

## 12. Files to know (for devs)

- `components/BookingModal.tsx` — the 5-step book-appointment modal
- `components/ConsultGateModal.tsx` — the video-consult OTP gate
- `lib/firebase-client.ts` / `lib/firebase-admin.ts` — Firebase SDK wrappers
- `lib/consult-otp.ts` — shared token store (verified + pending)
- `app/api/consult/firebase/verify/route.ts` — server-side Firebase ID-token verifier
- `lib/doctor-invite.ts` — doctor onboarding email + SMS
- `lib/users-store.ts` — users + temp password logic
- `lib/doctor-letters.ts` — letter records store
- `app/admin/letters/page.tsx` + `[id]/page.tsx` — letter generator UI

---

**That's the whole book.** For deeper dives on any module, open the corresponding folder under `app/admin/`.
