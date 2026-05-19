# Developer account setup — OduDoc mobile apps

This is for **Ankit (owner of Sarjudas LLC)**, not the developer. The
developer needs accounts to exist before they can build / submit, and
they should be invited as **Admin** so you retain ownership.

Plan ahead — the Apple flow takes **1–2 weeks** because of D-U-N-S
verification.

---

## What you'll need on hand before you start

| Item | Where to find it |
|------|------------------|
| **D-U-N-S Number for Sarjudas LLC** | Free from Dun & Bradstreet. Apple verifies this with D&B — sometimes takes 5–14 days. Get this FIRST: https://developer.apple.com/enroll/duns-lookup/ |
| **Sarjudas LLC formation docs** | Delaware Certificate of Formation — Apple may request a copy |
| **Authorized signer name + title** | Must be a person legally able to enter into agreements on the LLC's behalf |
| **Business address** | 8 The Green, Ste A, Dover, DE 19901 (same as on the website footer) |
| **Business phone** | Apple calls it for verification. Use a real number — not a Google Voice / VoIP if possible |
| **Government ID** | Passport or driving licence of the authorized signer |
| **Payment card** | $99/yr (Apple) + $25 one-time (Google). Must be in the company name if possible |
| **Developer's email** | To invite them as Admin |

---

## 1. Apple Developer Program (allow 1–2 weeks)

### Step 1 — Get a D-U-N-S Number first

1. Go to https://developer.apple.com/enroll/duns-lookup/
2. Search for "Sarjudas Digital Trading and Escrow Services LLC"
3. If found → note the 9-digit number
4. If not found → request a new D-U-N-S (free, takes 5–14 days)

### Step 2 — Enrol as an Organization

1. https://developer.apple.com/programs/enroll/
2. Choose **Organization** (NOT Individual — Individual blocks you
   from using the legal entity name as publisher)
3. Sign in with the Apple ID you want to OWN the account
   (use a Sarjudas LLC email like `owner@odudoc.com`, not your personal)
4. Fill in:
   - Legal entity name: **Sarjudas Digital Trading and Escrow Services LLC**
   - D-U-N-S Number
   - Address: 8 The Green, Ste A, Dover, DE 19901, US
   - Phone, website (`https://www.odudoc.com`)
5. Apple may call the listed phone number — answer it
6. Pay $99/yr
7. Wait for verification (1–14 days)

### Step 3 — Invite the developer

