# OduDoc Mobile Apps — Developer Handover

Two React Native apps live in this folder:

```
apps/
├── _shared/            # design system + API client used by both apps
├── patient/            # OduDoc (consumer app)
├── doctor/             # OduDoc for Doctors
└── INSTRUCTION_MANUAL.md   ← you are here
```

Both apps are built with **Expo SDK 51** (managed workflow). The
business logic lives at `https://www.odudoc.com` — the apps call
the existing REST endpoints, so there's no separate backend.

## Stack at a glance

- **Framework:** Expo (React Native) SDK 51
- **Language:** TypeScript
- **Navigation:** `@react-navigation/native` + `@react-navigation/bottom-tabs` + `@react-navigation/native-stack`
- **Auth storage:** `expo-secure-store` (keychain on iOS, EncryptedSharedPreferences on Android)
- **Theming:** plain `StyleSheet` + design tokens in `_shared/theme.ts`
- **Gradients:** `expo-linear-gradient`
- **API:** `fetch` with cookie auth (see `_shared/api.ts`)
- **Build / release:** EAS Build + EAS Submit

## What's in this handover

| File | Purpose |
|---|---|
| `_shared/theme.ts` | Colours, gradients, spacing, radii, font sizes |
| `_shared/ui.tsx` | Cross-app components: AuroraBackground, GlassCard, GradientButton, GhostButton, Badge, H1/H2/Body/Caption, SectionHeader |
| `_shared/api.ts` | `api()` helper + cookie store + typed fetch wrappers (`fetchDoctors`, `fetchMyConsultations`, `fetchMyPrescriptions`) |
| `patient/App.tsx` | Stack + bottom tabs for the patient app |
| `patient/src/screens/*` | 7 screens (Welcome, Login, Dashboard, FindDoctors, DoctorDetail, Records, Family, Profile) |
| `doctor/App.tsx` | Stack + bottom tabs for the doctor app |
| `doctor/src/screens/*` | 6 screens (Login, Dashboard, Queue, Consult, Patients, Earnings, Profile) |

Each screen renders against the `AuroraBackground` (per-role colour theme) with `GlassCard`-based content. The visual language is glassmorphism over an aurora gradient — same DNA as the web `/dashboard` redesign.

---

## Step-by-step setup

### 0. Prerequisites

Install once on your machine:
- **Node 20+** (use `nvm` to pin)
- **Git**
- **Expo CLI:** `npm install -g eas-cli`
- For iOS builds: a Mac with Xcode 15+, an Apple Developer account ($99/yr)
- For Android builds: Android Studio with the latest SDK + a Google Play Console account ($25 one-time)

You can build both apps in the cloud via EAS without a local Mac, but local builds save credits and iterate faster.

### 1. Install dependencies

```bash
cd apps/patient
npm install

cd ../doctor
npm install
```

Each app is independent — they share files via the relative `../_shared` path resolved by `babel.config.js`. The Metro bundler treats `_shared` as if it were part of the app's own source tree.

### 2. Run locally

```bash
cd apps/patient
npm run start         # opens Expo dev server
# scan the QR code with the Expo Go app on a real device
# or press 'i' for iOS simulator, 'a' for Android emulator
```

The app calls the live backend at `https://www.odudoc.com` immediately — sign in with any patient/doctor account you've created on the website.

### 3. Replace the placeholder assets

`src/assets/README.md` in each app lists exactly which PNG files to create. You need three per app (icon, adaptive-icon, splash). Use the OduDoc green-cross monogram for the Patient app and a violet "Dr" variant for the Doctor app. Don't skip this — the App Store will reject placeholder icons.

### 4. Wire EAS

```bash
cd apps/patient
eas login           # one-time, uses your Expo account
eas project:init    # creates an EAS project + writes the projectId into app.json
```

Repeat for `apps/doctor`. The two apps get separate EAS projects so their build queues + over-the-air updates are isolated.

Edit `eas.json` in each app and replace the placeholder Apple IDs with the real ones. The `submit.production.android.serviceAccountKeyPath` expects a JSON service-account key file downloaded from the Google Play Console (Setup → API access). Drop it at the root of the app folder and add it to `.gitignore`.

### 5. First build

**Patient — Android internal-track APK (fastest path to test on real devices):**

```bash
cd apps/patient
eas build --platform android --profile preview
```

EAS builds in the cloud (~15 min for the first build), then gives you a URL to install the APK directly on Android phones.

**Patient — iOS TestFlight build:**

