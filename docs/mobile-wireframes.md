# OduDoc Android — Screen Wireframes (v1)

Text wireframes for the Patient and Doctor Android apps. Each screen lists
layout, key components, and the API endpoint(s) it calls.

Base URL (configurable in app): `https://www.odudoc.com`
Auth header: `Authorization: Bearer <mobile JWT>`

---

# PATIENT APP

## P0. Splash
```
┌─────────────────────────┐
│                         │
│       [ OduDoc ]        │
│       Logo, center      │
│                         │
│    Checking session...  │
│                         │
└─────────────────────────┘
```
- On launch: read JWT from EncryptedSharedPreferences.
  - Token present → `GET /api/auth/mobile-me` → if 200 go to Home, else Login.
  - No token → Login.

## P1. Onboarding / Welcome (first launch only)
```
┌─────────────────────────┐
│  [illustration]         │
│                         │
│  Consult a doctor from  │
│  your phone in minutes  │
│                         │
│  ● ○ ○                  │
│  [  Get Started  ]      │
│  Already have an acct?  │
└─────────────────────────┘
```
3 swipeable slides: (1) video consult, (2) order medicine, (3) keep records.

## P2. Login
```
┌─────────────────────────┐
│  ← Login                │
│                         │
│  Email     [__________] │
│  Password  [__________] │
│                         │
│  [     Log in      ]    │
│                         │
│  Forgot password?       │
│  New here? Sign up      │
└─────────────────────────┘
```
- `POST /api/auth/mobile-login` → store token + user, go to Home.
- Forgot → opens `https://www.odudoc.com/auth/forgot-password` in Custom Tabs.

## P3. Register
```
┌─────────────────────────┐
│  ← Create account       │
│                         │
│  Name     [__________]  │
│  Email    [__________]  │
│  Phone    [+91 _______] │
│  Password [__________]  │
│                         │
│  [    Create account ]  │
│                         │
│  We'll email you a link │
│  to verify your account │
└─────────────────────────┘
```
- `POST /api/auth/register` → show "check email" screen → back to Login.

## P4. Home (bottom tab = "Home")
```
┌─────────────────────────┐
│ Hi Ankit     [🔔] [👤] │
│                         │
│ ┌─ Consult a Doctor ──┐ │
│ │  Video in 10 min    │ │
│ └─────────────────────┘ │
│ ┌─ Order Medicine ────┐ │
│ │  Delivery in 2 hrs  │ │
│ └─────────────────────┘ │
│                         │
│ Upcoming                │
│ ● Dr. Sharma  Today 4pm │
│                         │
│ Recent prescriptions    │
│ ▸ 10 Apr — Dr. Sharma   │
│                         │
│[Home][Doctors][Shop][Me]│
└─────────────────────────┘
```
- `GET /api/bookings?patient=me&upcoming=true`
- `GET /api/prescriptions?patient=me&limit=3`

## P5. Doctors — directory (bottom tab = "Doctors")
```
┌─────────────────────────┐
│ Find a doctor           │
│ [🔍 search specialty..] │
│                         │
│ Filters: ▾All ▾Online   │
│ ▾City                   │
│                         │
│ [img] Dr. Sharma        │
│       Dermatology ⭐4.8 │
│       ₹399 · Online now │
│       [   Book   ]      │
│ ─────────────────────── │
│ [img] Dr. Gupta ...     │
└─────────────────────────┘
```
- `GET /api/doctors?specialty=&city=&online=true&page=1`

## P6. Doctor profile
```
┌─────────────────────────┐
│ ← Dr. Sharma       ♡   │
│ [photo big]             │
│ Dermatology             │
│ MBBS, MD · 12 yrs       │
│ ⭐ 4.8 (234 reviews)   │
│                         │
│ About ─ Education ─ Rv  │
│                         │
│ Next slot: Today 4:00 PM│
│ Fee: ₹399               │
│                         │
│ [   Book appointment  ] │
└─────────────────────────┘
```
- `GET /api/doctors/{id}`
- `GET /api/timetable/{doctorId}?days=7`

## P7. Book slot
```
┌─────────────────────────┐
│ ← Book · Dr. Sharma     │
│                         │
│ Date                    │
│ [M][T][W][T][F][S][S]   │
│                         │
│ Morning                 │
│ [9:00][9:30][10:00]…    │
│ Afternoon               │
│ [14:00][14:30]…         │
│                         │
│ Fee                ₹399 │
│ [  Continue to pay  ]   │
└─────────────────────────┘
```
- `GET /api/timetable/{doctorId}` for slot availability.
- `POST /api/bookings` with `{doctorId, slotStart, slotEnd}`.

