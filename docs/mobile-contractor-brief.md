# OduDoc Mobile App — Contractor Brief

## About OduDoc

OduDoc is a worldwide telehealth platform: patients book video
consultations with verified doctors, pay in their local currency, and
receive a digital prescription at the end of the call. Hospitals and
clinics also use the same platform for in-house operations (orders,
withdrawals, doctor management, etc.). The web app (Next.js 15 on
Vercel) is in production at https://www.odudoc.com.

## Project goals

We need a native iOS + Android Patient app, store-ready (App Store +
Play Store), built on top of our existing JWT-authenticated mobile
API surface. The Doctor app is a separate scope and not part of this
engagement (we may hire you for it after).

## What's already built (you don't reinvent any of this)

- **All API endpoints exist** — `/api/auth/mobile-{login,register,
  resend-code,verify,google}`, `/api/bookings/mobile`,
  `/api/orders/mobile`, `/api/payments/mobile/*`,
  `/api/products/mobile`, `/api/rooms/mobile/[bookingId]`,
  `/api/prescriptions/safety-check`,
  `/api/notifications/mobile/register-device`, `/api/ai/dictation/
  mobile`, `/api/ai/prescription/mobile`, `/api/doctor-earnings/
  mobile`, `/api/patients/mobile/*`. JWT in `Authorization: Bearer`
  header.
- **Stripe Connect** is integrated — use the Stripe React Native SDK
  against `/api/payments/mobile/create-order`.
- **Video calling** — `/api/rooms/mobile/[bookingId]` returns a
  `roomUrl` you open via either an in-app WebView (Daily) or the
  Daily React Native SDK.
- **Push notifications** — FCM tokens go to
  `/api/notifications/mobile/register-device`; we send pushes
  server-side already.
- **Multi-currency** — `/api/locale/suggest` returns the visitor's
  geo-suggested currency; pass it as `currency` in the
  create-payment-intent body.

## Tech stack we want you to use

- **Expo + React Native** (managed workflow). Not bare RN, not
  native Swift/Kotlin.
- **Expo Router** for navigation
- **expo-secure-store** for JWT persistence
- **@stripe/stripe-react-native** for payments
- **expo-notifications** + **expo-device** for FCM
- **TanStack Query** for API state (optional but recommended)

## Scope (Patient app, store-ready)

- Auth: email + phone-OTP signup, login, social (Google), forgot
  password
- Doctors directory + profile screens
- Booking flow: specialty → doctor → slot → medical history → pay
- In-call video screen (Daily WebView is fine for v1; native SDK is
  v2)
- Post-call: rendered prescription + pharmacy CTA
- Account screen: profile, past consultations, prescriptions,
  payments
- Push notification handling (booking reminders, doctor messages)
- App Store + Play Store submission and approval

## Out of scope

- Doctor app (separate engagement)
- Admin app (no demand for it)
- Any backend / API work — APIs are done; if you find a gap, file
  an issue and we'll patch the web codebase
- Web app changes
- Marketing site / landing pages

## Deliverables

1. Public GitHub repo with the Expo project, conventional commits
2. App Store + Play Store listings, live and approved
3. EAS Build + EAS Update set up so we can ship JS-only fixes
   without store re-review
4. Hand-off doc: how to bump versions, run a build, ship an OTA
   update
5. Source code review (we read every PR)

## What we provide on day one

- Read access to a `mobile/` directory in our private repo with the
  full architectural plan
- `docs/mobile-app-scaffold.md` — the opinionated scaffold including
  the JWT fetch wrapper sample
- Stripe publishable key (test + live)
- Daily.co API key
- FCM service account JSON files (iOS + Android)
- Apple Developer account login ($99/yr — already paid)
- Google Play Console login ($25 one-time — already paid)

## Estimated timeline

4–6 weeks for store-ready Patient app, working full-time.

| Week | Milestone |
|------|-----------|
| 1 | Auth flows + scaffolding |
| 2 | Doctors list + booking + Stripe |
| 3 | Video call + post-call prescription |
| 4 | FCM push + polish + TestFlight build |
| 5 | App Store + Play Store submission |
| 6 | Approval + post-launch fixes |

## What we look for

- Shipped at least 2 React Native apps to the App Store (please
  share TestFlight or production links)
- Comfortable with Expo Router (not just plain Expo)
- Stripe React Native experience — we don't want to rediscover gotchas
- WebView + camera/mic permissions on both iOS and Android
- Communication: async-first, weekly demo + daily Slack/Discord
  presence; no daily standups

## Budget

- Hourly $40-80 (Upwork tier) or $80-150 (Toptal tier) — flag your
  rate
- Or fixed-price $8k–$25k for the full scope above
- Either way, payment milestoned: 25% on contract sign, 25% at first
  TestFlight build, 25% at App Store submission, 25% on approval

## How to apply

Reply with:
1. Two production app links (App Store / Play Store)
2. Your hourly rate or fixed-price quote
3. Earliest start date
4. One opinionated take: which screen of the Patient app would you
   build first, and why?

(Last question is the filter — generic answers go in the bin.)

## Contact

Reply to this listing. We'll do a 30-min call within 48h.