```bash
eas build --platform ios --profile production
eas submit --platform ios
```

This uploads to App Store Connect; from there add testers in TestFlight. Apple's review for TestFlight is usually <24h.

**Repeat for the Doctor app:**

```bash
cd ../doctor
eas build --platform android --profile preview
eas build --platform ios --profile production
eas submit --platform ios
```

### 6. Production release

Once tested in TestFlight + internal Play track:

```bash
# Patient
cd apps/patient
eas build --platform android --profile production   # AAB for Play Store
eas submit --platform android                       # uploads to Play Console
eas build --platform ios --profile production
eas submit --platform ios                           # uploads to App Store Connect

# Doctor — same steps from apps/doctor
```

Then in the Play Console and App Store Connect dashboards, **promote the build to production** and fill out the listing (screenshots, description, privacy policy URL, etc — see "Store listing checklist" below).

---

## What's a complete screen and what's a stub

Every screen renders correctly, navigates correctly, and connects to the live API where applicable. The headline business actions (book a consult, complete a sitting, sign a prescription) intentionally surface as **TODO** in the source — they need product decisions about:
- Which video provider to embed (Daily.co is wired on web; can be reused via `react-native-daily-js`)
- Whether prescriptions are signed in-app or generated server-side and PDF'd
- Whether the Doctor app's voice-Rx uses native iOS / Android speech-recognition or routes to the existing Gemini-backed endpoint

Search the codebase for `TODO` to find every one. Don't ship without addressing them.

| Screen | API hooked | UI shipped | Action complete |
|---|---|---|---|
| `patient/Welcome` | n/a | ✅ | ✅ |
| `patient/Login` | ✅ `/api/auth/mobile-login` | ✅ | ✅ |
| `patient/Dashboard` | ✅ consultations + prescriptions | ✅ | n/a |
| `patient/FindDoctors` | ✅ `/api/doctors/public` | ✅ | ✅ |
| `patient/DoctorDetail` | ✅ | ✅ | ⚠ booking action stubbed |
| `patient/Records` | ✅ prescriptions | ✅ | ⚠ PDF download stubbed |
| `patient/Family` | ⚠ stub data | ✅ | ⚠ add-dependent stubbed |
| `patient/Profile` | ✅ logout | ✅ | ✅ |
| `doctor/Login` | ✅ same endpoint, role-gated | ✅ | ✅ |
| `doctor/Dashboard` | ✅ + instant-availability | ✅ | ✅ |
| `doctor/Queue` | ✅ consultations | ✅ | ✅ |
| `doctor/Consult` | n/a | ✅ skeleton | ⚠ video + Rx stubbed |
| `doctor/Patients` | ⚠ stub data | ✅ | n/a |
| `doctor/Earnings` | ⚠ stub data | ✅ | ⚠ PDF stubbed |
| `doctor/Profile` | ✅ logout | ✅ | ✅ |

---

## Store listing checklist

Both apps need the following filled out in the store consoles. Reuse content from `https://www.odudoc.com` where possible.

### iOS App Store Connect

- [ ] **App name:** "OduDoc" (patient) / "OduDoc for Doctors"
- [ ] **Subtitle (30 chars):** "Doctors, consults, records" / "Run your clinical practice"
- [ ] **Bundle ID:** `com.odudoc.patient` / `com.odudoc.doctor`
- [ ] **Privacy policy URL:** `https://www.odudoc.com/privacy`
- [ ] **Support URL:** `https://www.odudoc.com/help`
- [ ] **Marketing URL:** `https://www.odudoc.com`
- [ ] **Category:** Medical (primary), Health & Fitness (secondary)
- [ ] **Screenshots:** 6.7" iPhone (1290×2796) + 6.5" iPhone (1242×2688) + 5.5" iPhone (1242×2208). At least three per size. Generate via the iOS simulator using `Cmd+S`.
- [ ] **App Review information:** demo credentials (patient: `demo-patient@odudoc.com` / doctor: `demo-doctor@odudoc.com`), reviewer notes explaining the healthcare use case + verification flow
- [ ] **Privacy questionnaire:** must declare collection of contact info, identifiers, health data, usage data (linked to user)

### Google Play Console