## P8. Payment
```
┌─────────────────────────┐
│ ← Payment               │
│ Consult Dr. Sharma ₹399 │
│ Platform fee       ₹0   │
│ Total              ₹399 │
│                         │
│ ○ UPI                   │
│ ○ Card                  │
│ ○ Net banking           │
│                         │
│ [     Pay ₹399      ]   │
└─────────────────────────┘
```
- `POST /api/payments/create-order` → server returns `{gateway, orderId,…}`.
- App launches native SDK (Razorpay / Stripe) based on `gateway`.
- `POST /api/payments/verify` with signature from SDK.

## P9. Booking confirmed
```
┌─────────────────────────┐
│         ✓               │
│   Booked!               │
│                         │
│ Dr. Sharma              │
│ Today · 4:00 PM         │
│                         │
│ [ Add to calendar ]     │
│ [ Go to consult       ] │
│                         │
└─────────────────────────┘
```

## P10. Consultations list (from Home "Upcoming" or "Me")
```
┌─────────────────────────┐
│ My consultations        │
│ [Upcoming][Past]        │
│                         │
│ Today 4:00 PM           │
│ Dr. Sharma              │
│ [   Join call    ]      │
│ ─────────────────────── │
│ Tue 10 Apr              │
│ Dr. Gupta (completed)   │
│  View prescription ▸    │
└─────────────────────────┘
```
- `GET /api/bookings?patient=me`

## P11. Waiting room
```
┌─────────────────────────┐
│ ← Cancel                │
│                         │
│   [camera preview]      │
│                         │
│ [🎤 on] [📷 on] [⚙]   │
│                         │
│ Joining consult with    │
│ Dr. Sharma...           │
│                         │
│ [    Join call now   ]  │
└─────────────────────────┘
```
- `GET /api/rooms/{bookingId}` → returns Daily.co room URL + token.

## P12. Video call
```
┌─────────────────────────┐
│  [Dr video fullscreen]  │
│                   ┌───┐ │
│                   │me │ │
│                   └───┘ │
│                         │
│ [🎤] [📷] [💬] [⛔]   │
└─────────────────────────┘
```
- Uses Daily.co `co.daily:client-android` SDK.
- Chat sidebar opens on 💬 tap.

## P13. Post-call summary
```
┌─────────────────────────┐
│ Call ended · 12:04 long │
│                         │
│ Rate your consult       │
│ ☆ ☆ ☆ ☆ ☆               │
│ [comment...]            │
│                         │
│ Your prescription is    │
│ ready                   │
│ [  View prescription ]  │
└─────────────────────────┘
```
- `POST /api/consultations/{id}/review`

## P14. Prescription detail
```
┌─────────────────────────┐
│ ← Rx · 24 Apr           │
│ Dr. Sharma (Derm)       │
│                         │
│ Diagnosis:              │
│   Mild eczema           │
│                         │
│ Medicines:              │
│   1. Fluticasone 0.05%  │
│      Apply BD × 14 days │
│   2. Cetirizine 10mg    │
│      OD × 7 days        │
│                         │
│ [ 🛒 Order medicines ]  │
│ [ ⤓ Download PDF    ]  │
└─────────────────────────┘
```
- `GET /api/prescriptions/{id}`
- "Order medicines" → deep-link to Shop with prefilled cart.

## P15. Shop — catalog (bottom tab = "Shop")
```
┌─────────────────────────┐
│ Pharmacy       [🛒 (2)] │
│ [🔍 search medicines..] │
│                         │
│ Categories              │
│ [OTC][Rx][Wellness]…   │
│                         │
│ [img] Cetirizine 10mg   │
│       ₹45 · 10 tabs     │
│       [Add]             │
│ ─────────────────────── │
│ …                       │
└─────────────────────────┘
```
- `GET /api/products?category=&q=&page=1`

## P16. Product detail
```
┌─────────────────────────┐
│ ← Cetirizine 10mg       │
│ [images]                │
│                         │
│ ₹45  ₹60 (25% off)      │
│ Sold by: DemoPharma     │
│                         │
│ Description...          │
│ Requires prescription?  │
│ ● Yes — we'll ask later │
│                         │
│ Qty [-][1][+]  [Add cart│
└─────────────────────────┘
```
- `GET /api/products/{id}`