Once enrolled:
1. App Store Connect → **Users and Access** → **+** (top)
2. Email: developer's email
3. Role: **Admin** (NOT Account Holder — that's you only)
4. Apps: All
5. Send

The developer accepts the invite, then has full access to create app
records, upload builds, and submit for review — but cannot delete your
account or transfer apps without you.

### Step 4 — Capture the Team ID for universal links

App Store Connect → **Membership** → **Team ID** (10 characters,
e.g. `ABCD123456`).

Send this to me and I'll fill it into `app/.well-known/apple-app-site-association/route.ts`
(currently shows `TEAMID_REPLACE_ME`).

---

## 2. Google Play Console (allow 2–3 days)

### Step 1 — Sign up

1. https://play.google.com/console/signup
2. Choose **Organization** account
3. Pay $25 (one-time, for life)
4. Identity verification — upload government ID of authorized signer
5. Organization verification — upload Delaware Certificate of Formation
6. Wait 1–3 days for Google to verify

### Step 2 — Set up Developer profile

1. Display name: **OduDoc** (NOT the LLC name — Play shows this on the
   store listing, OduDoc is the brand)
2. Contact email: `support@odudoc.com`
3. Website: `https://www.odudoc.com`
4. Phone: business number

### Step 3 — Invite the developer

1. Play Console → **Users and permissions** → **Invite new users**
2. Email: developer's email
3. Permissions: **Admin (all permissions)**
4. App access: All current and future apps

### Step 4 — After developer's first upload, capture SHA-256

After the developer uploads the first AAB to either app:
1. Play Console → select app → **Setup** → **App integrity**
2. Copy the **App signing key certificate SHA-256 fingerprint**
3. Send to me — I'll paste it into `app/.well-known/assetlinks.json/route.ts`
   (currently shows `REPLACE_AFTER_FIRST_EAS_BUILD`)

---

## 3. Expo / EAS account (10 minutes)

### Step 1 — Sign up for the org

1. https://expo.dev/signup
2. Email: `owner@odudoc.com` (or another LLC email)
3. Create an **Organization** named `odudoc` (this becomes the
   `@odudoc/patient` and `@odudoc/doctor` namespace in EAS)

### Step 2 — Subscribe (optional but recommended)

- Free tier: builds wait in queue, limited concurrent builds
- **Production plan ($19/mo)**: priority builds, much faster turnaround
  for the developer

### Step 3 — Invite the developer

1. expo.dev → Organization Settings → **Members**
2. Invite by email
3. Role: **Admin** or **Developer** (Developer is enough — they can
   build and submit but can't delete the org)

### Step 4 — Configure EAS credentials storage

When the developer runs `eas build` for the first time, they'll be
asked whether to let EAS manage signing keys. **Answer yes.** Then:

- iOS distribution certificate: EAS generates and stores it in your org
- Android upload keystore: EAS generates and stores it in your org

This means: even if the developer leaves, you keep the signing keys
via your Expo org. Without this, losing the developer = losing the
ability to ship updates without users having to uninstall and reinstall.

---

## 4. After everything is live — send this to your developer

```
Apps to publish: OduDoc Patient + OduDoc Doctor
Source: see odudoc-mobile-apps.zip (sent separately)
Manual: apps/INSTRUCTION_MANUAL.md inside the zip

Accounts I have created — accept the invites:
  - Apple Developer (App Store Connect): you'll get an email invite, role = Admin
  - Google Play Console: email invite, role = Admin
  - Expo (org "odudoc"): email invite, role = Developer

Publisher legal entity for both stores:
  Sarjudas Digital Trading and Escrow Services LLC
  8 The Green, Ste A, Dover, DE 19901, US

Brand display name on store listings:
  Apple: "OduDoc"  (the storefront name)
  Google: "OduDoc"

Bundle IDs (already set in the source):
  com.odudoc.patient
  com.odudoc.doctor

Required listing URLs (live):
  Privacy: https://www.odudoc.com/privacy
  Support: https://www.odudoc.com/support
  Account deletion: https://www.odudoc.com/account/delete

After first iOS submission, send me:
  - Apple Team ID (10 chars from App Store Connect → Membership)
  → I'll fill in apple-app-site-association

After first Android upload, send me:
  - Play App Signing SHA-256 (Play Console → Setup → App integrity)
  → I'll fill in assetlinks.json

Replace the placeholder PNGs in:
  apps/patient/src/assets/  and  apps/doctor/src/assets/
with real brand artwork before promoting beyond TestFlight / internal
testing. Specs are in the README.md inside each assets folder.
```

---

## Cost summary

| One-time | Recurring |
|----------|-----------|
| Google Play: $25 | Apple Developer: $99/yr |
| | Expo Production (optional): $19/mo |
| | **Annual total: ~$300 if Expo Production, $99 minimum** |

## Timeline summary

| Day | What happens |
|-----|--------------|
| 0   | Get D-U-N-S number (if not already assigned) |
| 1–14 | D-U-N-S verification by D&B |
| 15  | Apple enrolment submitted, $99 paid |
| 15–28 | Apple verifies LLC + calls phone number |
| 28  | Apple Developer active. Google Play signup ($25). Expo signup. |
| 28–31 | Google verifies ID + LLC docs |
| 31  | All three accounts live. Invite developer. |
| 32  | Developer starts building. |
| 35–40 | First TestFlight (iOS internal) + Play Internal Test build live |
| 45+ | App Store Connect: submit for review (3–7 day Apple review) |
| 47+ | Play Console: submit for review (1–3 day Google review) |

**Realistic earliest public launch: 6–8 weeks from D-U-N-S request.**