- [ ] **App name:** "OduDoc" / "OduDoc for Doctors"
- [ ] **Short description (80 chars):** "Find verified doctors, book video consults & manage your health records."
- [ ] **Full description:** 4000 chars. Reuse the `/for-patients` and `/for-doctors` page copy.
- [ ] **Category:** Medical
- [ ] **Content rating:** Complete the questionnaire — for a clinical app, expect a "Mature 17+" or "Teen" rating depending on jurisdiction
- [ ] **Privacy policy URL:** `https://www.odudoc.com/privacy`
- [ ] **Data safety form:** Declare every category your app sends (contact info, health and fitness, financial info via wallet, location for instant-availability)
- [ ] **Screenshots:** 8 phone screenshots at 1080×1920 minimum
- [ ] **Feature graphic:** 1024×500 PNG
- [ ] **App icon:** 512×512 PNG (smaller version of the in-app icon)

### Both stores — common rejection causes for healthcare apps

1. **No actual medical service shown to the reviewer.** Use demo credentials that land in a populated account with real-looking history. App Review will reject empty-shell apps.
2. **Telemedicine without provider verification.** Both stores require evidence that the doctors on the platform are verified clinicians. Link your verification flow + the doctor-credentialing page on the website in App Review notes.
3. **Health claims in copy.** Don't say "treats", "cures", or "diagnoses" anywhere. Use "consult", "advice", "guidance".
4. **Cross-border consultation without disclosure.** Add a clear hint that consultations are subject to the doctor's licensing jurisdiction (IMC rules in India).
5. **Children's content rules.** If under-13 patients are possible, you trigger the Children's category in both stores. Avoid by requiring 18+ at signup and routing under-18 patients through the Family-dependent flow only.

---

## After launch

### Over-the-air (OTA) updates

```bash
eas update --branch production --message "Fix doctor queue refresh"
```

Pushes JS-only changes to production users in seconds (no store review). Only works for changes that don't touch native code (icons, permissions, new native deps still require a new build + store submission).

### Crash reports + analytics

The apps don't ship with a crash reporter — recommend wiring Sentry:

```bash
cd apps/patient
npx expo install sentry-expo
```

Then follow https://docs.sentry.io/platforms/react-native/manual-setup/expo/ — about 15 min.

### Push notifications

`expo-notifications` covers both platforms. Add it to each `package.json` then:

```ts
import * as Notifications from "expo-notifications";
const token = await Notifications.getExpoPushTokenAsync();
// POST token to /api/mobile/push/register on the website
```

The web app already has an Expo-push integration on `/api/mobile/push/register` and `/api/notifications/push-send` — both apps can plug in directly.

### Versioning

Bump `version` in `app.json` + `package.json` for every store submission. EAS Build auto-increments the `buildNumber` (iOS) / `versionCode` (Android) when `production.autoIncrement` is true (already set).

---

## Quick reference — common commands

```bash
# Start dev server
npm run start

# Build for internal testing (APK)
eas build --platform android --profile preview

# Build production AAB (Play Store)
eas build --platform android --profile production

# Build production iOS (.ipa)
eas build --platform ios --profile production

# Submit latest build to the stores
eas submit --platform ios
eas submit --platform android

# Push OTA update to existing installs
eas update --branch production --message "Description"

# View current builds
eas build:list

# Roll back an OTA update
eas update:rollback --branch production
```

---

## Adding a new screen

1. Create `src/screens/MyScreen.tsx` in either app.
2. Import the shared primitives:

   ```tsx
   import { AuroraBackground, GlassCard, GradientButton, H1, Body, SPACING } from "@shared/ui";
   import { ROLE_THEMES } from "@shared/theme";

   const theme = ROLE_THEMES.patient; // or .doctor
   ```

3. Wrap the body in `<View style={{flex:1}}><AuroraBackground theme={theme} /><SafeAreaView>…</SafeAreaView></View>` to keep the visual language consistent.

4. Register the screen in `App.tsx`'s `Stack.Navigator` or `Tab.Navigator`.

5. If you need new API endpoints, add them to `_shared/api.ts` so both apps benefit.

---

## Branding rules

- **Patient = teal/emerald gradient.** Never use violet/fuchsia in the Patient app.
- **Doctor = violet/fuchsia gradient.** Never use teal/emerald in the Doctor app.
- **Wordmark "OduDoc"** is the consumer-facing brand. **Sarjudas Digital Trading and Escrow Services LLC** is the legal entity — visible in the Profile footer of both apps + in the iOS / Android privacy declarations.

---

## Contacts

- Backend / web app: see the root README of this repository
- App Store / Play submission help: Apple Developer Support (https://developer.apple.com/support/) and Play Console help (https://support.google.com/googleplay/android-developer)
- Expo / EAS issues: https://expo.dev/support

End of manual.