## P17. Cart
```
┌─────────────────────────┐
│ Cart                    │
│ Cetirizine × 1     ₹45  │
│ [-][1][+]       [🗑]    │
│ Fluticasone × 1   ₹220  │
│ ─────────────────────── │
│ Subtotal         ₹265   │
│ Delivery          ₹30   │
│ Total            ₹295   │
│                         │
│ [   Proceed to checkout]│
└─────────────────────────┘
```

## P18. Checkout — Rx upload (if needed)
```
┌─────────────────────────┐
│ Prescription required   │
│ for: Fluticasone        │
│                         │
│ ○ Use existing Rx       │
│   ▸ 24 Apr · Dr. Sharma │
│ ○ Upload new            │
│   [📷 Camera] [📁 File] │
│                         │
│ [    Continue      ]    │
└─────────────────────────┘
```
- `POST /api/prescriptions/upload` (multipart)

## P19. Checkout — address + pay
```
┌─────────────────────────┐
│ Delivery address        │
│ ● Home, Mumbai 400001   │
│ + Add new               │
│                         │
│ Payment                 │
│ ○ UPI  ○ Card  ○ COD    │
│                         │
│ Total           ₹295    │
│ [   Place order     ]   │
└─────────────────────────┘
```
- `POST /api/orders` → then `POST /api/payments/create-order`.

## P20. Order tracking
```
┌─────────────────────────┐
│ ← Order #A7F3           │
│                         │
│ ✓ Placed        10:12   │
│ ✓ Packed        10:30   │
│ ● Shipped       11:45   │
│ ○ Out for delivery      │
│ ○ Delivered             │
│                         │
│ Items (2)               │
│ Cetirizine × 1   ₹45    │
│ Fluticasone × 1  ₹220   │
│                         │
│ [ Contact support ]     │
└─────────────────────────┘
```
- `GET /api/orders/{id}`

## P21. Orders list (from "Me")
```
┌─────────────────────────┐
│ My orders               │
│ [Active][Past]          │
│ #A7F3  Shipped    ₹295  │
│ #A6D2  Delivered  ₹120  │
└─────────────────────────┘
```

## P22. Profile / Me (bottom tab = "Me")
```
┌─────────────────────────┐
│ [avatar] Ankit          │
│ ankit@odudoc.com        │
│                         │
│ ▸ Medical records       │
│ ▸ Family members        │
│ ▸ Addresses             │
│ ▸ Payments              │
│ ▸ Notifications         │
│ ▸ Help                  │
│ ▸ Log out               │
└─────────────────────────┘
```

## P23. Medical records
```
┌─────────────────────────┐
│ Medical records         │
│ [Prescriptions][Reports]│
│                         │
│ 24 Apr · Dr. Sharma     │
│ 10 Apr · Dr. Gupta      │
│ …                       │
│                         │
│ [+ Upload document]     │
└─────────────────────────┘
```
- `GET /api/prescriptions?patient=me`

---

# DOCTOR APP

## D0–D2 (Splash, Login, Forgot)
Same as Patient, different home redirect. Login checks `user.role === "doctor"`.
If role is wrong, show "This app is for doctors. Use the patient app to log in."

## D3. Dashboard (bottom tab = "Today")
```
┌─────────────────────────┐
│ Dr. Sharma        [🔔]  │
│ ● Available now [toggle]│
│                         │
│ Today                   │
│  5 appointments         │
│  ₹ 1,995 earnings       │
│                         │
│ Next: Ankit · 4:00 PM   │
│ [   Join waiting room ] │
│                         │
│ Pending prescriptions 2 │
│ New reviews           1 │
│                         │
│[Today][Queue][Rx][Me]   │
└─────────────────────────┘
```
- `GET /api/bookings?doctor=me&date=today`
- `POST /api/doctor/availability/instant` (toggle 15-min)

## D4. Queue (today's schedule)
```
┌─────────────────────────┐
│ Today · Wed 24 Apr      │
│                         │
│ 4:00 PM · Ankit         │
│   Dermatology follow-up │
│   [ Join call ]  [⋯]   │
│ ─────────────────────── │
│ 4:30 PM · Priya         │
│   New consult           │
│   [ Join call ]  [⋯]   │
│ ─────────────────────── │
│ 5:00 PM · (empty)       │
└─────────────────────────┘
```

