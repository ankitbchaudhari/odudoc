# Mobile app scaffold plan

The OduDoc mobile API surface (`/api/*/mobile/`) is JWT-authenticated
and ready for a native shell to consume. This document is the
opinionated plan a contractor (or future-you) can follow to spin up
the iOS + Android app without re-deriving every decision.

## Tech stack pick: **Expo + React Native**

Why not native (Swift / Kotlin):

- For a telehealth app the heavy work is video calling (already
  handled server-side by Daily / Jitsi via the same room URL the web
  app uses), payments (Stripe via Stripe SDK), and forms. Native
  perf isn't the bottleneck.
- Code-share with the web app for state shape, validation, copy
  strings, and even a few components (via a shared `packages/shared`
  package later).
- Expo's managed workflow handles signing, OTA updates, push
  notifications, and crash reporting without you running a Mac
  build farm.

Why Expo specifically (not bare React Native):

- One `eas build` runs both iOS and Android in their cloud — no
  Xcode required. Useful when shipping from a Windows machine like
  this repo's primary dev environment.
- EAS Update ships JS-only fixes without a store re-submission;
  store reviews can take 24-48h, EAS Update is minutes.

## Directory layout

```
mobile/                     # New sibling to the existing Next app
├── app/                    # Expo Router screens
│   ├── (auth)/
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── verify.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx       # Doctors list
│   │   ├── consults.tsx    # Booked consultations
│   │   ├── prescriptions.tsx
│   │   └── account.tsx
│   ├── doctor/[id].tsx
│   └── booking/[id].tsx
├── components/
├── lib/
│   ├── api.ts              # JWT-authenticated fetch wrapper
│   ├── auth.ts             # Token storage + refresh
│   ├── push.ts             # FCM device-token registration
│   └── stripe.ts           # Stripe React Native init
├── app.json                # Expo config — bundle id, icons, splash
├── eas.json                # EAS Build / Update config
└── package.json
```

## Build order (week-by-week)

### Week 1 — Auth + scaffolding
- `npx create-expo-app mobile --template default`
- Set up Expo Router, the tab layout, the auth stack
- Wire `lib/api.ts` to base URL `https://www.odudoc.com` and pull
  the JWT from secure storage on every request
- Implement `/login`, `/register`, `/verify` against
  `/api/auth/mobile-login`, `/api/auth/mobile-register`,
  `/api/auth/mobile-verify`
- Token persistence via `expo-secure-store`

### Week 2 — Core consult flow
- Doctors list pulling from `/api/doctors` (already public)
- Doctor profile screen
- Booking flow — slot picker, medical-history form, posting to
  `/api/bookings/mobile`
- Stripe payment — integrate `@stripe/stripe-react-native`
  against `/api/payments/mobile/create-order`

### Week 3 — In-call + post-call
- Video call: open the `roomUrl` returned from `/api/rooms/mobile/
  [bookingId]` in either an in-app WebView (Daily) or via the Daily
  React Native SDK (better experience). Either works.
- Post-call: render the prescription PDF if one was issued

### Week 4 — Push + polish
- FCM setup (`expo-notifications` + `expo-device`)
- Register the device token via `/api/notifications/mobile/
  register-device` on first sign-in
- Pull notifications from `/api/notifications` (already exists)
- Submit to App Store / Play Store via `eas submit`

## Sample: JWT-authenticated fetch wrapper

The single most important piece — every screen will use this. Drop
into `mobile/lib/api.ts`:

```typescript
import * as SecureStore from "expo-secure-store";

const BASE_URL = "https://www.odudoc.com";
const TOKEN_KEY = "odudoc_jwt";

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export interface ApiError {
  status: number;
  error: string;
}

/**
 * Every mobile API call goes through this. Attaches the JWT,
 * surfaces a typed error on non-2xx, and forces clearToken on 401
 * so a stale session triggers a re-login flow at the call site.
 */
export async function api<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await getToken();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (res.status === 401) {
    await clearToken();
    throw { status: 401, error: "Session expired" } satisfies ApiError;
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw {
      status: res.status,
      error: body.error || `HTTP ${res.status}`,
    } satisfies ApiError;
  }
  return res.json() as Promise<T>;
}

// Example usage at a call site:
//   const { bookings } = await api<{ bookings: Booking[] }>(
//     "/api/bookings/mobile",
//   );
```

## Env-var checklist for the mobile build

```
EXPO_PUBLIC_API_BASE=https://www.odudoc.com
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
EXPO_PUBLIC_DAILY_DOMAIN=odudoc.daily.co        # if using Daily SDK
EXPO_PUBLIC_POSTHOG_KEY=...                      # share with web
GOOGLE_SERVICES_JSON=...                         # FCM, paste into eas.json secrets
GOOGLE_SERVICE_INFO_PLIST=...                    # FCM iOS, same
```

## What NOT to do

- Don't reimplement auth in the mobile app. Use the same
  `/api/auth/mobile-*` endpoints the web app already serves. The
  JWT format is documented in `lib/auth.ts`.
- Don't bundle a copy of the doctor list. Every screen pulls live;
  the mobile API is fast enough that there's no reason to ship a
  stale snapshot.
- Don't try to get App Store approval on a sub-domain you don't
  own. Apple wants the bundle-id reverse-DNS to match a domain you
  control — `com.odudoc.app` from `odudoc.com` is fine.
- Don't ship the Doctor app and Patient app as one binary. App
  stores prefer focused apps; ship the Patient app first, the
  Doctor app as a separate listing in week 6+.

## Estimate

- Solo contractor familiar with Expo: 4-6 weeks for the Patient app
  store-ready
- Two people: 3-4 weeks
- Doctor app (separate listing): add 2 more weeks after Patient ships
- App-store review windows: budget 2-3 days per submission

## Hand-off checklist

When you give this doc to a contractor, also send:

- [ ] `lib/auth.ts` (JWT signing format)
- [ ] List of `/api/*/mobile/` endpoints (run
      `find app/api -name "route.ts" -path "*/mobile/*"`)
- [ ] Stripe publishable key + Stripe Connect account info
- [ ] Daily.co API key if using the Daily SDK
- [ ] FCM service account JSON
- [ ] Apple Developer Program login (paid, $99/yr)
- [ ] Google Play Console login (one-time $25)

That's the path. Roughly 4 weeks of focused work, no surprises in
the API layer because everything's already there.