## D5. Video consult (doctor side)
```
┌─────────────────────────┐
│[Patient video] [notes▸] │
│                         │
│ Notes panel:            │
│  Symptoms [_________]   │
│  Diagnosis[_________]   │
│  Rx chips: +Cetirizine  │
│            +Fluticasone │
│                         │
│ [🤖 AI suggest Rx]      │
│ [🎤 Dictate]            │
│                         │
│ [🎤][📷][💬]  [⛔End]  │
└─────────────────────────┘
```
- `POST /api/ai/prescription` (Gemini/OpenAI/Claude fallback)
- `POST /api/consultations/{id}/notes`

## D6. Issue prescription
```
┌─────────────────────────┐
│ Prescription · Ankit    │
│                         │
│ Diagnosis [__________]  │
│                         │
│ Medicines               │
│ 1. Cetirizine 10mg      │
│    OD × 7 days    [×]   │
│ 2. [+ Add medicine]     │
│                         │
│ Advice [__________]     │
│ Follow-up: 7 days       │
│                         │
│ [ Save & send to patient]│
└─────────────────────────┘
```
- `POST /api/prescriptions` (patientId, consultationId, items)

## D7. Patient history (side-panel or standalone)
```
┌─────────────────────────┐
│ ← Ankit · 28yo · M      │
│                         │
│ Past consults (3)       │
│ 10 Apr · Dr. Gupta      │
│   Diagnosis: URI        │
│ 02 Mar · Dr. Sharma     │
│   Diagnosis: Eczema     │
│                         │
│ Uploaded reports (1)    │
│ 08 Mar · Blood test.pdf │
└─────────────────────────┘
```
- `GET /api/patients/{id}/history`

## D8. Earnings
```
┌─────────────────────────┐
│ Earnings                │
│ [Week][Month][Year]     │
│                         │
│ This month   ₹ 34,200   │
│ Payout pending ₹ 8,400  │
│                         │
│ ▇▇▇▆▇▅▇ chart           │
│                         │
│ Recent                  │
│ 24 Apr · Ankit    ₹399  │
│ 24 Apr · Priya    ₹399  │
└─────────────────────────┘
```
- `GET /api/doctor-earnings?doctor=me`

## D9. Reviews
```
┌─────────────────────────┐
│ Reviews (234) ⭐ 4.8   │
│ 24 Apr · ⭐⭐⭐⭐⭐    │
│ "Very patient, clear."  │
│ [ Reply ]               │
│ ─────────────────────── │
│ …                       │
└─────────────────────────┘
```
- `GET /api/doctors/me/reviews`
- `POST /api/doctors/me/reviews/{id}/reply`

## D10. Availability / timetable
```
┌─────────────────────────┐
│ Weekly schedule         │
│ Mon  09:00 - 17:00 ✎   │
│ Tue  09:00 - 17:00 ✎   │
│ Wed  off              ✎│
│ ...                     │
│                         │
│ Slot length: 30 min ▾  │
│ Consultation fee ₹399   │
│                         │
│ [   Save changes     ]  │
└─────────────────────────┘
```
- `PUT /api/timetable/me`

## D11. Profile / Me
```
┌─────────────────────────┐
│ [avatar] Dr. Sharma     │
│ Dermatologist           │
│                         │
│ ▸ Qualifications        │
│ ▸ KYC / verification    │
│ ▸ Bank details          │
│ ▸ Notifications         │
│ ▸ Log out               │
└─────────────────────────┘
```

---

# GLOBAL UX RULES

- **Offline state**: any list screen with cached data shows the cache + a
  banner "Offline — showing last loaded data. Retry."
- **Error toasts**: never raw HTTP errors; map to human copy
  (401 → "Session expired. Log in again." 429 → "Please slow down.")
- **Loading**: skeletons on list screens, spinner on buttons in progress.
- **Deep links**: `odudoc://consult/{bookingId}`,
  `odudoc://rx/{id}`, `odudoc://order/{id}` — FCM push payloads include one
  of these so notification taps open the right screen.
- **Push events** (FCM data messages):
  - `appointment_reminder` → show notification → tap = Consultation screen
  - `consultation_started` → high-priority → tap = Video call
  - `prescription_issued` → tap = Prescription detail
  - `order_status_changed` → tap = Order tracking
